import { useState, useCallback, useRef, useEffect } from 'react';
import { Message } from '../types';
import { useChats } from './useChats';
import { v4 as uuidv4 } from 'uuid';

const WEBHOOK_URL = 'https://healthrocket.app.n8n.cloud/webhook/8ec404be-7f51-47c8-8faf-0d139bd4c5e9/chat';

export const useChat = () => {
  const { logChatMessage, currentMessages, currentConversationId, loading: chatsLoading, loadConversation, startNewConversation: chatsStartNewConversation, updateVisualizationStatus } = useChats();
  const [visualizationStates, setVisualizationStates] = useState<Record<string, any>>({});
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: "Welcome, I'm Astra. What can I help you with today?",
      isUser: false,
      timestamp: new Date(),
      isCentered: true
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Convert database messages to UI messages
  useEffect(() => {
    console.log('useChat: currentMessages changed', { 
      currentMessagesLength: currentMessages.length, 
      currentConversationId, 
      chatsLoading 
    });
    
    if (currentMessages.length > 0) {
      const uiMessages: Message[] = [];
      
      currentMessages.forEach((dbMessage) => {
        // Add user message
        uiMessages.push({
          id: `${dbMessage.id}-user`,
          text: dbMessage.prompt,
          isUser: true,
          timestamp: new Date(dbMessage.createdAt)
        });
        
        // Add Astra response
        uiMessages.push({
          id: `${dbMessage.id}-astra`,
          text: dbMessage.response,
          isUser: false,
          timestamp: new Date(dbMessage.createdAt)
        });
      });
      
      console.log('useChat: Setting messages from database', { uiMessagesLength: uiMessages.length });
      setMessages([
        {
          id: 'welcome',
          text: "Welcome back! Here's your conversation history.",
          isUser: false,
          timestamp: new Date(),
          isCentered: true
        },
        ...uiMessages
      ]);
    } else if (currentConversationId) {
      // Reset to welcome message for new conversations
      console.log('useChat: Resetting to welcome message');
      setMessages([
        {
          id: 'welcome',
          text: "Welcome, I'm Astra. What can I help you with today?",
          isUser: false,
          timestamp: new Date(),
          isCentered: true
        }
      ]);
    }
  }, [currentMessages, currentConversationId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const messageId = uuidv4();
    const startTime = Date.now();
    const userMessage: Message = {
      id: `${messageId}-user`,
      text: text.trim(),
      isUser: true,
      timestamp: new Date()
    };

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const requestStartTime = Date.now();
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatInput: text.trim() })
      });
      const requestEndTime = Date.now();
      const responseTimeMs = requestEndTime - requestStartTime;

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const responseText = await response.text();
      
      // Try to parse JSON response and extract the output field
      let messageText = responseText;
      let metadata: any = {};
      let tokensUsed: any = {};
      let toolsUsed: string[] = [];
      
      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.output) {
          messageText = jsonResponse.output;
        }
        
        // Extract additional metadata if available from n8n response
        if (jsonResponse.metadata) {
          metadata = jsonResponse.metadata;
        }
        if (jsonResponse.tokens_used) {
          tokensUsed = jsonResponse.tokens_used;
        }
        if (jsonResponse.tools_used) {
          toolsUsed = jsonResponse.tools_used;
        }
        if (jsonResponse.model_used) {
          metadata.model_used = jsonResponse.model_used;
        }
      } catch (e) {
        // If it's not JSON, use the raw text
        messageText = responseText;
      }

      const astraMessage: Message = {
        id: `${messageId}-astra`,
        text: messageText,
        isUser: false,
        timestamp: new Date()
      };

      // Add Astra response to UI immediately
      setMessages(prev => [...prev, astraMessage]);

      // Log the chat message to database
      try {
        const chatId = await logChatMessage(
          text.trim(), 
          messageText, 
          currentConversationId || undefined,
          responseTimeMs,
          tokensUsed,
          metadata.model_used || 'n8n-workflow',
          toolsUsed,
          {
            ...metadata,
            request_time: requestStartTime,
            response_time: requestEndTime,
            total_processing_time: responseTimeMs
          }
        );
        
        // Store the chat ID in the message for later visualization tracking
        if (chatId) {
          astraMessage.chatId = chatId;
        }
      } catch (error) {
        console.error('Failed to log chat message:', error);
        // Don't block the UI if logging fails
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `${messageId}-error`,
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, logChatMessage, currentConversationId, updateVisualizationStatus]);

  const toggleMessageExpansion = useCallback((messageId: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isExpanded: !msg.isExpanded }
          : msg
      )
    );
  }, []);

  const startNewConversation = useCallback(() => {
    console.log('useChat: Starting new conversation');
    const newConversationId = chatsStartNewConversation();
    console.log('useChat: New conversation ID:', newConversationId);
    return newConversationId;
  }, [chatsStartNewConversation]);

  // Get visualization state for a message
  const getVisualizationState = useCallback((messageId: string) => {
    return visualizationStates[messageId] || null;
  }, [visualizationStates]);

  // Update visualization state
  const updateVisualizationState = useCallback((messageId: string, state: any) => {
    setVisualizationStates(prev => ({
      ...prev,
      [messageId]: state
    }));
  }, []);

  return {
    messages,
    isLoading,
    inputValue,
    setInputValue,
    sendMessage,
    toggleMessageExpansion,
    messagesEndRef,
    setMessages,
    currentConversationId,
    updateVisualizationStatus,
    loadConversation,
    startNewConversation,
    getVisualizationState,
    updateVisualizationState
  };
};
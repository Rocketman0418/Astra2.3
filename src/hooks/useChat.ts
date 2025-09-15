import { useState, useCallback, useRef, useEffect } from 'react';
import { Message } from '../types';
import { useChats } from './useChats';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

export const useChat = () => {
  const { logChatMessage, currentMessages, currentConversationId, loading: chatsLoading, loadConversation, startNewConversation: chatsStartNewConversation, updateVisualizationStatus, conversations, hasInitialized } = useChats();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<{ name: string | null } | null>(null);
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
  const [hasLoadedConversation, setHasLoadedConversation] = useState(false);

  // Fetch user profile when user changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }

        setUserProfile(data);
      } catch (err) {
        console.error('Error in fetchUserProfile:', err);
      }
    };

    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  // Convert database messages to UI messages
  useEffect(() => {
    console.log('useChat: currentMessages changed', { 
      currentMessagesLength: currentMessages.length, 
      currentConversationId, 
      chatsLoading 
    });
    
    if (currentMessages.length > 0) {
      const uiMessages: Message[] = [];
      
      currentMessages.forEach((dbMessage, index) => {
        if (dbMessage.isUser) {
          // Add user message
          uiMessages.push({
            id: `${dbMessage.id}-user`,
            text: dbMessage.message,
            isUser: true,
            timestamp: new Date(dbMessage.createdAt),
            chatId: dbMessage.id
          });
        } else {
          // Add Astra response
          uiMessages.push({
            id: `${dbMessage.id}-astra`,
            text: dbMessage.message,
            isUser: false,
            timestamp: new Date(dbMessage.createdAt),
            chatId: dbMessage.id,
            visualization: dbMessage.visualization || false,
            hasStoredVisualization: dbMessage.visualization || false
          });
        }
      });
      
      console.log('useChat: Setting messages from database', { uiMessagesLength: uiMessages.length });
      setMessages([
        ...uiMessages
      ]);
    } else if (currentConversationId && currentMessages.length === 0 && !chatsLoading) {
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
  }, [currentMessages, currentConversationId, chatsLoading]);

  // Load the most recent conversation when component mounts or when returning to private chat
  useEffect(() => {
    if (user && hasInitialized && !currentConversationId) {
      // If there are existing conversations, load the most recent one
      if (conversations.length > 0) {
        console.log('useChat: Loading most recent conversation:', conversations[0].id);
        loadConversation(conversations[0].id);
      } else {
        // No existing conversations, start fresh
        console.log('useChat: No existing conversations, starting fresh');
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
    }
  }, [user, hasInitialized, conversations, currentConversationId, loadConversation]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Check if webhook URL is configured
    if (!WEBHOOK_URL) {
      console.error('N8N webhook URL not configured');
      const errorMessage: Message = {
        id: `${uuidv4()}-error`,
        text: "Configuration error: N8N webhook URL not set. Please check your environment variables.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Get user information
    const userId = user?.id || '';
    const userEmail = user?.email || '';
    const userName = userProfile?.name || user?.email?.split('@')[0] || 'Unknown User';

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
      
      console.log('🌐 Sending request to webhook:', WEBHOOK_URL);
      console.log('📤 Request payload:', { 
        chatInput: text.trim(),
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        conversation_id: currentConversationId,
        mode: 'private'
      });
      
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          chatInput: text.trim(),
          user_id: userId,
          user_email: userEmail,
          user_name: userName,
          conversation_id: currentConversationId,
          mode: 'private'
        })
      });
      const requestEndTime = Date.now();
      const responseTimeMs = requestEndTime - requestStartTime;

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Webhook request failed:', {
          status: response.status,
          statusText: response.statusText,
          visualization: dbMessage.visualization || false,
          hasStoredVisualization: !!(dbMessage.visualizationData || dbMessage.visualization)
        });
        
        // Try to parse error response and extract meaningful message
        let errorMessage = `Webhook request failed: ${response.status} ${response.statusText}`;
        if (errorText) {
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.message) {
              errorMessage = `Server error: ${errorJson.message}`;
            } else {
              errorMessage += ` - ${errorText}`;
            }
          } catch (parseError) {
            // If not JSON, use raw error text
            errorMessage += ` - ${errorText}`;
          }
        }
        
        throw new Error(errorMessage);
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
        // Log user message
        await logChatMessage(
          text.trim(),
          true, // isUser
          currentConversationId || undefined,
          0, // No response time for user messages
          {},
          undefined,
          { request_time: requestStartTime },
          false, // visualization
          'private', // mode
          [], // mentions
          undefined, // astraPrompt
          undefined // visualizationData
        );
        
        // Log Astra response
        const chatId = await logChatMessage(
          messageText,
          false, // isUser (Astra response)
          currentConversationId || undefined,
          responseTimeMs,
          tokensUsed,
          metadata.model_used || 'n8n-workflow',
          {
            ...metadata,
            request_time: requestStartTime,
            response_time: requestEndTime,
            total_processing_time: responseTimeMs
          },
          false, // visualization
          'private', // mode
          [], // mentions
          text.trim(), // astraPrompt (original user question)
          undefined // visualizationData
        );
        
        // Update the message in state with the database chatId
        if (chatId) {
          setMessages(prev => prev.map(msg => 
            msg.id === astraMessage.id 
              ? { ...msg, chatId: chatId }
              : msg
          ));
        }
      } catch (error) {
        console.error('Failed to log chat message:', error);
        // Don't block the UI if logging fails
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorMessage = "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.";
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = "Network connection error. Please check your internet connection and try again.";
        } else if (error.message.includes('Webhook request failed')) {
          errorMessage = `Server error: ${error.message}. Please contact support if this persists.`;
        }
      }
      
      const errorMessageObj: Message = {
        id: `${messageId}-error`,
        text: errorMessage,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessageObj]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, logChatMessage, currentConversationId, updateVisualizationStatus, user, userProfile]);

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
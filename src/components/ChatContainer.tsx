import React, { useEffect, useRef, useCallback, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { LoadingIndicator } from './LoadingIndicator';
import { ChatInput } from './ChatInput';
import { VisualizationView } from './VisualizationView';
import { useChat } from '../hooks/useChat';
import { useFavorites } from '../hooks/useFavorites';
import { useVisualization } from '../hooks/useVisualization';

interface ChatContainerProps {
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
  conversationToLoad: string | null;
  shouldStartNewChat: boolean;
  onConversationLoaded: () => void;
  onNewChatStarted: () => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
  sidebarOpen, 
  onCloseSidebar,
  conversationToLoad,
  shouldStartNewChat,
  onConversationLoaded,
  onNewChatStarted
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isCreatingVisualization, setIsCreatingVisualization] = useState(false);
  const [visualizationStates, setVisualizationStates] = useState<Record<string, any>>({});
  const {
    messages,
    isLoading,
    inputValue,
    setInputValue,
    sendMessage,
    toggleMessageExpansion,
    loadConversation,
    startNewConversation,
    currentConversationId,
    updateVisualizationStatus,
    getVisualizationState,
    updateVisualizationState: hookUpdateVisualizationState
  } = useChat();
  
  const {
    favorites,
    toggleFavorite,
    isFavorited,
    removeFromFavorites
  } = useFavorites();

  const {
    generateVisualization,
    showVisualization,
    hideVisualization,
    getVisualization: getHookVisualization,
    currentVisualization,
    messageToHighlight,
    clearHighlight
  } = useVisualization(updateVisualizationStatus);

  // Local visualization state management
  const updateVisualizationState = useCallback((messageId: string, state: any) => {
    console.log('🔧 ChatContainer: Updating visualization state for messageId:', messageId, 'state:', state);
    setVisualizationStates(prev => ({
      ...prev,
      [messageId]: state
    }));
  }, []);

  // Get visualization state - check local state first, then hook state
  const getLocalVisualizationState = useCallback((messageId: string) => {
    const localState = visualizationStates[messageId];
    console.log('🔍 ChatContainer: Getting visualization state for messageId:', messageId, 'localState:', localState);
    
    // Find the message to check for stored visualization
    const message = messages.find(m => m.chatId === messageId || m.id === messageId);
    console.log('🔍 ChatContainer: Found message for messageId:', messageId, 'message:', message);
    console.log('🔍 ChatContainer: Message visualization_data exists:', !!message?.visualization_data);
    console.log('🔍 ChatContainer: Message visualization flag:', message?.visualization);
    console.log('🔍 ChatContainer: Message hasStoredVisualization:', message?.hasStoredVisualization);
    
    // If we have local state, use it
    if (localState) {
      console.log('🔍 ChatContainer: Using local state for messageId:', messageId);
      return localState;
    }
    
    // Check if the message has stored visualization in database - EXACTLY LIKE TEAM CHAT
    if (message?.visualization_data) {
      console.log('🔍 ChatContainer: Message has stored visualization_data, returning database state for messageId:', messageId);
      return {
        isGenerating: false,
        content: message.visualization_data,
        hasVisualization: true,
      };
    }
    
    console.log('🔍 ChatContainer: No visualization state found for messageId:', messageId);
    return null;
  }, [visualizationStates, messages]);

  // Register service worker for PWA
  // Handle conversation loading from sidebar
  useEffect(() => {
    if (conversationToLoad) {
      console.log('ChatContainer: Loading conversation from sidebar:', conversationToLoad);
      loadConversation(conversationToLoad);
      onConversationLoaded();
    }
  }, [conversationToLoad, loadConversation, onConversationLoaded]);

  // Handle new chat from sidebar
  useEffect(() => {
    if (shouldStartNewChat) {
      console.log('ChatContainer: Starting new chat from sidebar');
      startNewConversation();
      onNewChatStarted();
    }
  }, [shouldStartNewChat, startNewConversation, onNewChatStarted]);

  // Handle visualization creation for private chat
  const handleCreateVisualization = useCallback(async (messageId: string, messageContent: string) => {
    console.log('🎯 Private chat: Starting visualization generation for chatId:', messageId);
    console.log('🎯 Private chat: Message content length:', messageContent.length);
    
    setIsCreatingVisualization(true);
    
    // Set generating state immediately with proper structure
    updateVisualizationState(messageId, { 
      messageId,
      isGenerating: true, 
      content: null,
      isVisible: false
    });
    const actualChatId = messageId;
    console.log('🎯 Private chat: Using chatId:', actualChatId);
    
    // Set generating state immediately
    updateVisualizationState(actualChatId, { isGenerating: true, content: null });

    try {
      await generateVisualization(actualChatId, messageContent);
      
      console.log('✅ Private chat: Visualization generation completed for message:', actualChatId);
      
      // Set completion state
      setTimeout(() => {
        updateVisualizationState(messageId, {
          messageId,
          isGenerating: false, 
          content: 'generated', 
          hasVisualization: true,
          isVisible: false
        });
        console.log('✅ Private chat: Updated visualization state for message:', actualChatId);
      }, 100);
      
    } catch (error) {
      console.error('❌ Private chat: Error during visualization generation:', error);
      updateVisualizationState(messageId, {
        messageId,
        isGenerating: false, 
        content: null, 
        hasVisualization: false,
        isVisible: false
      });
    }
    finally {
      setIsCreatingVisualization(false);
    }
  }, [generateVisualization, updateVisualizationState]);

  // Handle viewing visualization for private chat
  const handleViewVisualization = useCallback((messageId: string) => {
    console.log('👁️ Private chat: Viewing visualization for chatId:', messageId);
    
    // messageId is already the chatId from MessageBubble
    const actualChatId = messageId;
    
    // Find the message object for additional checks
    const message = messages.find(m => m.chatId === actualChatId);
    
    // First check if we have visualization data in the database
    if (message?.hasStoredVisualization) {
      console.log('📊 Private chat: Message has stored visualization, fetching from database');
      // Fetch visualization data from database
      const fetchVisualization = async () => {
        try {
          const { supabase } = await import('../lib/supabase');
          const { data, error } = await supabase
            .from('astra_chats')
            .select('visualization_data')
            .eq('id', actualChatId)
            .single();

          if (error) {
            console.error('❌ Error fetching visualization from database:', error);
            return;
          }

          if (data?.visualization_data) {
            console.log('📊 Private chat: Using database visualization data');
            // Store in hook state and show
            updateVisualizationState(actualChatId, {
              messageId: actualChatId,
              isGenerating: false,
              content: data.visualization_data,
              hasVisualization: true,
              isVisible: false
            });
            showVisualization(actualChatId);
          }
        } catch (err) {
          console.error('❌ Error in fetchVisualization:', err);
        }
      };
      
      fetchVisualization();
      return;
    }
    
    // Check hook state for visualization content
    const hookVisualization = getHookVisualization(actualChatId);
    if (hookVisualization?.content) {
      console.log('📊 Private chat: Using hook visualization data');
      showVisualization(actualChatId);
      return;
    }
    
    console.log('❌ Private chat: No visualization data found for message:', actualChatId);
  }, [showVisualization, getHookVisualization, messages, updateVisualizationState]);

  useEffect(() => {
    // Initial scroll to bottom on component mount
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 100);

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  // Handle viewport adjustments for mobile keyboards
  useEffect(() => {
    // Only auto-scroll to bottom if we're not highlighting a specific message
    if (!messageToHighlight && !isCreatingVisualization) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    
    const handleResize = () => {
      // Force scroll to bottom when keyboard appears/disappears
      if (!messageToHighlight && !isCreatingVisualization) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [messagesEndRef, messages, messageToHighlight, isCreatingVisualization]);

  // Show visualization view if one is currently active
  if (currentVisualization) {
    const visualization = getHookVisualization(currentVisualization);
    if (visualization?.content) {
      return (
        <VisualizationView
          content={visualization.content}
          onBack={hideVisualization}
        />
      );
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3 md:px-4 chat-messages-container" style={{ paddingBottom: '120px' }}>
        <div className="max-w-4xl mx-auto space-y-3 md:space-y-4 pt-4">
          {messages.map((message) => (
            <div key={message.id} id={`message-${message.id}`}>
              <MessageBubble
                message={message}
                onToggleExpansion={toggleMessageExpansion}
                onCreateVisualization={handleCreateVisualization}
                onViewVisualization={handleViewVisualization}
                onToggleFavorite={toggleFavorite}
                isFavorited={isFavorited(message.id)}
                visualizationState={getLocalVisualizationState(message.chatId || message.id)}
              />
            </div>
          ))}
        
          {isLoading && <LoadingIndicator />}
        
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex-shrink-0">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={sendMessage}
          disabled={isLoading}
          favorites={favorites}
          onRemoveFavorite={removeFromFavorites}
        />
      </div>
    </div>
  );
};
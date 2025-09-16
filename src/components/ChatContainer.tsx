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
    updateVisualizationState,
    updateVisualizationData,
    replyState,
    startReply,
    cancelReply
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
    setVisualizationContent,
    hideVisualization,
    getVisualization: getHookVisualization,
    currentVisualization,
    messageToHighlight,
    clearHighlight
  } = useVisualization(
    updateVisualizationStatus,
    getVisualizationState, // Pass the persistent states
    updateVisualizationState // Pass the update function
  );

  // Get visualization state - check local state first, then hook state
  const getLocalVisualizationState = useCallback((messageId: string) => {
    const localState = getVisualizationState(messageId);
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
    
    // Check if visualization is currently being generated (from database metadata)
    if (message?.metadata?.visualization_generating) {
      console.log('🔍 ChatContainer: Visualization is generating (from database) for messageId:', messageId);
      return {
        isGenerating: true,
        content: null,
        hasVisualization: false,
      };
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
    
    // Check if message has visualization flag but no data yet (might be generating)
    if (message?.visualization && !message?.visualization_data) {
      console.log('🔍 ChatContainer: Message has visualization flag but no data, might be generating for messageId:', messageId);
      return {
        isGenerating: true,
        content: null,
        hasVisualization: false,
      };
    }
    
    console.log('🔍 ChatContainer: No visualization state found for messageId:', messageId);
    return null;
  }, [getVisualizationState, messages]);

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
    console.log('👁️ Private chat: handleViewVisualization called for messageId:', messageId);
    
    console.log('👁️ Private chat: Viewing visualization for chatId:', messageId);
    
    // Find the message object
    const message = messages.find(m => m.chatId === messageId || m.id === messageId);
    console.log('👁️ Private chat: Found message for viewing:', message);
    console.log('👁️ Private chat: Message visualization_data length:', message?.visualization_data?.length || 0);
    
    // Check if we have visualization data directly in the message
    if (message?.visualization_data) {
      console.log('📊 Private chat: Using message visualization_data directly');
      
      // Set the visualization content in the hook first
      const hookVisualization = getHookVisualization(messageId);
      if (!hookVisualization?.content) {
        console.log('📊 Private chat: Setting visualization content in hook');
        setVisualizationContent(messageId, message.visualization_data);
      }
      
      showVisualization(messageId);
      return;
    }
    
    // Check local state for the visualization content
    const localState = getLocalVisualizationState(messageId);
    console.log('👁️ Private chat: Local state for messageId:', messageId, 'exists:', !!localState, 'hasContent:', !!localState?.content);
    
    if (localState?.content && localState.content !== 'generated') {
      console.log('📊 Private chat: Using local state visualization data');
      showVisualization(messageId);
      return;
    }
    
    // Check hook state for visualization content
    const hookVisualization = getHookVisualization(messageId);
    console.log('👁️ Private chat: Hook visualization:', hookVisualization);
    if (hookVisualization?.content) {
      console.log('📊 Private chat: Using hook visualization data');
      showVisualization(messageId);
      return;
    }
    
    console.log('❌ Private chat: No visualization data found for message:', messageId);
  }, [messages, getLocalVisualizationState, getHookVisualization, setVisualizationContent, showVisualization]);

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
                onReply={startReply}
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
         replyState={replyState}
         onCancelReply={cancelReply}
        />
      </div>
    </div>
  );
};
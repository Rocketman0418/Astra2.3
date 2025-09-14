import React, { useEffect, useRef, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { LoadingIndicator } from './LoadingIndicator';
import { ChatInput } from './ChatInput';
import { VisualizationView } from './VisualizationView';
import { useChat } from '../hooks/useChat';
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
    updateVisualizationState
  } = useChat();

  const {
    generateVisualization,
    showVisualization,
    hideVisualization,
    getVisualization: getHookVisualization,
    currentVisualization,
    messageToHighlight,
    clearHighlight
  } = useVisualization(updateVisualizationStatus);
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
    console.log('🎯 Private chat: Starting visualization generation for message:', messageId);
    
    // Set generating state immediately
    updateVisualizationState(messageId, { isGenerating: true, content: null });

    try {
      await generateVisualization(messageId, messageContent);
      
      console.log('✅ Private chat: Visualization generation completed for message:', messageId);
      
      // Set completion state
      setTimeout(() => {
        updateVisualizationState(messageId, { 
          isGenerating: false, 
          content: 'generated', 
          hasVisualization: true 
        });
        console.log('✅ Private chat: Updated visualization state for message:', messageId);
      }, 100);
      
    } catch (error) {
      console.error('❌ Private chat: Error during visualization generation:', error);
      updateVisualizationState(messageId, { 
        isGenerating: false, 
        content: null, 
        hasVisualization: false 
      });
    }
  }, [generateVisualization, updateVisualizationState]);

  // Handle viewing visualization for private chat
  const handleViewVisualization = useCallback((messageId: string) => {
    console.log('👁️ Private chat: Viewing visualization for message:', messageId);
    
    // Check hook state for visualization content
    const hookVisualization = getHookVisualization(messageId);
    if (hookVisualization?.content) {
      console.log('📊 Private chat: Using hook visualization data');
      showVisualization(messageId);
      return;
    }
    
    console.log('❌ Private chat: No visualization data found for message:', messageId);
  }, [showVisualization, getHookVisualization]);

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
    if (!messageToHighlight) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    
    const handleResize = () => {
      // Force scroll to bottom when keyboard appears/disappears
      if (!messageToHighlight) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [messagesEndRef, messages, messageToHighlight]);

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
      <div className="flex-1 overflow-y-auto pb-20 md:pb-24 px-3 md:px-4 chat-messages-container">
        <div className="max-w-4xl mx-auto space-y-3 md:space-y-4 pt-4">
          {messages.map((message) => (
            <div key={message.id} id={`message-${message.id}`}>
              <MessageBubble
                message={message}
                onToggleExpansion={toggleMessageExpansion}
                onCreateVisualization={handleCreateVisualization}
                onViewVisualization={handleViewVisualization}
                visualizationState={getVisualizationState(message.id)}
              />
            </div>
          ))}
        
          {isLoading && <LoadingIndicator />}
        
          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={sendMessage}
        disabled={isLoading}
      />
    </div>
  );
};
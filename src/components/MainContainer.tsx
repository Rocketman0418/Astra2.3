import React, { useState } from 'react';
import { Header } from './Header';
import { ChatSidebar } from './ChatSidebar';
import { ChatContainer } from './ChatContainer';
import { GroupChat } from './GroupChat';
import { ChatModeToggle } from './ChatModeToggle';
import { ChatMode } from '../types';

export const MainContainer: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('team');
  const [conversationToLoad, setConversationToLoad] = useState<string | null>(null);
  const [shouldStartNewChat, setShouldStartNewChat] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  // Close sidebar when switching to private chat mode
  React.useEffect(() => {
    if (chatMode === 'private') {
      setSidebarOpen(false);
    }
  }, [chatMode]);

  const handleLoadConversation = (conversationId: string) => {
    setConversationToLoad(conversationId);
    setSidebarOpen(false);
  };

  const handleStartNewConversation = () => {
    setShouldStartNewChat(true);
    setSidebarOpen(false);
  };

  const handleToggleSearch = () => {
    setShowSearch(!showSearch);
    setShowMembers(false); // Close members if open
  };

  const handleToggleMembers = () => {
    setShowMembers(!showMembers);
    setShowSearch(false); // Close search if open
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Sidebar - only show for private chat mode */}
      {chatMode === 'private' && (
        <ChatSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          onLoadConversation={handleLoadConversation}
          onStartNewConversation={handleStartNewConversation}
        />
      )}
      
      <div className={`flex flex-col h-screen transition-all duration-300 ${
        sidebarOpen && chatMode === 'private' ? 'lg:ml-80' : ''
      }`}>
        <Header 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          showSidebarToggle={chatMode === 'private'}
          chatMode={chatMode}
          onToggleSearch={handleToggleSearch}
          onToggleMembers={handleToggleMembers}
        />
        
        {/* Chat Mode Toggle */}
        <div className="pt-16">
          <ChatModeToggle mode={chatMode} onModeChange={setChatMode} />
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-hidden">
          {chatMode === 'private' ? (
            <ChatContainer 
              sidebarOpen={sidebarOpen}
              onCloseSidebar={() => setSidebarOpen(false)}
              conversationToLoad={conversationToLoad}
              shouldStartNewChat={shouldStartNewChat}
              onConversationLoaded={() => setConversationToLoad(null)}
              onNewChatStarted={() => setShouldStartNewChat(false)}
            />
          ) : (
            <GroupChat 
              showSearch={showSearch}
              showMembers={showMembers}
              onCloseSearch={() => setShowSearch(false)}
              onCloseMembers={() => setShowMembers(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
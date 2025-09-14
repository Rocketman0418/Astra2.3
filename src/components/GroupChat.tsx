import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Search, Users, X } from 'lucide-react';
import { GroupMessage } from './GroupMessage';
import { MentionInput } from './MentionInput';
import { LoadingIndicator } from './LoadingIndicator';
import { VisualizationView } from './VisualizationView';
import { VisualizationLoadingView } from './VisualizationLoadingView';
import { useGroupChat } from '../hooks/useGroupChat';
import { useVisualization } from '../hooks/useVisualization';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserWithCurrentFlag extends User {
  isCurrentUser?: boolean;
}

export const GroupChat: React.FC = () => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [users, setUsers] = useState<UserWithCurrentFlag[]>([]);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [visualizationStates, setVisualizationStates] = useState<Record<string, any>>({});

  const {
    messages,
    loading,
    isAstraThinking,
    sendMessage,
    updateVisualizationData,
  } = useGroupChat();

  const {
    generateVisualization,
    showVisualization,
    hideVisualization,
    currentVisualization,
    getVisualization,
    messageToHighlight,
    clearHighlight
  } = useVisualization();

  // Fetch users for mentions
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch current user data
        const { data: currentUser, error: currentUserError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', user?.id)
          .single();

        if (!currentUserError && currentUser) {
          setCurrentUserData(currentUser);
        }

        // Fetch other users
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email')
          .neq('id', user?.id); // Exclude current user

        if (error) {
          console.error('Error fetching users:', error);
          return;
        }

        setUsers(data || []);
      } catch (err) {
        console.error('Error in fetchUsers:', err);
      }
    };

    if (user) {
      fetchUsers();
    }
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    // Only auto-scroll to bottom if we're not highlighting a specific message
    if (!messageToHighlight) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isAstraThinking, visualizationStates, messageToHighlight]);

  // Also scroll to bottom when component mounts
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 200);
  }, []);

  // Handle sending messages
  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    await sendMessage(message);
    setInputValue('');
  };

  // Handle visualization creation
  const handleCreateVisualization = useCallback(async (messageId: string, messageContent: string) => {
    console.log('🎯 Starting visualization generation for message:', messageId);
    
    // Set generating state immediately
    setVisualizationStates(prev => ({
      ...prev,
      [messageId]: { isGenerating: true, content: null }
    }));

    try {
      await generateVisualization(messageId, messageContent);
      
      console.log('✅ Visualization generation completed for message:', messageId);
      
      // Set a small delay to ensure the hook state is updated
      setTimeout(async () => {
        // Check if we have visualization content in the hook's internal state
        // Since we can't directly access it, we'll use a different approach
        console.log('💾 Setting completion state for message:', messageId);
        
        // Update local state to show completion
        setVisualizationStates(prev => ({
          ...prev,
          [messageId]: { isGenerating: false, content: 'generated', hasVisualization: true }
        }));
        
        console.log('✅ Successfully updated visualization state for message:', messageId);
      }, 100);
      
    } catch (error) {
      console.error('❌ Error during visualization generation:', error);
      // Set error state
      setVisualizationStates(prev => ({
        ...prev,
        [messageId]: { isGenerating: false, content: null, hasVisualization: false }
      }));
    }
  }, [generateVisualization, getVisualization, updateVisualizationData]);

  // Handle viewing visualization
  const handleViewVisualization = useCallback((messageId: string, visualizationData?: string) => {
    console.log('👁️ Viewing visualization for message:', messageId);
    
    // If we have visualization data from the database, use it
    if (visualizationData) {
      console.log('📊 Using database visualization data');
      showVisualization(messageId);
      return;
    }
    
    // Otherwise, check if we have it in our hook state
    const visualization = getVisualization(messageId);
    if (visualization?.content) {
      console.log('📊 Using hook visualization data');
      showVisualization(messageId);
      return;
    }
    
    console.log('❌ No visualization data found for message:', messageId);
  }, [showVisualization, getVisualization]);

  // Get visualization state for a message
  const getVisualizationState = (messageId: string) => {
    // First check local state (most up-to-date)
    const localState = visualizationStates[messageId];
    if (localState) {
      console.log('📊 Using local visualization state for message:', messageId, localState);
      return localState;
    }
    
    // Check database first
    const message = messages.find(m => m.id === messageId);
    if (message?.visualization_data) {
      console.log('📊 Using database visualization state for message:', messageId);
      return { isGenerating: false, content: message.visualization_data, hasVisualization: true };
    }
    
    console.log('📊 No visualization state found for message:', messageId);
    return null;
  };

  // Filter messages based on search
  const filteredMessages = searchQuery
    ? messages.filter(msg => 
        msg.message_content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.user_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // Show loading view when generating visualization

  // Show visualization view if one is currently active
  if (currentVisualization) {
    // First check if we have visualization data in the database
    const message = messages.find(m => m.id === currentVisualization);
    if (message?.visualization_data) {
      console.log('📊 Showing database visualization for message:', currentVisualization);
      return (
        <VisualizationView
          content={message.visualization_data}
          onBack={hideVisualization}
        />
      );
    }
    
    // Otherwise check hook state
    const visualization = getVisualization(currentVisualization);
    if (visualization?.content) {
      console.log('📊 Showing hook visualization for message:', currentVisualization);
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
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Team Chat</h2>
              <p className="text-sm text-gray-400">
                <button 
                  onClick={() => setShowMembers(true)}
                  className="hover:text-blue-300 transition-colors underline"
                >
                  {users.length + 1} members
                </button>
                {' • Use @astra for AI Intelligence'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Search className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Members Modal */}
      {showMembers && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">Team Members</h3>
              <button
                onClick={() => setShowMembers(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {/* Astra */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  🚀
                </div>
                <div>
                  <div className="text-white font-medium">Astra</div>
                  <div className="text-gray-400 text-sm">AI Intelligence</div>
                </div>
              </div>
              
              {/* Current User */}
              {currentUserData && (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                    {currentUserData.name?.charAt(0) || currentUserData.email.charAt(0)}
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {currentUserData.name || currentUserData.email.split('@')[0]}
                    </div>
                    <div className="text-gray-400 text-sm">{currentUserData.email}</div>
                  </div>
                </div>
              )}
              
              {/* Other Users */}
              {users.map((member) => (
                <div key={member.id} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                    {member.name?.charAt(0) || member.email.charAt(0)}
                  </div>
                  <div>
                    <div className="text-white font-medium">{member.name || member.email.split('@')[0]}</div>
                    <div className="text-gray-400 text-sm">{member.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 chat-messages-container">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Loading messages...</p>
            </div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">
                {searchQuery ? 'No messages found' : 'No messages yet'}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {searchQuery ? 'Try a different search term' : 'Start the conversation!'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {filteredMessages.map((message) => (
              <div key={message.id} id={`message-${message.id}`}>
                <GroupMessage
                  message={message}
                  currentUserId={user?.id || ''}
                  onViewVisualization={handleViewVisualization}
                  onCreateVisualization={handleCreateVisualization}
                  visualizationState={getVisualizationState(message.id)}
                />
              </div>
            ))}

            {isAstraThinking && (
              <div className="flex justify-start mb-4">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-sm">
                    🚀
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-2xl px-4 py-3 border border-blue-500/20">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Astra is thinking</span>
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="bg-gray-900 border-t border-gray-700 p-4">
        <MentionInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          disabled={loading}
          placeholder="Type a message... Use @astra for AI help"
          users={users}
        />
      </div>
    </div>
  );
};
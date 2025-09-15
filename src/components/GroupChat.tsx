import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Search, Users, X, ArrowLeft } from 'lucide-react';
import { GroupMessage } from './GroupMessage';
import { MentionInput } from './MentionInput';
import { LoadingIndicator } from './LoadingIndicator';
import { VisualizationView } from './VisualizationView';
import { VisualizationLoadingView } from './VisualizationLoadingView';
import { useGroupChat } from '../hooks/useGroupChat';
import { useVisualization } from '../hooks/useVisualization';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { GroupMessage as GroupMessageType } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserWithCurrentFlag extends User {
  isCurrentUser?: boolean;
}

interface GroupChatProps {
  showSearch?: boolean;
  showMembers?: boolean;
  onCloseSearch?: () => void;
  onCloseMembers?: () => void;
}

export const GroupChat: React.FC<GroupChatProps> = ({ showSearch = false, showMembers = false, onCloseSearch, onCloseMembers }) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [users, setUsers] = useState<UserWithCurrentFlag[]>([]);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GroupMessageType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [visualizationStates, setVisualizationStates] = useState<Record<string, any>>({});
  const [showSummaryOptions, setShowSummaryOptions] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);

  // Get user's display name
  const getUserName = useCallback(async (): Promise<string> => {
    if (!user) return 'Unknown User';

    try {
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      if (error || !data?.name) {
        return user.email?.split('@')[0] || 'Unknown User';
      }

      return data.name;
    } catch (err) {
      return user.email?.split('@')[0] || 'Unknown User';
    }
  }, [user]);

  const {
    messages,
    loading,
    isAstraThinking,
    sendMessage,
    updateVisualizationData,
    searchMessages,
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

  // Handle search functionality
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      const results = await searchMessages(query);
      setSearchResults(results);
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  }, [searchMessages]);

  // Handle chat summary request
  const handleSummaryRequest = useCallback(async (period: '24 Hours' | '7 Days' | '30 Days') => {
    if (!user) return;
    
    setIsSummarizing(true);
    setShowSummaryOptions(false);
    setSummaryResult(null);
    
    try {
      const userName = await getUserName();
      
      // Calculate date range
      const now = new Date();
      const periodHours = {
        '24 Hours': 24,
        '7 Days': 24 * 7,
        '30 Days': 24 * 30
      };
      const startDate = new Date(now.getTime() - (periodHours[period] * 60 * 60 * 1000));
      
      // Fetch team chat messages from the specified time period
      const { data: chatMessages, error } = await supabase
        .from('astra_chats')
        .select(`
          id,
          user_name,
          message,
          message_type,
          created_at,
          mentions,
          astra_prompt
        `)
        .eq('mode', 'team')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error('Failed to fetch chat messages');
      }
      
      if (!chatMessages || chatMessages.length === 0) {
        setSummaryResult(`No team chat messages found in the last ${period.toLowerCase()}.`);
        return;
      }

      // Format messages for Gemini
      const formattedMessages = chatMessages.map(msg => {
        const timestamp = new Date(msg.created_at).toLocaleString();
        if (msg.message_type === 'astra') {
          const originalPrompt = msg.astra_prompt ? ` (responding to: "${msg.astra_prompt}")` : '';
          return `[${timestamp}] Astra${originalPrompt}: ${msg.message}`;
        } else {
          const mentions = msg.mentions && msg.mentions.length > 0 ? ` (mentioned: ${msg.mentions.join(', ')})` : '';
          return `[${timestamp}] ${msg.user_name}${mentions}: ${msg.message}`;
        }
      }).join('\n\n');

      // Get API key and initialize Gemini
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not found');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      });

      // Create personalized summary prompt
      const summaryPrompt = `Please provide a comprehensive summary of the team chat activity from the last ${period.toLowerCase()} for ${userName}. 

Here are the team chat messages in chronological order:

${formattedMessages}

Please create a personalized summary that includes:
- Key topics and discussions that occurred
- Important decisions or action items mentioned
- Notable insights or information shared by Astra
- Any mentions of ${userName} or topics relevant to them
- Overall team activity and engagement patterns

Format the summary in a clear, organized way that helps ${userName} quickly understand what they may have missed and what's important for them to know.`;

      console.log('🤖 Generating chat summary with Gemini...');
      
      const result = await model.generateContent(summaryPrompt);
      const response = await result.response;
      const summaryText = response.text();
      
      console.log('✅ Chat summary generated successfully');
      
      setSummaryResult(summaryText);
    } catch (error) {
      console.error('Error getting chat summary:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSummaryResult(`I'm sorry, I'm having trouble generating the summary right now. Error: ${errorMessage}. Please try again in a moment.`);
    } finally {
      setIsSummarizing(false);
    }
  }, [user, getUserName]);

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

  // Scroll to a specific message
  const scrollToMessage = useCallback((messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      // Scroll to the message
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Highlight the message briefly
      messageElement.classList.add('message-highlight');
      setTimeout(() => {
        messageElement.classList.remove('message-highlight');
      }, 3000);
    }
  }, []);
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

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

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

  // Show search sidebar
  if (showSearch) {
    return (
      <div className="flex h-full">
        {/* Search Sidebar */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold text-white">Search Messages</h2>
              </div>
              <button
                onClick={onCloseSearch}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Summarize Chat Button */}
            <div className="mb-4">
              <div className="relative">
                <button
                  onClick={() => setShowSummaryOptions(!showSummaryOptions)}
                  disabled={isSummarizing}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
                >
                  {isSummarizing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Generating Summary...</span>
                    </>
                  ) : (
                    <>
                      <span>📊</span>
                      <span>Summarize Chat</span>
                    </>
                  )}
                </button>
                
                {/* Summary Options Dropdown */}
                {showSummaryOptions && !isSummarizing && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-gray-700 rounded-lg shadow-lg border border-gray-600 overflow-hidden z-10">
                    <button
                      onClick={() => handleSummaryRequest('24 Hours')}
                      className="w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors text-white text-sm"
                    >
                      Last 24 Hours
                    </button>
                    <button
                      onClick={() => handleSummaryRequest('7 Days')}
                      className="w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors text-white text-sm border-t border-gray-600"
                    >
                      Last 7 Days
                    </button>
                    <button
                      onClick={() => handleSummaryRequest('30 Days')}
                      className="w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors text-white text-sm border-t border-gray-600"
                    >
                      Last 30 Days
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Summary Result */}
            {summaryResult && (
              <div className="p-4 border-b border-gray-600">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-sm">
                    🚀
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-blue-300 text-sm font-medium">Astra</span>
                      <span className="text-gray-500 text-xs">Chat Summary</span>
                    </div>
                    <div className="bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-2xl px-4 py-3 border border-blue-500/20">
                      <div className="break-words text-sm leading-relaxed">
                        <div className="whitespace-pre-wrap text-gray-300">{summaryResult}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSummaryResult(null)}
                  className="text-xs text-gray-400 hover:text-gray-300 underline"
                >
                  Clear Summary
                </button>
              </div>
            )}
            
            {isSearching ? (
              <div className="p-4 text-center">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
                <p className="text-gray-400 text-sm mt-2">Searching...</p>
              </div>
            ) : searchResults.length === 0 && searchQuery ? (
              <div className="p-4 text-center">
                <Search className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No messages found</p>
                <p className="text-gray-500 text-xs mt-1">Try a different search term</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center">
                <Search className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Start typing to search</p>
              </div>
            ) : (
              <div className="p-2">
                {searchResults.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => scrollToMessage(message.id)}
                    className="p-3 rounded-lg cursor-pointer transition-all duration-200 mb-2 hover:bg-gray-700/50 hover:border hover:border-blue-500/30"
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        message.message_type === 'astra' 
                          ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
                          : 'bg-gray-600 text-white'
                      }`}>
                        {message.message_type === 'astra' ? '🚀' : message.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-white text-sm font-medium">{message.user_name}</span>
                          <span className="text-gray-500 text-xs">{formatTime(message.created_at)}</span>
                        </div>
                        <p className="text-gray-300 text-sm line-clamp-3">
                          {message.message_content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1 chat-messages-container">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Loading messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No messages yet</p>
                  <p className="text-gray-500 text-xs mt-1">Start the conversation!</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
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
              placeholder="Type a message... Use @astra for AI Intelligence"
              users={users}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Members Modal */}
      {showMembers && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">Team Members</h3>
              <button
                onClick={onCloseMembers}
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
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No messages yet</p>
              <p className="text-gray-500 text-xs mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
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
          placeholder="Type a message... Use @astra for AI Intelligence"
          users={users}
        />
      </div>
    </div>
  );
};
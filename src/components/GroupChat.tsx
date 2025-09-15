import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Search, Users, X, ArrowLeft, BarChart3 } from 'lucide-react';
import { GroupMessage } from './GroupMessage';
import { MentionInput } from './MentionInput';
import { VisualizationView } from './VisualizationView';
import { useGroupChat } from '../hooks/useGroupChat';
import { useAuth } from '../contexts/AuthContext';
import { useVisualization } from '../hooks/useVisualization';
import { GroupMessage as GroupMessageType } from '../types';

interface GroupChatProps {
  showSearch: boolean;
  showMembers: boolean;
  onCloseSearch: () => void;
  onCloseMembers: () => void;
}

export const GroupChat: React.FC<GroupChatProps> = ({
  showSearch,
  showMembers,
  onCloseSearch,
  onCloseMembers
}) => {
  const { user } = useAuth();
  const {
    messages,
    loading,
    error,
    isAstraThinking,
    sendMessage,
    searchMessages,
    updateVisualizationData,
    setError
  } = useGroupChat();

  const {
    generateVisualization,
    showVisualization,
    hideVisualization,
    getVisualization,
    currentVisualization,
    messageToHighlight,
    clearHighlight
  } = useVisualization();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GroupMessageType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [visualizationStates, setVisualizationStates] = useState<Record<string, any>>({});
  const [showSummaryOptions, setShowSummaryOptions] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!messageToHighlight) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, messageToHighlight]);

  // Handle sending messages with media
  const handleSendMessage = useCallback(async (content: string, mediaInfo?: Array<{name: string, size: number, type: string, preview: string}>) => {
    if (!content.trim() && (!mediaInfo || mediaInfo.length === 0)) {
      return;
    }

    console.log('GroupChat: Sending message with:', { content, mediaCount: mediaInfo?.length || 0 });

    let finalContent = content.trim();

    // Add media information to the message content if media is attached
    if (mediaInfo && mediaInfo.length > 0) {
      const mediaDescriptions = mediaInfo.map(media => {
        const emoji = media.type === 'image' ? '🖼️' : media.type === 'video' ? '🎥' : '📄';
        // Don't include preview URL in persisted data to avoid blob URL errors
        return `[${emoji} ${media.name}]`;
      }).join(' ');
      
      // Put media first, then text content below
      finalContent = mediaDescriptions + (content.trim() ? `\n\n${content.trim()}` : '');
    }

    console.log('GroupChat: Final content being sent:', finalContent);

    try {
      await sendMessage(finalContent);
      setInputValue('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  }, [sendMessage, setError]);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchMessages(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [searchMessages, setError]);

  // Handle visualization creation
  const handleCreateVisualization = useCallback(async (messageId: string, messageContent: string) => {
    console.log('🎯 Team chat: Starting visualization generation for message:', messageId);
    
    // Set generating state
    setVisualizationStates(prev => ({
      ...prev,
      [messageId]: { isGenerating: true, hasVisualization: false }
    }));

    try {
      await generateVisualization(messageId, messageContent);
      
      // Set completion state
      setVisualizationStates(prev => ({
        ...prev,
        [messageId]: { isGenerating: false, hasVisualization: true }
      }));
      
      console.log('✅ Team chat: Visualization generation completed for message:', messageId);
    } catch (error) {
      console.error('❌ Team chat: Error during visualization generation:', error);
      setVisualizationStates(prev => ({
        ...prev,
        [messageId]: { isGenerating: false, hasVisualization: false }
      }));
    }
  }, [generateVisualization]);

  // Handle viewing visualization
  const handleViewVisualization = useCallback((messageId: string, visualizationData?: string) => {
    console.log('👁️ Team chat: Viewing visualization for message:', messageId);
    
    // Check if we have visualization data from the database
    if (visualizationData) {
      console.log('📊 Team chat: Using database visualization data');
      // For database visualizations, we'd need to handle this differently
      // For now, let's use the hook-generated visualizations
    }
    
    // Check hook state for visualization content
    const hookVisualization = getVisualization(messageId);
    if (hookVisualization?.content) {
      console.log('📊 Team chat: Using hook visualization data');
      showVisualization(messageId);
      return;
    }
    
    console.log('❌ Team chat: No visualization data found for message:', messageId);
  }, [showVisualization, getVisualization]);

  // Show visualization view if one is currently active
  if (currentVisualization) {
    const visualization = getVisualization(currentVisualization);
    if (visualization?.content) {
      return (
        <VisualizationView
          content={visualization.content}
          onBack={hideVisualization}
        />
      );
    }
  }

  // Show search overlay
  if (showSearch) {
    return (
      <div className="flex flex-col h-full bg-gray-900">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <button
              onClick={onCloseSearch}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <h2 className="text-lg font-semibold text-white">Search Messages</h2>
          </div>
        </div>

        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              placeholder="Search messages..."
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isSearching ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Searching...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-4">
              {searchResults.map((message) => (
                <GroupMessage
                  key={message.id}
                  message={message}
                  currentUserId={user?.id || ''}
                  onViewVisualization={handleViewVisualization}
                  onCreateVisualization={handleCreateVisualization}
                  visualizationState={visualizationStates[message.id]}
                />
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No messages found</p>
              <p className="text-gray-500 text-sm mt-1">Try different search terms</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Start typing to search messages</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show members overlay
  if (showMembers) {
    return (
      <div className="flex flex-col h-full bg-gray-900">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <button
              onClick={onCloseMembers}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <h2 className="text-lg font-semibold text-white">Team Members</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {/* Astra AI */}
            <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-lg">🚀</span>
              </div>
              <div className="flex-1">
                <div className="text-white font-medium">Astra</div>
                <div className="text-gray-400 text-sm">AI Intelligence</div>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>

            {/* Current User */}
            <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">
                  {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="text-white font-medium">
                  {user?.user_metadata?.full_name || 'You'}
                </div>
                <div className="text-gray-400 text-sm">{user?.email}</div>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main chat view
  return (
    <div className="flex flex-col h-full bg-gray-900">
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 p-3">
          <div className="flex items-center justify-between">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-20 px-4">
        <div className="max-w-4xl mx-auto space-y-4 pt-4">
          {loading && messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-white mb-2">Welcome to Team Chat</h3>
              <p className="text-gray-400 mb-4">Start a conversation with your team or mention @astra for AI assistance</p>
              <div className="bg-gray-800 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-gray-300 mb-2">💡 <strong>Pro tip:</strong></p>
                <p className="text-sm text-gray-400">Type <code className="bg-gray-700 px-1 rounded">@astra</code> followed by your question to get AI-powered insights and analysis!</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} id={`message-${message.id}`}>
                <GroupMessage
                  message={message}
                  currentUserId={user?.id || ''}
                  onViewVisualization={handleViewVisualization}
                  onCreateVisualization={handleCreateVisualization}
                  visualizationState={visualizationStates[message.id]}
                />
              </div>
            ))
          )}

          {isAstraThinking && (
            <div className="flex justify-start mb-4">
              <div className="flex-shrink-0 mr-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  🚀
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-2xl px-4 py-3 shadow-sm max-w-xs border border-blue-500/20">
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
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 safe-area-padding-bottom">
        <div className="max-w-4xl mx-auto">
          <MentionInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSendMessage}
            disabled={loading || isAstraThinking}
            placeholder="Type a message... Use @astra for AI Intelligence"
          />
        </div>
      </div>
    </div>
  );
};
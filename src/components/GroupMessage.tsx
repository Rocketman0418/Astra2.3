import React from 'react';
import { BarChart3, Check, RefreshCw } from 'lucide-react';
import { GroupMessage as GroupMessageType } from '../types';

interface GroupMessageProps {
  message: GroupMessageType;
  currentUserId: string;
  onViewVisualization?: (messageId: string, visualizationData: string) => void;
  onCreateVisualization?: (messageId: string, messageContent: string) => void;
  visualizationState?: any;
}

// Helper function to extract media info from message content
const extractMediaInfo = (content: string) => {
  const mediaRegex = /\[(🖼️|🎥|📄)\s+([^\]]+)\]/g;
  const mediaItems: Array<{type: string, name: string, emoji: string, preview?: string}> = [];
  let match;
  
  while ((match = mediaRegex.exec(content)) !== null) {
    const emoji = match[1];
    const name = match[2];
    const type = emoji === '🖼️' ? 'image' : emoji === '🎥' ? 'video' : 'pdf';
    
    // Extract preview URL if it exists (format: filename|||previewUrl)
    const parts = name.split('|||');
    const fileName = parts[0];
    const previewUrl = parts[1];
    
    mediaItems.push({ type, name: fileName, emoji, preview: previewUrl });
  }
  
  return {
    mediaItems,
    textContent: content.replace(mediaRegex, '').trim()
  };
};

const formatMessageContent = (content: string, mentions: string[], isAstraMessage: boolean = false): JSX.Element => {
  if (isAstraMessage) {
    // Use the same formatting logic as private chat for Astra messages
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines but add spacing
      if (!trimmedLine) {
        elements.push(<br key={`br-${index}`} />);
        return;
      }
      
      // Handle numbered lists (1. 2. 3. etc.)
      const numberedListMatch = trimmedLine.match(/^(\d+)\.\s*\*\*(.*?)\*\*:\s*(.*)$/);
      if (numberedListMatch) {
        const [, number, title, content] = numberedListMatch;
        elements.push(
          <div key={index} className="mb-4">
            <div className="flex items-start space-x-2">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {number}
              </span>
              <div className="flex-1">
                <div className="font-bold text-blue-300 mb-1">{title}</div>
                <div className="text-gray-300 leading-relaxed">{content}</div>
              </div>
            </div>
          </div>
        );
        return;
      }
      
      // Handle regular bold text
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(trimmedLine)) {
        const parts = trimmedLine.split(boldRegex);
        const formattedParts = parts.map((part, partIndex) => {
          if (partIndex % 2 === 1) {
            return <strong key={partIndex} className="font-bold text-blue-300">{part}</strong>;
          }
          return part;
        });
        elements.push(<div key={index} className="mb-2">{formattedParts}</div>);
        return;
      }
      
      // Handle bullet points
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        elements.push(
          <div key={index} className="flex items-start space-x-2 mb-2 ml-4">
            <span className="text-blue-400 mt-1">•</span>
            <span className="text-gray-300">{trimmedLine.substring(1).trim()}</span>
          </div>
        );
        return;
      }
      
      // Regular text
      elements.push(<div key={index} className="mb-2 text-gray-300">{trimmedLine}</div>);
    });
    
    return <div>{elements}</div>;
  }

  // Regular user message formatting with mentions
  if (mentions.length === 0) {
    return <span className="text-gray-300">{content}</span>;
  }

  let formattedContent = content;
  mentions.forEach(mention => {
    const mentionRegex = new RegExp(`@${mention}`, 'gi');
    formattedContent = formattedContent.replace(
      mentionRegex,
      `<span class="bg-blue-600/20 text-blue-300 px-1 rounded">@${mention}</span>`
    );
  });

  return (
    <span 
      className="text-gray-300"
      dangerouslySetInnerHTML={{ __html: formattedContent }}
    />
  );
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

export const GroupMessage: React.FC<GroupMessageProps> = ({
  message,
  currentUserId,
  onViewVisualization,
  onCreateVisualization,
  visualizationState
}) => {
  const isOwnMessage = message.user_id === currentUserId;
  const isAstraMessage = message.message_type === 'astra';
  const hasVisualization = message.visualization_data;
  const isGeneratingVisualization = visualizationState?.isGenerating || false;
  
  // Extract media info from message content
  const { mediaItems, textContent } = extractMediaInfo(message.message_content);
  const hasMedia = mediaItems.length > 0;
  
  // Message expansion logic
  const [isExpanded, setIsExpanded] = React.useState(false);
  const isLongMessage = textContent.length > 300;
  const shouldTruncate = isLongMessage && !isExpanded;
  const displayText = shouldTruncate 
    ? textContent.substring(0, 300) + '...'
    : textContent;

  const lines = displayText.split('\n');
  const shouldShowMore = lines.length > 5 && !isExpanded;
  const finalText = shouldShowMore 
    ? lines.slice(0, 5).join('\n') + '...'
    : displayText;

  const getButtonText = () => {
    if (isGeneratingVisualization) {
      return 'Generating...';
    }
    if (hasVisualization || visualizationState?.hasVisualization) {
      return 'View Visualization';
    }
    return 'Create Visualization';
  };

  const handleVisualizationClick = () => {
    if (isGeneratingVisualization) {
      return; // Don't allow clicks while generating
    }
    
    if (hasVisualization && onViewVisualization) {
      onViewVisualization(message.id, message.visualization_data || undefined);
    } else if (visualizationState?.hasVisualization && onViewVisualization) {
      onViewVisualization(message.id, undefined);
    } else if (isAstraMessage && onCreateVisualization) {
      onCreateVisualization(message.id, message.message_content);
    }
  };

  return (
    <div className={`flex mb-4 ${isOwnMessage && !isAstraMessage ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar */}
      {(!isOwnMessage || isAstraMessage) && (
        <div className="flex-shrink-0 mr-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isAstraMessage 
              ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
              : 'bg-gray-600 text-white'
          }`}>
            {isAstraMessage ? '🚀' : message.user_name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Message Content */}
      <div className={`max-w-[70%] ${isOwnMessage && !isAstraMessage ? 'ml-auto' : ''}`}>
        {/* User name and timestamp */}
        {(!isOwnMessage || isAstraMessage) && (
          <div className="flex items-center space-x-2 mb-1">
            <span className={`text-sm font-medium ${
              isAstraMessage ? 'text-blue-300' : 'text-gray-300'
            }`}>
              {message.user_name}
            </span>
            <span className="text-xs text-gray-500">
              {formatTime(message.created_at)}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div className={`rounded-2xl px-4 py-3 ${
          isOwnMessage && !isAstraMessage
            ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
            : isAstraMessage
            ? 'bg-gradient-to-br from-gray-700 to-gray-800 text-white border border-blue-500/20'
            : 'bg-gray-700 text-white'
        }`}>
          {/* Show original prompt for Astra messages */}
          {isAstraMessage && message.astra_prompt && (
            <div className="mb-3 pb-3 border-b border-gray-600/50">
              <div className="text-xs text-gray-400 mb-1">Responding to:</div>
              <div className="text-sm text-gray-300 italic">"{message.astra_prompt}"</div>
              <div className="text-xs text-blue-300 mt-1">Asked by {message.metadata?.asked_by_user_name || 'Unknown User'}</div>
            </div>
          )}

          <div className="break-words text-sm leading-relaxed">
            {/* Media content */}
            {hasMedia && (
              <div className="space-y-3 mb-3">
                {mediaItems.map((media, index) => (
                  <div key={index} className="rounded-lg overflow-hidden bg-gray-600/20 border border-gray-600/30">
                    {media.type === 'image' && media.preview ? (
                      <div className="relative group cursor-pointer">
                        <img
                          src={media.preview}
                          alt={media.name}
                          className="w-full max-w-sm h-auto max-h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                          onClick={() => window.open(media.preview, '_blank')}
                          onError={(e) => {
                            console.error('❌ Image failed to load:', media.preview);
                            console.log('🔍 Attempting to load image from URL:', media.preview);
                            // Fallback to filename display
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'block';
                          }}
                          onLoad={() => {
                            console.log('✅ Image loaded successfully:', media.preview);
                          }}
                        />
                        <div className="hidden p-3 text-center bg-gray-700 rounded-lg">
                          <div className="text-2xl mb-2">🖼️</div>
                          <div className="text-sm text-white">{media.name}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            Image failed to load
                            <br />
                            <button 
                              onClick={() => window.open(media.preview, '_blank')}
                              className="text-blue-300 hover:text-blue-200 underline mt-1"
                            >
                              Try opening directly
                            </button>
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-medium">
                            Click to view full size
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 p-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          media.type === 'video' ? 'bg-purple-500/20' : 'bg-blue-500/20'
                        }`}>
                          <span className="text-2xl">{media.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-200 truncate">
                            {media.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {media.type === 'image' ? 'Image file' : media.type === 'video' ? 'Video file' : 'PDF file'}
                            {media.type === 'image' && ' • Preview expired'}
                          </div>
                        </div>
                        {media.preview && (
                          <button 
                            onClick={() => window.open(media.preview, '_blank')}
                            className="text-xs text-blue-300 hover:text-blue-200 underline px-2 py-1 rounded"
                          >
                            View
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Text content - now appears below media */}
            {finalText && (
              <div className="mb-2">
                {isOwnMessage && !isAstraMessage ? (
                  <div className="whitespace-pre-wrap">{finalText}</div>
                ) : (
                  formatMessageContent(finalText, message.mentions, isAstraMessage)
                )}
              </div>
            )}
          </div>
          
          {/* Show More/Less button */}
          {(isLongMessage || shouldShowMore) && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs underline mt-2 opacity-90 hover:opacity-100 transition-opacity"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
          )}

          {/* Visualization button for Astra messages */}
          {isAstraMessage && (onViewVisualization || onCreateVisualization) && (
            <div className="mt-3">
              <button
                onClick={handleVisualizationClick}
                disabled={isGeneratingVisualization}
                className={`flex items-center space-x-2 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 transform disabled:cursor-not-allowed ${
                  isGeneratingVisualization
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 animate-pulse cursor-not-allowed'
                    : (hasVisualization || visualizationState?.hasVisualization)
                    ? 'bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 bg-[length:200%_100%] animate-[gradient_3s_ease-in-out_infinite] hover:scale-105 shadow-lg'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:scale-105'
                }`}
              >
                {(hasVisualization || visualizationState?.hasVisualization) && !isGeneratingVisualization ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <BarChart3 className={`w-4 h-4 ${isGeneratingVisualization ? 'animate-spin' : ''}`} />
                )}
                <span>{getButtonText()}</span>
                {isGeneratingVisualization && (
                  <div className="flex space-x-1 ml-1">
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}
              </button>
              
              {/* Retry button - only show when visualization exists */}
              {(hasVisualization || visualizationState?.hasVisualization) && !isGeneratingVisualization && onCreateVisualization && (
                <button
                  onClick={() => onCreateVisualization(message.id, message.message_content)}
                  className="flex items-center space-x-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 transform hover:scale-105"
                  title="Generate a new visualization"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden sm:inline">Retry</span>
                </button>
              )}
            </div>
          )}

          {/* Timestamp for own messages */}
          {isOwnMessage && !isAstraMessage && (
            <div className="text-xs opacity-70 mt-2">
              {formatTime(message.created_at)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
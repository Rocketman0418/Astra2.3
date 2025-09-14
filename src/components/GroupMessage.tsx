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
            {formatMessageContent(message.message_content, message.mentions, isAstraMessage)}
          </div>

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
import React from 'react';
import { Bookmark, Reply } from 'lucide-react';
import { VisualizationButton } from './VisualizationButton';
import { Message } from '../types';

const formatMessageText = (text: string): JSX.Element => {
  // Split text into lines and process each line
  const lines = text.split('\n');
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
};

interface MessageBubbleProps {
  message: Message;
  onToggleExpansion: (messageId: string) => void;
  onToggleFavorite?: (messageId: string, text: string) => void;
  isFavorited?: boolean;
  onCreateVisualization?: (messageId: string, messageText: string) => void;
  onViewVisualization?: (messageId: string) => void;
  visualizationState?: any;
  onReply?: (messageId: string, messageText: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onToggleExpansion,
  onToggleFavorite,
  isFavorited = false,
  onCreateVisualization,
  onViewVisualization,
 visualizationState,
 onReply
}) => {
  const isLongMessage = message.text.length > 300;
  const shouldTruncate = isLongMessage && !message.isExpanded;

  // Check if message has visualization data stored in database
  const hasStoredVisualization = message.visualization || message.hasStoredVisualization;
  const hasVisualization = hasStoredVisualization || visualizationState?.hasVisualization;
  
  // Check if this is an Astra message (can be replied to)
  const isAstraMessage = message.messageType === 'astra' || (!message.isUser && !message.isCentered);
  
  // Check if this is a reply message
  const isReplyMessage = message.isReply || message.text.startsWith('@reply ');
  
  // Extract reply content if this is a reply message
  const getReplyContent = () => {
    if (isReplyMessage && message.text.startsWith('@reply ')) {
      const parts = message.text.split(' ');
      if (parts.length >= 3) {
        return parts.slice(2).join(' '); // Remove "@reply" and messageId
      }
    }
    return message.text;
  };
  
  // Get the base text content (handle reply messages)
  const baseText = isReplyMessage ? getReplyContent() : message.text;
  
  // Apply truncation if needed
  const truncatedText = shouldTruncate 
    ? baseText.substring(0, 300) + '...'
    : baseText;

  // Check for line-based truncation
  const lines = truncatedText.split('\n');
  const shouldShowMore = lines.length > 5 && !message.isExpanded;
  const finalText = shouldShowMore 
    ? lines.slice(0, 5).join('\n') + '...'
    : truncatedText;

  // Special styling for centered welcome message
  if (message.isCentered) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="flex justify-start">
          <div className="flex-shrink-0 mr-2 md:mr-3">
            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-sm md:text-lg">
              🚀
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-2xl px-3 py-2 md:px-4 md:py-3 shadow-sm max-w-[280px] sm:max-w-md lg:max-w-lg xl:max-w-xl">
            <div className="break-words text-sm md:text-sm leading-relaxed">
              <div className="whitespace-pre-wrap text-gray-300">{finalText}</div>
            </div>
            
            <div className="text-xs opacity-70 mt-1 md:mt-2">
              {message.timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex mb-3 md:mb-4 ${message.isUser ? 'justify-end' : 'justify-start'}`}>
      {!message.isUser && (
        <div className="flex-shrink-0 mr-2 md:mr-3 mt-1">
          <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-sm md:text-lg">
            🚀
          </div>
        </div>
      )}
      
      <div className={`max-w-[280px] sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl px-3 py-2 md:px-4 md:py-3 shadow-sm ${
        message.isUser
          ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
          : 'bg-gradient-to-br from-gray-700 to-gray-800 text-white'
      }`}>
        <div className="break-words text-sm md:text-sm leading-relaxed">
          {message.isUser ? (
            <>
              {isReplyMessage && (
                <div className="text-xs text-blue-300 mb-2 opacity-80">
                  💬 Reply
                </div>
              )}
              <div className="whitespace-pre-wrap">{finalText}</div>
            </>
          ) : (
            formatMessageText(finalText)
          )}
        </div>
        
        {(isLongMessage || shouldShowMore) && (
          <button
            onClick={() => onToggleExpansion(message.id)}
            className="text-xs underline mt-1 md:mt-2 opacity-90 hover:opacity-100 transition-opacity"
          >
            {message.isExpanded ? 'Show Less' : 'Show More'}
          </button>
        )}

        <div className="text-xs opacity-70 mt-1 md:mt-2">
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
        
        {/* Favorite button for user messages */}
        {message.isUser && onToggleFavorite && (
          <div className="mt-2 md:mt-3">
            <button
              onClick={() => onToggleFavorite(message.id, message.text)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 min-h-[44px] touch-manipulation ${
                isFavorited
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
              title={isFavorited ? 'Remove from saved prompts' : 'Save prompt'}
            >
              <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
              <span>{isFavorited ? 'Saved' : 'Save Prompt'}</span>
            </button>
          </div>
        )}
        
        {/* Reply button for Astra messages */}
        {isAstraMessage && !message.isCentered && onReply && message.chatId && (
          <div className="mt-2 md:mt-3">
            <button
              onClick={() => onReply(message.chatId || message.id, message.text)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 min-h-[44px] touch-manipulation bg-gray-600/50 text-gray-300 hover:bg-blue-600/50 hover:text-blue-300"
              title="Reply to this message"
            >
              <Reply className="w-4 h-4" />
              <span>Reply</span>
            </button>
          </div>
        )}
        
        {!message.isUser && message.chatId && onCreateVisualization && onViewVisualization && (
          <div className="mt-2 md:mt-3">
            {console.log('🔍 MessageBubble: Rendering visualization button for chatId:', message.chatId, 'visualizationState:', visualizationState)}
            <VisualizationButton
              messageId={message.chatId}
              messageText={message.text}
              onCreateVisualization={onCreateVisualization}
              onViewVisualization={onViewVisualization}
              visualizationState={visualizationState}
            />
          </div>
        )}
      </div>
    </div>
  );
};
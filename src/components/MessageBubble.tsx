import React from 'react';
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
  onCreateVisualization?: (messageId: string, messageText: string) => void;
  onViewVisualization?: (messageId: string) => void;
  visualizationState?: any;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onToggleExpansion,
  onCreateVisualization,
  onViewVisualization,
  visualizationState
}) => {
  const isLongMessage = message.text.length > 300;
  const shouldTruncate = isLongMessage && !message.isExpanded;
  const displayText = shouldTruncate 
    ? message.text.substring(0, 300) + '...'
    : message.text;

  const lines = displayText.split('\n');
  const shouldShowMore = lines.length > 5 && !message.isExpanded;
  const finalText = shouldShowMore 
    ? lines.slice(0, 5).join('\n') + '...'
    : displayText;

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
            <div className="whitespace-pre-wrap">{finalText}</div>
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
        
        {!message.isUser && onCreateVisualization && onViewVisualization && (
          <div className="mt-2 md:mt-3">
            <VisualizationButton
              messageId={message.id}
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
import React, { KeyboardEvent } from 'react';
import { Send, Bookmark, X, Reply } from 'lucide-react';
import { FavoritesDropdown } from './FavoritesDropdown';
import { FavoriteMessage, ReplyState } from '../types';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  disabled: boolean;
  favorites?: FavoriteMessage[];
  onRemoveFavorite?: (messageId: string) => void;
  replyState?: ReplyState;
  onCancelReply?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  disabled,
  favorites = [],
  onRemoveFavorite,
  replyState,
  onCancelReply
}) => {
  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(value);
    }
  };

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSend(value);
    }
  };

  const handleSelectFavorite = (text: string) => {
    onChange(text);
  };

  return (
    <div className="bg-gray-900 border-t border-gray-700 p-3 md:p-4 safe-area-padding-bottom">
      {/* Reply Preview */}
      {replyState?.isReplying && (
        <div className="mb-3 bg-gray-800 border border-gray-600 rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Reply className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Replying to:</span>
              </div>
              <p className="text-sm text-gray-300 line-clamp-2">
                {replyState.messageSnippet}
              </p>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 hover:bg-gray-700 rounded transition-colors ml-2"
              title="Cancel reply"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}
      
      <div className="flex items-end space-x-2 md:space-x-3 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Send a message to Astra....."
            disabled={disabled}
            className="w-full resize-none rounded-2xl border border-gray-600 bg-gray-800 text-white px-3 py-2 md:px-4 md:py-3 pr-20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-700 disabled:cursor-not-allowed max-h-32 min-h-[72px] md:min-h-[72px] text-sm md:text-base leading-relaxed placeholder-gray-400"
            rows={3}
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#3b82f6 #374151'
            }}
          />
          
          {/* Buttons inside input */}
          <div className="absolute right-2 bottom-2 flex items-center space-x-1">
            {onRemoveFavorite && (
              <FavoritesDropdown
                favorites={favorites}
                onSelectFavorite={handleSelectFavorite}
                onRemoveFavorite={onRemoveFavorite}
              />
            )}
            
            <button
              onClick={handleSubmit}
              disabled={disabled || !value.trim()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-full p-2 transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed min-h-[40px] min-w-[40px] flex items-center justify-center touch-manipulation"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
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
        {/* Bookmark button outside input */}
        {onRemoveFavorite && (
          <div className="flex-shrink-0 mb-2">
            <FavoritesDropdown
              favorites={favorites}
              onSelectFavorite={handleSelectFavorite}
              onRemoveFavorite={onRemoveFavorite}
            />
          </div>
        )}
        
        <div className="flex-1 relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Send a message to Astra....."
            disabled={disabled}
            className="w-full resize-none rounded-2xl border border-gray-600 bg-gray-800 text-white px-3 py-2 md:px-4 md:py-3 pr-12 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-700 disabled:cursor-not-allowed max-h-32 min-h-[72px] md:min-h-[72px] text-sm md:text-base leading-relaxed placeholder-gray-400"
            rows={3}
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#3b82f6 #374151'
            }}
          />
          
          {/* Send button inside input */}
          <div className="absolute right-3 bottom-3">
            <button
              onClick={handleSubmit}
              disabled={disabled || !value.trim()}
              className="text-blue-500 hover:text-blue-400 disabled:text-gray-500 transition-colors disabled:cursor-not-allowed p-1"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
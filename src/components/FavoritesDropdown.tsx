import React, { useState, useRef, useEffect } from 'react';
import { Bookmark, X } from 'lucide-react';
import { FavoriteMessage } from '../types';

interface FavoritesDropdownProps {
  favorites: FavoriteMessage[];
  onSelectFavorite: (text: string) => void;
  onRemoveFavorite: (messageId: string) => void;
}

export const FavoritesDropdown: React.FC<FavoritesDropdownProps> = ({
  favorites,
  onSelectFavorite,
  onRemoveFavorite
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectFavorite = (text: string) => {
    onSelectFavorite(text);
    setIsOpen(false);
  };

  const handleRemoveFavorite = (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation();
    onRemoveFavorite(messageId);
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={favorites.length === 0}
        className={`p-3 rounded-lg transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center touch-manipulation ${
          favorites.length === 0
            ? 'text-gray-600 cursor-not-allowed bg-gray-800'
            : isOpen
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : 'hover:bg-gray-700 text-gray-400 bg-gray-800 border border-gray-600'
        }`}
        title={favorites.length === 0 ? 'No saved prompts yet' : 'Saved prompts'}
      >
        <Bookmark className={`w-5 h-5 ${favorites.length > 0 && isOpen ? 'fill-current' : ''}`} />
      </button>

      {isOpen && favorites.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
          <div className="p-3 border-b border-gray-700">
            <h3 className="text-white font-medium text-sm">Saved Prompts</h3>
            <p className="text-gray-400 text-xs">Click to reuse a question</p>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                onClick={() => handleSelectFavorite(favorite.text)}
                className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700/50 last:border-b-0 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-white text-sm line-clamp-5 mb-1">
                      {favorite.text}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {formatTime(favorite.createdAt)}
                    </p>
                  </div>
                  
                  <button
                    onClick={(e) => handleRemoveFavorite(e, favorite.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all duration-200"
                    title="Remove from saved prompts"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
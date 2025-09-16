import React from 'react';
import { MessageSquare, Users } from 'lucide-react';
import { ChatMode } from '../types';
import { useNotifications } from '../hooks/useNotifications';

interface ChatModeToggleProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

export const ChatModeToggle: React.FC<ChatModeToggleProps> = ({ mode, onModeChange }) => {
  const { notifications } = useNotifications();
  const hasUnread = notifications.unreadCount > 0;
  const hasMentions = notifications.mentions.length > 0;

  return (
    <div className="flex bg-gray-800 rounded-lg p-1 mx-4 my-2">
      <button
        onClick={() => onModeChange('private')}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 flex-1 justify-center ${
          mode === 'private'
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
            : 'text-gray-300 hover:text-white hover:bg-gray-700'
        }`}
      >
        <MessageSquare className="w-4 h-4" />
        <span className="text-sm font-medium">Private Chat</span>
      </button>
      
      <button
        onClick={() => onModeChange('team')}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 flex-1 justify-center relative ${
          mode === 'team'
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
            : 'text-gray-300 hover:text-white hover:bg-gray-700'
        }`}
      >
        <Users className="w-4 h-4" />
        <span className="text-sm font-medium">Team Chat</span>
        
        {/* Notification Badge */}
        {(hasUnread || hasMentions) && mode !== 'team' && (
          <div className="absolute -top-1 -right-1 flex items-center justify-center">
            {hasMentions ? (
              <div className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse border-2 border-gray-800">
                @
              </div>
            ) : (
              <div className="bg-blue-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 border-2 border-gray-800">
                {notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}
              </div>
            )}
          </div>
        )}
      </button>
    </div>
  );
};
import React from 'react';
import { MessageSquare, Users } from 'lucide-react';
import { ChatMode } from '../types';

interface ChatModeToggleProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

export const ChatModeToggle: React.FC<ChatModeToggleProps> = ({ mode, onModeChange }) => {
  return (
    <div className="flex bg-gray-800 rounded-lg p-1 mx-4 mb-4">
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
        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 flex-1 justify-center ${
          mode === 'team'
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
            : 'text-gray-300 hover:text-white hover:bg-gray-700'
        }`}
      >
        <Users className="w-4 h-4" />
        <span className="text-sm font-medium">Team Chat</span>
      </button>
    </div>
  );
};
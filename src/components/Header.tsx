import React from 'react';
import { Menu, User, MessageSquare, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ChatMode } from '../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  showSidebarToggle?: boolean;
  chatMode?: ChatMode;
}

export const Header: React.FC<HeaderProps> = ({ 
  onToggleSidebar, 
  showSidebarToggle = true,
  chatMode = 'private'
}) => {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-blue-600 to-purple-700 shadow-lg px-4 h-16">
      <div className="flex items-center justify-between">
        {/* Left side - Menu button */}
        <div className="flex items-center space-x-2">
          {showSidebarToggle && (
            <button
              onClick={onToggleSidebar}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation my-2"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
          )}
          
          {/* Chat mode indicator */}
          <div className="flex items-center space-x-2 text-white">
            {chatMode === 'private' ? (
              <MessageSquare className="w-5 h-5" />
            ) : (
              <Users className="w-5 h-5" />
            )}
            <span className="text-sm font-medium hidden sm:inline">
              {chatMode === 'private' ? 'Private Chat' : 'Team Chat'}
            </span>
          </div>
        </div>

        {/* Center - Logo and title */}
        <div className="flex items-center space-x-3 my-2">
          {/* Company logo */}
          <img 
            src="/RocketHub Logo Alt 1 Small.png" 
            alt="RocketHub Logo" 
            className="w-12 h-12 md:w-14 md:h-14 object-contain"
          />
          
          {/* Title and rocket emoji */}
          <div className="flex items-center space-x-2">
            <span className="text-xl md:text-2xl">🚀</span>
            <h1 className="text-base md:text-lg font-bold text-white tracking-tight">
              Astra Intelligence
            </h1>
          </div>
        </div>

        {/* Right side - User info */}
        <div className="flex items-center space-x-2 my-2">
          <div className="hidden sm:block text-right">
            <p className="text-white text-sm font-medium">
              {user?.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-blue-200 text-xs">
              {user?.email}
            </p>
          </div>
          <div className="w-8 h-8 bg-blue-800 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
};
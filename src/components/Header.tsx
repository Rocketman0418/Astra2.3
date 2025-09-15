import React from 'react';
import { Menu, User, MessageSquare, Users, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ChatMode } from '../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  showSidebarToggle?: boolean;
  chatMode?: ChatMode;
  onToggleTeamMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onToggleSidebar, 
  showSidebarToggle = true,
  chatMode = 'private',
  onToggleTeamMenu
}) => {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-blue-600 to-purple-700 shadow-lg px-4 h-16">
      <div className="flex items-center justify-between h-full py-1">
        {/* Left side - Menu button */}
        <div className="flex items-center space-x-2">
          {showSidebarToggle && (
            <button
              onClick={onToggleSidebar}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
          )}
          
          {/* Team chat menu */}
          {chatMode === 'team' && (
            <button
              onClick={onToggleTeamMenu}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
          )}
        </div>

        {/* Center - Logo and title */}
        <div className="flex items-center space-x-3">
          {/* Company logo */}
          <img 
            src="/RocketHub Logo Alt 1 Small.png" 
            alt="RocketHub Logo" 
            className="w-20 h-20 md:w-24 md:h-24 object-contain"
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
        <div className="flex items-center space-x-2">
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
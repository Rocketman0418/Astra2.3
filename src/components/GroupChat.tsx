import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Search, Users, X, ArrowLeft } from 'lucide-react';
import { GroupMessage } from './GroupMessage';

interface GroupChatProps {
  showSearch: boolean;
  showMembers: boolean;
  onCloseSearch: () => void;
  onCloseMembers: () => void;
}

export const GroupChat: React.FC<GroupChatProps> = ({
  showSearch,
  showMembers,
  onCloseSearch,
  onCloseMembers
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Group Chat</h2>
      </div>
      <div className="flex-1 p-4">
        <p>Group chat functionality coming soon...</p>
      </div>
    </div>
  );
};
import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Smile } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  disabled: boolean;
  placeholder?: string;
  users?: User[];
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = "Type a message... Use @astra for AI Intelligence",
  users = []
}) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionsRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Debug: Check if onSend prop is received
  useEffect(() => {
    console.log('🔧 MentionInput: Component mounted, onSend type:', typeof onSend);
    console.log('🔧 MentionInput: onSend function:', onSend);
  }, [onSend]);

  // Add Astra to the users list
  const allUsers = [
    { id: 'astra', name: 'Astra', email: 'astra@rockethub.ai' },
    ...users
  ];

  // Filter users based on mention query
  const filteredUsers = allUsers.filter(user =>
    user.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log('🔧 MentionInput: Input changed:', e.target.value);
    console.log('🔧 MentionInput: onChange prop type:', typeof onChange);
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Check for @ mentions
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentions(true);
      setSelectedMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  // Handle key presses
  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    console.log('🚀 MentionInput: Key pressed:', e.key, 'showMentions:', showMentions, 'value:', value);
    
    if (showMentions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredUsers[selectedMentionIndex]) {
          insertMention(filteredUsers[selectedMentionIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('🚀 MentionInput: Enter key pressed, calling handleSubmit');
      console.log('🚀 MentionInput: Current state - value:', value, 'disabled:', disabled, 'onSend type:', typeof onSend);
      handleSubmit();
    }
  };

  // Insert mention into text
  const insertMention = (user: User) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(0, mentionMatch.index);
      const properCaseName = user.name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      const newValue = `${beforeMention}@${properCaseName} ${textAfterCursor}`;
      const newCursorPos = beforeMention.length + properCaseName.length + 2;
      
      onChange(newValue);
      setShowMentions(false);
      
      // Set cursor position after mention
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    console.log('🚀 MentionInput: handleSubmit called');
    console.log('🚀 MentionInput: value:', value);
    console.log('🚀 MentionInput: value.trim():', value.trim());
    console.log('🚀 MentionInput: disabled:', disabled);
    console.log('🚀 MentionInput: onSend type:', typeof onSend);
    console.log('🚀 MentionInput: onSend function:', onSend);
    
    if (value.trim() && !disabled) {
      console.log('🚀 MentionInput: Conditions met, calling onSend with value:', value);
      onSend(value);
      setShowEmojiPicker(false);
    } else {
      console.log('🚀 MentionInput: Conditions NOT met - not sending');
      console.log('🚀 MentionInput: Has trimmed value:', !!value.trim());
      console.log('🚀 MentionInput: Not disabled:', !disabled);
    }
  };

  // Test button click
  const handleButtonClick = () => {
    console.log('🚀 MentionInput: Send button clicked!');
    console.log('🚀 MentionInput: Button click - value:', value);
    console.log('🚀 MentionInput: Button click - disabled:', disabled);
    console.log('🚀 MentionInput: Button click - hasValue:', !!value.trim());
    handleSubmit();
  };

  // Common emojis for quick access
  const commonEmojis = [
    // Faces & Expressions
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲',
    '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱',
    '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😴', '😪', '😵',
    
    // Cool & Fun
    '😎', '🤠', '🥳', '🤡', '🤖', '👻', '💀', '☠️', '👽', '👾',
    '🎭', '🎪', '🎨', '🎬', '🎤', '🎧', '🎵', '🎶', '🎸', '🥁',
    
    // Hands & Gestures
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
    '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌',
    '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '💅',
    
    // Hearts & Love
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
    
    // Symbols & Effects
    '✨', '🎉', '🎊', '🔥', '💯', '⭐', '🌟', '💫', '⚡', '💥',
    '💢', '💨', '💦', '💤', '🕳️', '💣', '💡', '🔔', '🔕', '📢',
    
    // Transportation & Space
    '🚀', '🛸', '✈️', '🚁', '🚂', '🚗', '🏎️', '🚓', '🚑', '🚒',
    '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹',
    
    // Nature & Weather
    '🌈', '☀️', '🌤️', '⛅', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️',
    '☃️', '⛄', '🌬️', '💨', '🌪️', '🌊', '💧', '☔', '⚡', '🔥',
    
    // Food & Drinks
    '🍕', '🍔', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥚', '🍳',
    '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍟', '🍿',
    '☕', '🍵', '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃',
    
    // Activities & Sports
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
    '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁',
    
    // Objects & Tools
    '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀',
    '📱', '☎️', '📞', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️'
  ];

  // Insert emoji at cursor position
  const insertEmoji = (emoji: string) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const newValue = textBeforeCursor + emoji + textAfterCursor;
    const newCursorPos = cursorPosition + emoji.length;
    
    onChange(newValue);
    setCursorPosition(newCursorPos);
    
    // Set cursor position after emoji
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Check if @astra is mentioned (disable emojis for AI queries)
  const hasAstraMention = value.toLowerCase().includes('@astra');

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  // Close mentions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentionsRef.current && !mentionsRef.current.contains(event.target as Node)) {
        setShowMentions(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        // Only close emoji picker if clicking outside AND not on the emoji button
        const target = event.target as Element;
        const isEmojiButton = target.closest('button')?.querySelector('svg')?.classList.contains('lucide-smile');
        if (!isEmojiButton) {
          setShowEmojiPicker(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      {/* Mentions dropdown */}
      {showMentions && filteredUsers.length > 0 && (
        <div
          ref={mentionsRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50"
        >
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors flex items-center space-x-3 ${
                index === selectedMentionIndex ? 'bg-gray-700' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                user.id === 'astra' 
                  ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
                  : 'bg-gray-600 text-white'
              }`}>
                {user.id === 'astra' ? '🚀' : user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-white text-sm font-medium">{user.name}</div>
                <div className="text-gray-400 text-xs">{user.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && !hasAstraMention && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-4 z-50 max-h-64 overflow-y-auto"
        >
          <div className="grid grid-cols-10 gap-2">
            {commonEmojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => insertEmoji(emoji)}
                className="text-xl hover:bg-gray-700 rounded p-1 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="relative">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full resize-none rounded-2xl border border-gray-600 bg-gray-800 text-white px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-700 disabled:cursor-not-allowed max-h-32 min-h-[72px] text-sm leading-relaxed placeholder-gray-400 ${
              hasAstraMention ? 'pr-16' : 'pr-24'
            }`}
            rows={3}
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#3b82f6 #374151'
            }}
          />
          
          {/* Buttons inside input */}
          <div className="absolute right-2 bottom-2 flex items-center space-x-1">
            {!hasAstraMention && (
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 hover:bg-gray-700 rounded-full transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center touch-manipulation"
              >
                <Smile className="w-4 h-4 text-gray-400" />
              </button>
            )}
            
            <button
              onClick={handleButtonClick}
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
import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Smile, Paperclip, X, Image, Video } from 'lucide-react';

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
  onMediaUpload?: (file: File) => void;
}

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
}
export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = "Type a message... Use @astra for AI Intelligence",
  users = [],
  onMediaUpload
}) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState<MediaFile[]>([]);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionsRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaMenuRef = useRef<HTMLDivElement>(null);

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
      const newValue = `${beforeMention}@${user.name.toLowerCase()} ${textAfterCursor}`;
      const newCursorPos = beforeMention.length + user.name.length + 2;
      
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
    if (value.trim() && !disabled) {
      onSend(value);
      setShowEmojiPicker(false);
    }
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

  // Media upload constants
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/mov', 'video/avi'];

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
      const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

      if (!isImage && !isVideo) {
        alert('Please select a valid image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, MOV, AVI) file.');
        return;
      }

      const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
      if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        alert(`File size must be less than ${maxSizeMB}MB for ${isImage ? 'images' : 'videos'}.`);
        return;
      }

      // Create preview URL
      const preview = URL.createObjectURL(file);
      const mediaFile: MediaFile = {
        file,
        preview,
        type: isImage ? 'image' : 'video'
      };

      setAttachedMedia(prev => [...prev, mediaFile]);
    });

    // Reset file input
    event.target.value = '';
    setShowMediaMenu(false);
  };

  // Remove attached media
  const removeMedia = (index: number) => {
    setAttachedMedia(prev => {
      const newMedia = [...prev];
      URL.revokeObjectURL(newMedia[index].preview);
      newMedia.splice(index, 1);
      return newMedia;
    });
  };

  // Handle media upload
  const handleMediaUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

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
      if (mediaMenuRef.current && !mediaMenuRef.current.contains(event.target as Node)) {
        // Only close media menu if clicking outside AND not on the media button
        const target = event.target as Element;
        const isMediaButton = target.closest('button')?.querySelector('svg')?.classList.contains('lucide-paperclip');
        if (!isMediaButton) {
          setShowMediaMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle form submission with media
  const handleSubmitWithMedia = () => {
    if ((!value.trim() && attachedMedia.length === 0) || disabled) return;

    // If there's media, handle media upload first
    if (attachedMedia.length > 0 && onMediaUpload) {
      attachedMedia.forEach(media => {
        onMediaUpload(media.file);
      });
      // Clear attached media
      attachedMedia.forEach(media => URL.revokeObjectURL(media.preview));
      setAttachedMedia([]);
    }

    // Send text message if there's text
    if (value.trim()) {
      onSend(value);
    }

    setShowEmojiPicker(false);
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      attachedMedia.forEach(media => URL.revokeObjectURL(media.preview));
    };
  }, []);

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(',')}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

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

      {/* Media Menu */}
      {showMediaMenu && (
        <div
          ref={mediaMenuRef}
          className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2 z-50"
        >
          <button
            onClick={handleMediaUpload}
            className="flex items-center space-x-2 w-full text-left px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-white text-sm"
          >
            <Image className="w-4 h-4 text-blue-400" />
            <span>Upload Image</span>
            <span className="text-xs text-gray-400">(Max 10MB)</span>
          </button>
          <button
            onClick={handleMediaUpload}
            className="flex items-center space-x-2 w-full text-left px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-white text-sm"
          >
            <Video className="w-4 h-4 text-purple-400" />
            <span>Upload Video</span>
            <span className="text-xs text-gray-400">(Max 50MB)</span>
          </button>
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

      {/* Media Preview */}
      {attachedMedia.length > 0 && (
        <div className="mb-3 p-3 bg-gray-800 rounded-lg border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300 font-medium">
              Attached Media ({attachedMedia.length})
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {attachedMedia.map((media, index) => (
              <div key={index} className="relative group">
                {media.type === 'image' ? (
                  <img
                    src={media.preview}
                    alt="Preview"
                    className="w-full h-20 object-cover rounded-lg"
                  />
                ) : (
                  <video
                    src={media.preview}
                    className="w-full h-20 object-cover rounded-lg"
                    muted
                  />
                )}
                <button
                  onClick={() => removeMedia(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
                <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                  {media.type === 'image' ? '📷' : '🎥'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full resize-none rounded-2xl border border-gray-600 bg-gray-800 text-white px-4 py-3 pr-12 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-700 disabled:cursor-not-allowed max-h-32 min-h-[48px] text-sm leading-relaxed placeholder-gray-400"
            rows={1}
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#3b82f6 #374151'
            }}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowMediaMenu(!showMediaMenu)}
            className="p-3 hover:bg-gray-700 rounded-full transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center touch-manipulation"
          >
            <Paperclip className="w-5 h-5 text-gray-400" />
          </button>
          
          {!hasAstraMention && (
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-3 hover:bg-gray-700 rounded-full transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center touch-manipulation"
            >
              <Smile className="w-5 h-5 text-gray-400" />
            </button>
          )}
          
          <button
            onClick={handleSubmitWithMedia}
            disabled={disabled || (!value.trim() && attachedMedia.length === 0)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-full p-3 transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed min-h-[48px] min-w-[48px] flex items-center justify-center touch-manipulation"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
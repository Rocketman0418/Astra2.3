import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Smile, X, Image, Video, FileText, Camera } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string, mediaInfo?: Array<{name: string, size: number, type: string, preview: string}>) => void;
  disabled: boolean;
  placeholder?: string;
  users?: User[];
  onMediaUpload?: (file: File) => void;
}

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'pdf';
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
  const MAX_PDF_SIZE = 25 * 1024 * 1024; // 25MB
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/mov', 'video/avi'];
  const ALLOWED_PDF_TYPES = ['application/pdf'];

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
      const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
      const isPDF = ALLOWED_PDF_TYPES.includes(file.type);

      if (!isImage && !isVideo && !isPDF) {
        alert('Please select a valid image, video, or PDF file. See supported formats in the upload menu.');
        return;
      }

      const maxSize = isImage ? MAX_IMAGE_SIZE : isVideo ? MAX_VIDEO_SIZE : MAX_PDF_SIZE;
      if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        const fileType = isImage ? 'images' : isVideo ? 'videos' : 'PDFs';
        alert(`File size must be less than ${maxSizeMB}MB for ${fileType}.`);
        return;
      }

      // Create preview URL
      const preview = URL.createObjectURL(file);
      const mediaFile: MediaFile = {
        file,
        preview,
        type: isImage ? 'image' : isVideo ? 'video' : 'pdf'
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
    if (disabled) {
      return;
    }

    // Don't send if both text and media are empty
    if (!value.trim() && attachedMedia.length === 0) {
      return;
    }

    console.log('Sending message with:', { text: value.trim(), mediaCount: attachedMedia.length });
    
    // Always send together - both text and media info
    const mediaInfo = attachedMedia.map(media => ({
      name: media.file.name,
      size: media.file.size,
      type: media.type,
      preview: media.preview
    }));
    
    // Send the message with media info
    onSend(value.trim(), mediaInfo);
    
    // Clear everything after sending
    onChange('');
    attachedMedia.forEach(media => URL.revokeObjectURL(media.preview));
    setAttachedMedia([]);
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
        accept={[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_PDF_TYPES].join(',')}
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
          className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2 z-50 min-w-64"
        >
          <div className="px-3 py-2 border-b border-gray-600 mb-2">
            <h4 className="text-white text-sm font-medium mb-1">Upload Media</h4>
            <p className="text-gray-400 text-xs">Supported file types:</p>
          </div>
          
          <button
            onClick={handleMediaUpload}
            className="flex items-center space-x-3 w-full text-left px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-white text-sm mb-1"
          >
            <Camera className="w-4 h-4 text-blue-400" />
            <div className="flex-1">
              <div className="font-medium">Photos & Screenshots</div>
              <div className="text-xs text-gray-400">JPEG, PNG, GIF, WebP, BMP, TIFF (Max 10MB)</div>
            </div>
          </button>
          
          <button
            onClick={handleMediaUpload}
            className="flex items-center space-x-3 w-full text-left px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-white text-sm mb-1"
          >
            <Video className="w-4 h-4 text-purple-400" />
            <div className="flex-1">
              <div className="font-medium">Videos</div>
              <div className="text-xs text-gray-400">MP4, WebM, MOV, AVI (Max 50MB)</div>
            </div>
          </button>
          
          <button
            onClick={handleMediaUpload}
            className="flex items-center space-x-3 w-full text-left px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-white text-sm"
          >
            <FileText className="w-4 h-4 text-green-400" />
            <div className="flex-1">
              <div className="font-medium">PDF Documents</div>
              <div className="text-xs text-gray-400">PDF files (Max 25MB)</div>
            </div>
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
        <div className="mb-3 p-4 bg-gray-800 rounded-lg border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300 font-medium">
              Attached Media ({attachedMedia.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {attachedMedia.map((media, index) => (
              <div key={index} className="relative group">
                <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                  {media.type === 'image' ? (
                    <div className="flex items-center space-x-3">
                      <img
                        src={media.preview}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {media.file.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          Image • {(media.file.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                  ) : media.type === 'video' ? (
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Video className="w-6 h-6 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {media.file.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          Video • {(media.file.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {media.file.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          PDF • {(media.file.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => removeMedia(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
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
            title="Upload media files"
          >
            <Image className="w-5 h-5 text-gray-400" />
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
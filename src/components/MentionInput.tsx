import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { uploadFile } from '../lib/storage';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Type a message..."
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (disabled || isUploading || (!value.trim() && selectedFiles.length === 0)) {
      return;
    }

    let messageContent = value;

    // Upload files if any are selected
    if (selectedFiles.length > 0) {
      setIsUploading(true);
      try {
        const uploadPromises = selectedFiles.map(file => uploadFile(file));
        const uploadResults = await Promise.all(uploadPromises);
        
        // Check for upload errors
        const failedUploads = uploadResults.filter(result => result.error);
        if (failedUploads.length > 0) {
          console.error('Some uploads failed:', failedUploads);
          alert(`Failed to upload ${failedUploads.length} file(s). Please try again.`);
          setIsUploading(false);
          return;
        }
        
        // Add file references to message content with Supabase URLs
        const fileReferences = uploadResults.map((result, index) => {
          const file = selectedFiles[index];
          const emoji = file.type.startsWith('image/') ? '🖼️' : 
                       file.type.startsWith('video/') ? '🎥' : '📄';
          return `[${emoji} ${file.name}|||${result.url}]`;
        }).join(' ');
        
        messageContent = fileReferences + (value.trim() ? '\n' + value : '');
      } catch (error) {
        console.error('Failed to upload files:', error);
        alert('Failed to upload files. Please try again.');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    // Update the message content with file references
    onChange(messageContent);
    
    // Clear selected files
    setSelectedFiles([]);
    
    // Send the message
    onSend();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="border-t border-gray-700 bg-gray-800 p-4">
      {/* File previews */}
      {selectedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center space-x-2 bg-gray-700 rounded-lg px-3 py-2">
              <span className="text-sm">
                {file.type.startsWith('image/') ? '🖼️' : 
                 file.type.startsWith('video/') ? '🎥' : '📄'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{file.name}</div>
                <div className="text-xs text-gray-400">{formatFileSize(file.size)}</div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end space-x-3">
        {/* Message input */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || isUploading}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
            style={{ maxHeight: '120px' }}
          />
        </div>

        {/* File attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="flex-shrink-0 p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Emoji button placeholder */}
        <button
          disabled={disabled || isUploading}
          className="flex-shrink-0 p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-xl">😊</span>
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || isUploading || (!value.trim() && selectedFiles.length === 0)}
          className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-colors flex items-center justify-center"
        >
          {isUploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};
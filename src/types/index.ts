export interface Message {
  id: string;
  chatId?: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isExpanded?: boolean;
  visualization?: string;
  isCentered?: boolean;
}

export interface VisualizationState {
  messageId: string;
  isGenerating: boolean;
  content: string | null;
  isVisible: boolean;
}

export interface GroupMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  message_content: string;
  message_type: 'user' | 'astra' | 'system';
  mentions: string[];
  astra_prompt?: string | null;
  visualization_data?: string | null;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export type ChatMode = 'private' | 'team';
import { useState, useCallback, useEffect } from 'react';
import { supabase, Database } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

type ChatRow = Database['public']['Tables']['astra_chats']['Row'];
type ChatInsert = Database['public']['Tables']['astra_chats']['Insert'];

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  createdAt: string;
  messageCount: number;
}

export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  createdAt: string;
  visualization?: boolean;
  visualizationData?: string;
  metadata?: any;
}

export const useChats = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string | null } | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [visualizationStates, setVisualizationStates] = useState<Record<string, any>>({});

  // Fetch user profile data from public.users table
  const fetchUserProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      setUserProfile(data);
    } catch (err) {
      console.error('Error in fetchUserProfile:', err);
    }
  }, [user]);

  // Fetch user profile when user changes
  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user, fetchUserProfile]);

  // Fetch user's conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('astra_chats')
        .select('conversation_id, message, message_type, created_at')
        .eq('user_id', user.id)
        .eq('mode', 'private')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        setError('Failed to load conversations');
        return;
      }

      // Group messages by conversation_id
      const conversationMap = new Map<string, {
        messages: ChatRow[];
        firstMessage: ChatRow;
        lastMessage: ChatRow;
      }>();

      data.forEach((chat) => {
        const convId = chat.conversation_id || 'default';
        if (!conversationMap.has(convId)) {
          conversationMap.set(convId, {
            messages: [],
            firstMessage: chat,
            lastMessage: chat,
          });
        }
        const conv = conversationMap.get(convId)!;
        conv.messages.push(chat);
        
        // Update first and last messages
        if (new Date(chat.created_at) < new Date(conv.firstMessage.created_at)) {
          conv.firstMessage = chat;
        }
        if (new Date(chat.created_at) > new Date(conv.lastMessage.created_at)) {
          conv.lastMessage = chat;
        }
      });

      // Convert to conversation list
      const conversationList: Conversation[] = Array.from(conversationMap.entries()).map(
        ([id, { messages, firstMessage, lastMessage }]) => ({
          id,
          title: firstMessage.message.length > 50 
            ? firstMessage.message.substring(0, 50) + '...'
            : firstMessage.message,
          lastMessage: lastMessage.message.length > 100
            ? lastMessage.message.substring(0, 100) + '...'
            : lastMessage.message,
          createdAt: firstMessage.created_at,
          messageCount: messages.length,
        })
      );

      // Sort by creation date (newest first)
      conversationList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setConversations(conversationList);
    } catch (err) {
      console.error('Error in fetchConversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Generate a new conversation ID
  const createNewConversation = useCallback(() => {
    const newConversationId = uuidv4();
    setCurrentConversationId(newConversationId);
    setCurrentMessages([]);
    return newConversationId;
  }, []);

  // Log a chat message to the database
  const logChatMessage = useCallback(async (
    message: string,
    isUser: boolean,
    conversationId?: string,
    responseTimeMs?: number,
    tokensUsed?: any,
    modelUsed?: string,
    metadata?: any,
    visualization?: boolean,
    mode?: 'private' | 'team',
    mentions?: string[],
    astraPrompt?: string,
    visualizationData?: string
  ): Promise<string | null> => {
    if (!user) return null;

    try {
      const chatConversationId = conversationId || currentConversationId || createNewConversation();
      
      // Get user name from the users table, with fallbacks
      const userName = userProfile?.name || 
                      user.email?.split('@')[0] || 
                      'Unknown User';
      
      const userEmail = isUser ? (user.email || '') : 'astra@rockethub.ai';
      const displayName = isUser ? userName : 'Astra';
      const messageType = isUser ? 'user' : 'astra';
      
      const chatData: ChatInsert = {
        user_id: user.id,
        user_email: userEmail,
        user_name: displayName,
        message,
        message_type: messageType,
        conversation_id: chatConversationId,
        response_time_ms: responseTimeMs || 0,
        tokens_used: tokensUsed || {},
        model_used: modelUsed || 'n8n-workflow',
        metadata: metadata || {},
        visualization: visualization || false,
        mode: mode || 'private',
        mentions: mentions || [],
        astra_prompt: astraPrompt,
        visualization_data: visualizationData
      };

      const { data, error } = await supabase
        .from('astra_chats')
        .insert(chatData)
        .select()
        .single();

      if (error) {
        console.error('Error logging chat message:', error);
        setError('Failed to save chat message');
        return null;
      }

      // Update current messages if this is for the active conversation
      if (chatConversationId === currentConversationId) {
        const newMessage: ChatMessage = {
          id: data.id,
          message: data.message,
          isUser: data.message_type === 'user',
          createdAt: data.created_at,
        };
        setCurrentMessages(prev => [...prev, newMessage]);
      }

      // Refresh conversations list
      await fetchConversations();

      return data.id; // Return the actual chat message ID for visualization tracking
    } catch (err) {
      console.error('Error in logChatMessage:', err);
      setError('Failed to save chat message');
      return null;
    }
  }, [user, userProfile, fetchConversations]);

  // Load a specific conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!user) return;

    // Don't reload if it's already the current conversation
    if (conversationId === currentConversationId && currentMessages.length > 0) {
      return;
    }
    try {
      setLoading(true);
      
      // Clear current messages first to show loading state
      setCurrentMessages([]);
      setCurrentConversationId(conversationId);
      
      const { data, error } = await supabase
        .from('astra_chats')
        .select('id, message, message_type, created_at, visualization, visualization_data, metadata')
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId)
        .eq('mode', 'private')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading conversation:', error);
        setError('Failed to load conversation');
        return;
      }

      const messages: ChatMessage[] = data.map(chat => ({
        id: chat.id,
        message: chat.message,
        isUser: chat.message_type === 'user',
        createdAt: chat.created_at,
        visualization: chat.visualization || false,
        visualizationData: chat.visualization_data,
        metadata: chat.metadata || {},
      }));

      setCurrentMessages(messages);
      
      setLoading(false);
    } catch (err) {
      console.error('Error in loadConversation:', err);
      setError('Failed to load conversation');
      setLoading(false);
    }
  }, [user, currentConversationId, currentMessages.length]);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('astra_chats')
        .delete()
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId);

      if (error) {
        console.error('Error deleting conversation:', error);
        setError('Failed to delete conversation');
        return;
      }

      // If we deleted the current conversation, start a new one
      if (conversationId === currentConversationId) {
        createNewConversation();
      }

      // Refresh conversations list
      await fetchConversations();
    } catch (err) {
      console.error('Error in deleteConversation:', err);
      setError('Failed to delete conversation');
    }
  }, [user, currentConversationId, createNewConversation, fetchConversations]);

  // Create a new conversation and clear current messages
  const startNewConversation = useCallback(() => {
    const newConversationId = uuidv4();
    setCurrentConversationId(newConversationId);
    setCurrentMessages([]);
    return newConversationId;
  }, []);
  // Update visualization status for a chat message
  const updateVisualizationStatus = useCallback(async (messageId: string, hasVisualization: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('astra_chats')
        .update({ visualization: hasVisualization })
        .eq('id', messageId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating visualization status:', error);
        return;
      }

      console.log('✅ Updated visualization status for message:', messageId, hasVisualization);
    } catch (err) {
      console.error('Error in updateVisualizationStatus:', err);
    }
  }, [user]);

  // Get visualization state for a message
  const getVisualizationState = useCallback((messageId: string) => {
    // First check if we have it in local state
    const localState = visualizationStates[messageId];
    if (localState) {
      return localState;
    }

    // Then check if we can get it from current messages (database state)
    const message = currentMessages.find(m => m.id === messageId);
    if (message) {
      // Check if visualization is being generated
      if (message.metadata?.visualization_generating) {
        return {
          isGenerating: true,
          content: null,
          hasVisualization: false
        };
      }
      
      // Check if visualization exists
      if (message.visualizationData) {
        return {
          isGenerating: false,
          content: message.visualizationData,
          hasVisualization: true
        };
      }
      
      // Check if visualization flag is set but no data (might be generating)
      if (message.visualization && !message.visualizationData) {
        return {
          isGenerating: true,
          content: null,
          hasVisualization: false
        };
      }
    }

    return null;
  }, [visualizationStates]);

  // Update visualization state
  const updateVisualizationState = useCallback((messageId: string, state: any) => {
    console.log('🔧 useChats: Updating visualization state for messageId:', messageId, 'state:', state);
    setVisualizationStates(prev => ({
      ...prev,
      [messageId]: state
    }));
  }, []);

  // Update visualization data in database
  const updateVisualizationData = useCallback(async (messageId: string, visualizationData: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('astra_chats')
        .update({ 
          visualization_data: visualizationData,
          visualization: true 
        })
        .eq('id', messageId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating visualization data:', error);
        return;
      }

      console.log('✅ Updated visualization data for message:', messageId);
      
      // Update local state to reflect database change
      setVisualizationStates(prev => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          content: visualizationData,
          hasVisualization: true,
          isGenerating: false
        }
      }));
    } catch (err) {
      console.error('Error in updateVisualizationData:', err);
    }
  }, [user]);
  // Initialize conversations when user logs in
  useEffect(() => {
    if (user) {
      fetchConversations();
      setHasInitialized(true);
    }
  }, [user, fetchConversations]);

  return {
    conversations,
    currentConversationId,
    currentMessages,
    loading,
    error,
    logChatMessage,
    fetchConversations,
    loadConversation,
    deleteConversation,
    createNewConversation,
    startNewConversation,
    updateVisualizationStatus,
    getVisualizationState,
    updateVisualizationState,
    updateVisualizationData,
    setError,
    hasInitialized,
  };
};
import { useState, useCallback, useEffect } from 'react';
import { supabase, Database } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { GroupMessage } from '../types';

type GroupMessageRow = Database['public']['Tables']['group_messages']['Row'];
type GroupMessageInsert = Database['public']['Tables']['group_messages']['Insert'];

const WEBHOOK_URL = 'https://healthrocket.app.n8n.cloud/webhook/8ec404be-7f51-47c8-8faf-0d139bd4c5e9/chat';

export const useGroupChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAstraThinking, setIsAstraThinking] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Parse @mentions from message content
  const parseMentions = useCallback((message: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(message)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  }, []);

  // Get user's display name
  const getUserName = useCallback(async (): Promise<string> => {
    if (!user) return 'Unknown User';

    try {
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      if (error || !data?.name) {
        return user.email?.split('@')[0] || 'Unknown User';
      }

      return data.name;
    } catch (err) {
      return user.email?.split('@')[0] || 'Unknown User';
    }
  }, [user]);

  // Send a group message
  const sendMessage = useCallback(async (content: string) => {
    if (!user || !content.trim()) return;

    const mentions = parseMentions(content);
    const userName = await getUserName();
    const isAstraMention = mentions.includes('astra');

    try {
      // Log user message to astra_chats
      const userMessageId = await logChatMessage(
        content.trim(),
        'User message in team chat',
        null, // No conversation ID for team chat
        0, // No response time for user messages
        {}, // No tokens used
        null, // No model used for user messages
        [], // No tools used
        { 
          mentions: mentions,
          team_chat: true,
          message_type: 'user'
        },
        false, // No visualization
        'team' // Team mode
      );

      // If @astra was mentioned, get AI response
      if (isAstraMention) {
        setIsAstraThinking(true);
        
        try {
          // Extract the prompt after @astra
          const astraPrompt = content.replace(/@astra\s*/i, '').trim();
          
          const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chatInput: astraPrompt })
          });

          const requestEndTime = Date.now();
          if (!response.ok) {
            throw new Error('Failed to get Astra response');
          }

          const responseText = await response.text();
          let astraResponse = responseText;
          
          // Try to parse JSON response
          try {
            const jsonResponse = JSON.parse(responseText);
            if (jsonResponse.output) {
              astraResponse = jsonResponse.output;
            }
          } catch (e) {
            // Use raw text if not JSON
          }

          // Log Astra's response to astra_chats table
          const astraMessageId = await logChatMessage(
            astraPrompt,
            astraResponse,
            null, // No conversation ID for team chat
            requestEndTime - Date.now(), // Response time
            {}, // Tokens used - could be extracted from response
            'n8n-workflow', // Model used
            [], // Tools used
            { 
              team_chat: true,
              message_type: 'astra',
              asked_by_user_name: userName,
              original_user_message_id: userMessageId,
              astra_prompt: astraPrompt
            },
            false, // Visualization
            'team' // Mode
          );
        } catch (err) {
          console.error('Error getting Astra response:', err);
          
          // Log error response to astra_chats table
          await logChatMessage(
            content.replace(/@astra\s*/i, '').trim(),
            "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
            null, // No conversation ID for team chat
            0, // No response time for errors
            {}, // No tokens used
            'n8n-workflow', // Model used
            [], // No tools used
            { 
              team_chat: true,
              message_type: 'astra',
              asked_by_user_name: userName,
              original_user_message_id: userMessageId,
              error: true,
              astra_prompt: content.replace(/@astra\s*/i, '').trim()
            },
            false, // Visualization
            'team' // Mode
          );
        } finally {
          setIsAstraThinking(false);
        }
      }
      
      // Refresh messages from database to show the new entries
      await fetchMessages();
    } catch (err) {
      console.error('Error in sendMessage:', err);
      setError('Failed to send message');
    }
  }, [user, parseMentions, getUserName]);

  // Fetch message history
  const fetchMessages = useCallback(async (limit: number = 50) => {
    try {
      setLoading(true);
      
      // Fetch from astra_chats table where mode = 'team'
      const { data, error } = await supabase
        .from('astra_chats')
        .select(`
          id,
          user_id,
          user_name,
          user_email,
          prompt,
          response,
          message_type,
          mentions,
          astra_prompt,
          visualization_data,
          metadata,
          created_at,
          updated_at,
          is_team_response
        `)
        .eq('mode', 'team')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages');
        return;
      }

      // Transform astra_chats data to GroupMessage format
      const transformedMessages: GroupMessage[] = (data || []).map(chat => ({
        id: chat.id,
        user_id: chat.user_id,
        user_name: chat.user_name,
        user_email: chat.user_email,
        message_content: chat.message,
        message_type: chat.message_type as 'user' | 'astra' | 'system',
        mentions: chat.mentions || [],
        astra_prompt: chat.astra_prompt,
        visualization_data: chat.visualization_data,
        metadata: chat.metadata || {},
        created_at: chat.created_at,
        updated_at: chat.updated_at
      }));

      setMessages(transformedMessages);
    } catch (err) {
      console.error('Error in fetchMessages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  // Search messages
  const searchMessages = useCallback(async (query: string): Promise<GroupMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('astra_chats')
        .select(`
          id,
          user_id,
          user_name,
          user_email,
          prompt,
          response,
          message_type,
          mentions,
          astra_prompt,
          visualization_data,
          metadata,
          created_at,
          updated_at,
          is_team_response
        `)
        .eq('mode', 'team')
        .or(`prompt.ilike.%${query}%,response.ilike.%${query}%,user_name.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error searching messages:', error);
        return [];
      }

      // Transform astra_chats data to GroupMessage format
      const transformedMessages: GroupMessage[] = (data || []).map(chat => ({
        id: chat.id,
        user_id: chat.user_id,
        user_name: chat.user_name,
        user_email: chat.user_email,
        message_content: chat.is_team_response ? chat.response : chat.prompt,
        message_type: chat.message_type as 'user' | 'astra' | 'system',
        mentions: chat.mentions || [],
        astra_prompt: chat.astra_prompt,
        visualization_data: chat.visualization_data,
        metadata: chat.metadata || {},
        created_at: chat.created_at,
        updated_at: chat.updated_at
      }));

      return transformedMessages;
    } catch (err) {
      console.error('Error in searchMessages:', err);
      return [];
    }
  }, []);

  // Update visualization data for a message
  const updateVisualizationData = useCallback(async (messageId: string, visualizationData: string) => {
    try {
      const { error } = await supabase
        .from('astra_chats')
        .update({ visualization_data: visualizationData })
        .eq('id', messageId);

      if (error) {
        console.error('Error updating visualization data:', error);
        return;
      }

      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, visualization_data: visualizationData }
          : msg
      ));
    } catch (err) {
      console.error('Error in updateVisualizationData:', err);
    }
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('astra_chats_team')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'astra_chats',
        filter: 'mode=eq.team'
      }, (payload) => {
        const newChat = payload.new as any;
        // Transform and add new message
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.id === newChat.id);
          if (messageExists) {
            return prev;
          }
          
          const transformedMessage: GroupMessage = {
            id: newChat.id,
            user_id: newChat.user_id,
            user_name: newChat.user_name,
            user_email: newChat.user_email,
            message_content: newChat.is_team_response ? newChat.response : newChat.prompt,
            message_type: newChat.message_type,
            mentions: newChat.mentions || [],
            astra_prompt: newChat.astra_prompt,
            visualization_data: newChat.visualization_data,
            metadata: newChat.metadata || {},
            created_at: newChat.created_at,
            updated_at: newChat.updated_at
          };
          
          return [...prev, transformedMessage];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Load initial messages
  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user, fetchMessages]);

  return {
    messages,
    loading,
    error,
    isAstraThinking,
    typingUsers,
    sendMessage,
    fetchMessages,
    searchMessages,
    updateVisualizationData,
    setError,
  };
};
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
      // Insert user message
      const messageData: GroupMessageInsert = {
        user_id: user.id,
        user_name: userName,
        user_email: user.email || '',
        message_content: content.trim(),
        message_type: 'user',
        mentions: mentions,
      };

      const { data, error } = await supabase
        .from('group_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        setError('Failed to send message');
        return;
      }

      // Immediately add the message to local state for instant UI update
      setMessages(prev => [...prev, data]);

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

          // Insert Astra's response
          const astraMessageData: GroupMessageInsert = {
            user_id: user.id,
            user_name: 'Astra',
            user_email: 'astra@rockethub.com',
            message_content: astraResponse,
            message_type: 'astra',
            mentions: [],
            astra_prompt: astraPrompt,
            // Store the original user's name who asked the question in metadata
            metadata: { asked_by_user_name: userName }
          };

          const { data: astraData, error: astraError } = await supabase
            .from('group_messages')
            .insert(astraMessageData)
            .select()
            .single();

          if (astraError) {
            console.error('Error sending Astra response:', astraError);
          } else if (astraData) {
            // Immediately add Astra's response to local state
            setMessages(prev => [...prev, astraData]);
          }
        } catch (err) {
          console.error('Error getting Astra response:', err);
          
          // Send error message
          const errorMessageData: GroupMessageInsert = {
            user_id: user.id,
            user_name: 'Astra',
            user_email: 'astra@rockethub.com',
            message_content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
            message_type: 'astra',
            mentions: [],
            astra_prompt: content.replace(/@astra\s*/i, '').trim(),
          };

          const { data: errorData } = await supabase
            .from('group_messages')
            .insert(errorMessageData)
            .select()
            .single();

          if (errorData) {
            // Immediately add error message to local state
            setMessages(prev => [...prev, errorData]);
          }
        } finally {
          setIsAstraThinking(false);
        }
      }
    } catch (err) {
      console.error('Error in sendMessage:', err);
      setError('Failed to send message');
    }
  }, [user, parseMentions, getUserName]);

  // Fetch message history
  const fetchMessages = useCallback(async (limit: number = 50) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('group_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages');
        return;
      }

      setMessages(data || []);
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
        .from('group_messages')
        .select('*')
        .or(`message_content.ilike.%${query}%,user_name.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error searching messages:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error in searchMessages:', err);
      return [];
    }
  }, []);

  // Update visualization data for a message
  const updateVisualizationData = useCallback(async (messageId: string, visualizationData: string) => {
    try {
      const { error } = await supabase
        .from('group_messages')
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
      .channel('group_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages'
      }, (payload) => {
        const newMessage = payload.new as GroupMessageRow;
        // Only add message if it's not already in our local state
        // (to avoid duplicates from our own messages)
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.id === newMessage.id);
          if (messageExists) {
            return prev;
          }
          return [...prev, newMessage];
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
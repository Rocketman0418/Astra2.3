import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface NotificationState {
  unreadCount: number;
  lastSeenMessageId: string | null;
  mentions: Array<{
    id: string;
    message: string;
    userName: string;
    timestamp: string;
  }>;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationState>({
    unreadCount: 0,
    lastSeenMessageId: null,
    mentions: []
  });
  const [isTabActive, setIsTabActive] = useState(true);

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    const handleFocus = () => setIsTabActive(true);
    const handleBlur = () => setIsTabActive(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Get user's display name for mention detection
  const getUserDisplayName = useCallback(async (): Promise<string> => {
    if (!user) return '';

    try {
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      if (error || !data?.name) {
        return user.email?.split('@')[0] || '';
      }

      return data.name;
    } catch (err) {
      return user.email?.split('@')[0] || '';
    }
  }, [user]);

  // Check if user is mentioned in a message
  const checkForMentions = useCallback(async (message: string, messageId: string, senderName: string, timestamp: string): Promise<boolean> => {
    if (!user) return false;

    const userDisplayName = await getUserDisplayName();
    const userEmail = user.email?.split('@')[0] || '';
    
    // Check for various mention formats
    const mentionPatterns = [
      new RegExp(`@${userDisplayName}\\b`, 'i'),
      new RegExp(`@${userEmail}\\b`, 'i'),
      new RegExp(`@${user.email}\\b`, 'i')
    ];

    const isMentioned = mentionPatterns.some(pattern => pattern.test(message));
    
    if (isMentioned) {
      setNotifications(prev => ({
        ...prev,
        mentions: [
          {
            id: messageId,
            message: message.length > 100 ? message.substring(0, 100) + '...' : message,
            userName: senderName,
            timestamp
          },
          ...prev.mentions.slice(0, 9) // Keep only last 10 mentions
        ]
      }));

      // Show browser notification if tab is not active
      if (!isTabActive && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`${senderName} mentioned you in team chat`, {
          body: message.length > 100 ? message.substring(0, 100) + '...' : message,
          icon: '/RocketHub Favicon.png',
          tag: 'team-chat-mention'
        });
      }
    }

    return isMentioned;
  }, [user, getUserDisplayName, isTabActive]);

  // Load last seen message from localStorage
  useEffect(() => {
    if (!user) return;

    const lastSeenKey = `astra-last-seen-${user.id}`;
    const lastSeen = localStorage.getItem(lastSeenKey);
    
    if (lastSeen) {
      setNotifications(prev => ({
        ...prev,
        lastSeenMessageId: lastSeen
      }));
    }
  }, [user]);

  // Calculate unread count
  const updateUnreadCount = useCallback(async () => {
    if (!user || !notifications.lastSeenMessageId) return;

    try {
      // First, get the timestamp of the last seen message
      const { data: lastSeenMessage, error: timestampError } = await supabase
        .from('astra_chats')
        .select('created_at')
        .eq('id', notifications.lastSeenMessageId)
        .single();

      if (timestampError || !lastSeenMessage) {
        console.error('Error getting last seen message timestamp:', timestampError);
        return;
      }

      // Now count messages created after that timestamp
      const { count, error } = await supabase
        .from('astra_chats')
        .select('*', { count: 'exact', head: true })
        .eq('mode', 'team')
        .gt('created_at', lastSeenMessage.created_at);

      if (error) {
        console.error('Error counting unread messages:', error);
        return;
      }

      setNotifications(prev => ({
        ...prev,
        unreadCount: count || 0
      }));
    } catch (err) {
      console.error('Error in updateUnreadCount:', err);
    }
  }, [user, notifications.lastSeenMessageId]);

  // Mark messages as seen
  const markAsSeen = useCallback(async (messageId?: string) => {
    if (!user) return;

    let lastSeenId = messageId;
    
    // If no specific message ID provided, get the latest message
    if (!lastSeenId) {
      try {
        const { data, error } = await supabase
          .from('astra_chats')
          .select('id')
          .eq('mode', 'team')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error || !data) return;
        lastSeenId = data.id;
      } catch (err) {
        console.error('Error getting latest message:', err);
        return;
      }
    }

    // Save to localStorage
    const lastSeenKey = `astra-last-seen-${user.id}`;
    localStorage.setItem(lastSeenKey, lastSeenId);

    // Update state
    setNotifications(prev => ({
      ...prev,
      lastSeenMessageId: lastSeenId,
      unreadCount: 0
    }));

    console.log('✅ Marked messages as seen up to:', lastSeenId);
  }, [user]);

  // Clear mentions
  const clearMentions = useCallback(() => {
    setNotifications(prev => ({
      ...prev,
      mentions: []
    }));
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('team_chat_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'astra_chats',
        filter: 'mode=eq.team'
      }, async (payload) => {
        const newMessage = payload.new as any;
        
        // Skip if it's the current user's message
        if (newMessage.user_id === user.id) return;

        // Check for mentions
        await checkForMentions(
          newMessage.message,
          newMessage.id,
          newMessage.user_name,
          newMessage.created_at
        );

        // Update unread count if user hasn't seen this message
        if (notifications.lastSeenMessageId) {
          const messageTime = new Date(newMessage.created_at);
          const lastSeenTime = new Date(notifications.lastSeenMessageId);
          
          if (messageTime > lastSeenTime) {
            setNotifications(prev => ({
              ...prev,
              unreadCount: prev.unreadCount + 1
            }));
          }
        } else {
          // No last seen message, increment count
          setNotifications(prev => ({
            ...prev,
            unreadCount: prev.unreadCount + 1
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, checkForMentions, notifications.lastSeenMessageId]);

  // Update unread count when lastSeenMessageId changes
  useEffect(() => {
    if (notifications.lastSeenMessageId) {
      updateUnreadCount();
    }
  }, [notifications.lastSeenMessageId, updateUnreadCount]);

  return {
    notifications,
    markAsSeen,
    clearMentions,
    requestNotificationPermission,
    isTabActive
  };
};
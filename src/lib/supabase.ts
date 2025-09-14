import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export type Database = {
  public: {
    Tables: {
      astra_chats: {
        Row: {
          id: string;
          user_id: string;
          user_email: string;
          user_name: string;
          prompt: string;
          response: string;
          conversation_id: string | null;
          session_id: string | null;
          visualization: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_email: string;
          user_name: string;
          prompt: string;
          response: string;
          conversation_id?: string | null;
          session_id?: string | null;
          visualization?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_email?: string;
          user_name?: string;
          prompt?: string;
          response?: string;
          conversation_id?: string | null;
          session_id?: string | null;
          visualization?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      group_messages: {
        Row: {
          id: string;
          user_id: string;
          user_name: string;
          user_email: string;
          message_content: string;
          message_type: string;
          mentions: any[];
          astra_prompt: string | null;
          visualization_data: string | null;
          metadata: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_name: string;
          user_email: string;
          message_content: string;
          message_type?: string;
          mentions?: any[];
          astra_prompt?: string | null;
          visualization_data?: string | null;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_name?: string;
          user_email?: string;
          message_content?: string;
          message_type?: string;
          mentions?: any[];
          astra_prompt?: string | null;
          visualization_data?: string | null;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
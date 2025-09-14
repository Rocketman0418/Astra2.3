/*
  # Create group_messages table for team chat functionality

  1. New Tables
    - `group_messages`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `user_name` (text, user's display name)
      - `user_email` (text, user's email)
      - `message_content` (text, the actual message)
      - `message_type` (text, 'user', 'astra', or 'system')
      - `mentions` (jsonb, array of mentioned usernames/emails)
      - `astra_prompt` (text, original prompt when message_type = 'astra')
      - `visualization_data` (text, Astra visualization content)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `group_messages` table
    - Add policy for authenticated users to read all messages
    - Add policy for users to insert their own messages

  3. Indexes
    - Add indexes for better query performance on common searches
*/

CREATE TABLE IF NOT EXISTS public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  user_email text NOT NULL,
  message_content text NOT NULL,
  message_type text NOT NULL DEFAULT 'user',
  mentions jsonb NULL DEFAULT '[]'::jsonb,
  astra_prompt text NULL,
  visualization_data text NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT group_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can read all messages
CREATE POLICY "Authenticated users can read all group messages" 
  ON public.group_messages
  FOR SELECT 
  TO authenticated
  USING (true);

-- RLS Policy: Users can insert their own messages
CREATE POLICY "Users can insert their own messages" 
  ON public.group_messages
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON public.group_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_user_id ON public.group_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_message_type ON public.group_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_group_messages_mentions ON public.group_messages USING GIN(mentions);

-- Add comments for documentation
COMMENT ON TABLE public.group_messages IS 'Stores all group chat messages for team collaboration';
COMMENT ON COLUMN public.group_messages.message_type IS 'Type of message: user, astra, or system';
COMMENT ON COLUMN public.group_messages.mentions IS 'Array of mentioned usernames/emails in JSON format';
COMMENT ON COLUMN public.group_messages.astra_prompt IS 'Original user prompt when message_type is astra';
COMMENT ON COLUMN public.group_messages.visualization_data IS 'HTML content for Astra visualizations';
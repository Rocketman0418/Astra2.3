/*
  # Unify chat tables - Move all messages to astra_chats

  1. Schema Updates
    - Add team chat specific columns to astra_chats
    - Add mentions support
    - Add message_type field
    - Add visualization_data field

  2. Data Migration
    - Copy all group_messages data to astra_chats
    - Maintain relationships and metadata

  3. Indexes
    - Add indexes for team chat queries
    - Optimize for both private and team chat access patterns
*/

-- Add new columns to astra_chats for team chat support
ALTER TABLE astra_chats 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'user' CHECK (message_type IN ('user', 'astra', 'system')),
ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS astra_prompt TEXT,
ADD COLUMN IF NOT EXISTS visualization_data TEXT,
ADD COLUMN IF NOT EXISTS is_team_response BOOLEAN DEFAULT false;

-- Update the mode check constraint to ensure it includes both values
ALTER TABLE astra_chats DROP CONSTRAINT IF EXISTS astra_chats_mode_check;
ALTER TABLE astra_chats ADD CONSTRAINT astra_chats_mode_check 
CHECK (mode IN ('private', 'team'));

-- Create indexes for team chat queries
CREATE INDEX IF NOT EXISTS idx_astra_chats_mode ON astra_chats(mode);
CREATE INDEX IF NOT EXISTS idx_astra_chats_message_type ON astra_chats(message_type);
CREATE INDEX IF NOT EXISTS idx_astra_chats_mentions ON astra_chats USING gin(mentions);
CREATE INDEX IF NOT EXISTS idx_astra_chats_team_created_at ON astra_chats(created_at DESC) WHERE mode = 'team';
CREATE INDEX IF NOT EXISTS idx_astra_chats_visualization_data ON astra_chats(id) WHERE visualization_data IS NOT NULL;

-- Migrate data from group_messages to astra_chats
INSERT INTO astra_chats (
  user_id,
  user_email, 
  user_name,
  prompt,
  response,
  conversation_id,
  session_id,
  response_time_ms,
  tokens_used,
  model_used,
  tools_used,
  metadata,
  created_at,
  updated_at,
  visualization,
  mode,
  message_type,
  mentions,
  astra_prompt,
  visualization_data,
  is_team_response
)
SELECT 
  user_id,
  user_email,
  user_name,
  CASE 
    WHEN message_type = 'astra' THEN COALESCE(astra_prompt, 'Team chat response')
    ELSE message_content 
  END as prompt,
  CASE 
    WHEN message_type = 'astra' THEN message_content
    ELSE 'User message in team chat'
  END as response,
  NULL as conversation_id, -- Team chat doesn't use conversation_id
  user_id as session_id,
  0 as response_time_ms,
  '{}'::jsonb as tokens_used,
  CASE WHEN message_type = 'astra' THEN 'n8n-workflow' ELSE NULL END as model_used,
  NULL as tools_used,
  COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('original_group_message_id', id) as metadata,
  created_at,
  updated_at,
  CASE WHEN visualization_data IS NOT NULL THEN true ELSE false END as visualization,
  'team' as mode,
  message_type,
  mentions,
  astra_prompt,
  visualization_data,
  CASE WHEN message_type = 'astra' THEN true ELSE false END as is_team_response
FROM group_messages
ON CONFLICT DO NOTHING;

-- Add comment explaining the unified structure
COMMENT ON TABLE astra_chats IS 'Unified table for all chat messages - both private and team chat modes';
COMMENT ON COLUMN astra_chats.mode IS 'Chat mode: private or team';
COMMENT ON COLUMN astra_chats.message_type IS 'Type of message: user, astra, or system';
COMMENT ON COLUMN astra_chats.mentions IS 'Array of mentioned users in team chat';
COMMENT ON COLUMN astra_chats.astra_prompt IS 'Original user prompt for Astra responses in team chat';
COMMENT ON COLUMN astra_chats.visualization_data IS 'HTML content for visualizations';
COMMENT ON COLUMN astra_chats.is_team_response IS 'True if this is an Astra response in team chat';
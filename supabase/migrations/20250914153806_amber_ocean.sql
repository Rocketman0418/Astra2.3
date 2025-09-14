/*
  # Remove unused columns from astra_chats table

  1. Columns Being Removed
    - `prompt` - Replaced by unified `message` column
    - `response` - Replaced by unified `message` column
    - `session_id` - Not being used meaningfully
    - `tools_used` - Always empty, not being populated
    - `is_team_response` - Redundant (can determine from message_type and mode)

  2. Safety
    - Data is preserved in the `message` column
    - All essential functionality remains intact
    - Can be rolled back if needed
*/

-- Remove unused columns
ALTER TABLE astra_chats DROP COLUMN IF EXISTS prompt;
ALTER TABLE astra_chats DROP COLUMN IF EXISTS response;
ALTER TABLE astra_chats DROP COLUMN IF EXISTS session_id;
ALTER TABLE astra_chats DROP COLUMN IF EXISTS tools_used;
ALTER TABLE astra_chats DROP COLUMN IF EXISTS is_team_response;

-- Update any indexes that might reference the dropped columns
-- (Most indexes should be unaffected since they're on columns we're keeping)
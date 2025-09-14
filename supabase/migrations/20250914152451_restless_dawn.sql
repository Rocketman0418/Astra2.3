/*
  # Refactor astra_chats table to use message column

  1. Changes
    - Add new `message` column to store the actual message content
    - Populate `message` column based on `message_type`:
      - For 'user' messages: use `prompt` content
      - For 'astra' messages: use `response` content
    - Keep original columns temporarily for safety
    - Update indexes and constraints as needed

  2. Security
    - Maintains existing RLS policies
    - Preserves all existing data
*/

-- Add the new message column
ALTER TABLE astra_chats ADD COLUMN IF NOT EXISTS message text;

-- Populate the message column based on message_type
UPDATE astra_chats 
SET message = CASE 
  WHEN message_type = 'astra' THEN response
  ELSE prompt
END
WHERE message IS NULL;

-- Make message column NOT NULL after populating
ALTER TABLE astra_chats ALTER COLUMN message SET NOT NULL;

-- Add constraint to ensure message content is not empty
ALTER TABLE astra_chats ADD CONSTRAINT message_not_empty CHECK (length(TRIM(BOTH FROM message)) > 0);

-- Update Astra's email in existing records
UPDATE astra_chats 
SET user_email = 'astra@rockethub.ai' 
WHERE message_type = 'astra' AND user_name = 'Astra';

-- Create index on message column for search performance
CREATE INDEX IF NOT EXISTS idx_astra_chats_message_search ON astra_chats USING gin (message gin_trgm_ops);

-- Note: We're keeping prompt and response columns for now for safety
-- They can be dropped in a future migration after confirming everything works
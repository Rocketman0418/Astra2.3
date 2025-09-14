/*
  # Add mode column to astra_chats table

  1. Changes
    - Add `mode` column to `astra_chats` table with values 'private' or 'team'
    - Set default value to 'private' for backward compatibility
    - Add check constraint to ensure only valid values
    - Update existing records to have 'private' mode

  2. Security
    - No changes to existing RLS policies needed
*/

-- Add mode column with default value
ALTER TABLE astra_chats 
ADD COLUMN IF NOT EXISTS mode text DEFAULT 'private';

-- Add check constraint to ensure only valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'astra_chats_mode_check' 
    AND table_name = 'astra_chats'
  ) THEN
    ALTER TABLE astra_chats 
    ADD CONSTRAINT astra_chats_mode_check 
    CHECK (mode IN ('private', 'team'));
  END IF;
END $$;

-- Update existing records to have 'private' mode (if any don't have it set)
UPDATE astra_chats 
SET mode = 'private' 
WHERE mode IS NULL;
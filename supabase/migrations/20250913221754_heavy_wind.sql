/*
  # Add metadata column to group_messages table

  1. Changes
    - Add `metadata` jsonb column to store additional message data
    - Add index for better query performance on metadata
    - Set default value to empty JSON object

  2. Purpose
    - Store additional context like who asked Astra questions
    - Enable future extensibility for message metadata
*/

-- Add metadata column to group_messages table
ALTER TABLE public.group_messages 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add index for metadata queries
CREATE INDEX IF NOT EXISTS idx_group_messages_metadata 
ON public.group_messages USING gin (metadata);

-- Add comment for documentation
COMMENT ON COLUMN public.group_messages.metadata IS 'Additional message metadata stored as JSON';
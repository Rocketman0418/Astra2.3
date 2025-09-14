/*
  # Add visualization tracking to astra_chats table

  1. Schema Changes
    - Add `visualization` boolean column to `astra_chats` table
    - Default value is `false`
    - Add index for better query performance

  2. Purpose
    - Track when users create visualizations from Astra responses
    - Enable analytics on visualization usage
    - Support future features based on visualization data
*/

-- Add visualization column to astra_chats table
ALTER TABLE public.astra_chats 
ADD COLUMN visualization boolean NOT NULL DEFAULT false;

-- Add index for better query performance on visualization column
CREATE INDEX idx_astra_chats_visualization ON public.astra_chats(visualization);

-- Add comment to document the column purpose
COMMENT ON COLUMN public.astra_chats.visualization IS 'Indicates whether a visualization was created from this Astra response';
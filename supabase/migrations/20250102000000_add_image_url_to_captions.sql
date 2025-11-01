-- Add image_url column to social_media_captions table
ALTER TABLE public.social_media_captions 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update existing records to have image_url from image_ids if possible
-- This will be handled by the application logic for new records


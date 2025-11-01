-- Create table for social media captions
CREATE TABLE public.social_media_captions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  caption TEXT NOT NULL,
  hashtags TEXT NOT NULL,
  image_ids JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_media_captions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own captions"
ON public.social_media_captions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own captions"
ON public.social_media_captions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own captions"
ON public.social_media_captions
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_social_media_captions_updated_at
BEFORE UPDATE ON public.social_media_captions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
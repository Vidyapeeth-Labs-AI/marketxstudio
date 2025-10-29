-- Add INSERT policy for generated-images storage bucket
CREATE POLICY "Users can insert own generated images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'generated-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
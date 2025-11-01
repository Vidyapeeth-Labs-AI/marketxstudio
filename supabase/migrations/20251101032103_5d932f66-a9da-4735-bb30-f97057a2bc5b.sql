-- Make model_type_id nullable in generated_images table
ALTER TABLE public.generated_images 
ALTER COLUMN model_type_id DROP NOT NULL;
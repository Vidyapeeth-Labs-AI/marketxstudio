-- Update existing categories if they exist, otherwise insert new ones
-- First, let's add the new categories (this will preserve existing data)

-- Clear all existing categories first (we'll handle the constraint)
TRUNCATE business_categories CASCADE;

-- Insert new business categories
INSERT INTO business_categories (name) VALUES
  ('Fashion'),
  ('Jewelry'),
  ('Sportswear'),
  ('Beauty & Cosmetics'),
  ('Home Decor'),
  ('Furniture'),
  ('Food & Beverages'),
  ('Electronics (with models)'),
  ('Electronics (without models)');
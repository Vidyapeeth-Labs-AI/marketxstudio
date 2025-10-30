-- Add daily generation tracking
ALTER TABLE user_credits 
ADD COLUMN IF NOT EXISTS daily_generations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_generation_date DATE DEFAULT CURRENT_DATE;

-- Create function to reset daily counter
CREATE OR REPLACE FUNCTION reset_daily_generations()
RETURNS TRIGGER AS $$
BEGIN
  -- Reset counter if it's a new day
  IF NEW.last_generation_date < CURRENT_DATE THEN
    NEW.daily_generations := 0;
    NEW.last_generation_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-reset daily counter
DROP TRIGGER IF EXISTS reset_daily_generations_trigger ON user_credits;
CREATE TRIGGER reset_daily_generations_trigger
BEFORE UPDATE ON user_credits
FOR EACH ROW
EXECUTE FUNCTION reset_daily_generations();
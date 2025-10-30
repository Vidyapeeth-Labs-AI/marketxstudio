-- Fix search_path for reset_daily_generations function
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
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;
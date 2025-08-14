-- Fix the trigger function to only activate free default vocabulary lists
-- First, drop the existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created_default_lists ON auth.users;

-- Update the function to only activate free (non-premium) default vocabulary lists
CREATE OR REPLACE FUNCTION public.activate_default_lists_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Insert only FREE default lists for new user (where premium_required = false)
  INSERT INTO public.user_default_lists (user_id, default_list_id, is_active)
  SELECT NEW.id, dvl.id, true
  FROM public.default_vocabulary_lists dvl
  WHERE dvl.premium_required = false OR dvl.premium_required IS NULL
  ON CONFLICT (user_id, default_list_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Error activating default lists for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created_default_lists
AFTER INSERT ON auth.users
FOR EACH ROW 
EXECUTE FUNCTION public.activate_default_lists_for_new_user();
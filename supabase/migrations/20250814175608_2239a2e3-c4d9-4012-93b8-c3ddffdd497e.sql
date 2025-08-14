-- First, let's drop the existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created_default_lists ON auth.users;

-- Update the function to be more robust and handle errors gracefully
CREATE OR REPLACE FUNCTION public.activate_default_lists_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Insert default lists for new user with proper error handling
  INSERT INTO public.user_default_lists (user_id, default_list_id, is_active)
  SELECT NEW.id, id, true
  FROM public.default_vocabulary_lists
  WHERE id IN (
    '2df27e12-efce-4798-bde7-a077f65b519f', -- Die 200 wichtigsten Englisch Vokabeln
    '000b7200-3ff2-4a9d-9098-be4e6d03d7d6', -- A1 Sprachniveau
    '5e125683-97cc-4668-9cfb-f5ee49d1660e', -- A2 Sprachniveau
    'a3859f61-1037-4d76-b4fa-b022d10d77e9', -- B1 Sprachniveau
    'daef9a3f-dc59-4848-86ca-5624c8a2937a', -- Oxford 3.000
    'ab059a0f-4bd1-4af8-bb1b-3b17abab654b', -- Business Englisch
    '7e7335a5-bbef-4e28-ba2b-b7d7936ebbf5'  -- Venture Capital
  )
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
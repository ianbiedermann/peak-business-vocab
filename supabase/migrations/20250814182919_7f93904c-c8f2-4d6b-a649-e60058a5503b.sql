-- Clean up and fix trigger conflicts completely
-- Remove the old conflicting trigger and function
DROP TRIGGER IF EXISTS activate_default_free_lists_trigger ON auth.users;
DROP TRIGGER IF EXISTS activate_default_lists_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.activate_default_free_vocab_lists();

-- Also clean up the duplicate trigger
DROP TRIGGER IF EXISTS on_auth_user_created_default_lists ON auth.users;

-- Now recreate just the essential triggers
CREATE TRIGGER on_auth_user_created_default_lists
AFTER INSERT ON auth.users
FOR EACH ROW 
EXECUTE FUNCTION public.activate_default_lists_for_new_user();
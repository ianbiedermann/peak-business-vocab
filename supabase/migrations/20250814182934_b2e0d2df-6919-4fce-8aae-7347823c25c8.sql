-- Check if there are any conflicting triggers and fix the user creation process
-- First, let's see what triggers exist on auth.users
SELECT trigger_name, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

-- Drop all existing triggers on auth.users to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_default_lists ON auth.users;
DROP TRIGGER IF EXISTS activate_default_free_vocab_lists_trigger ON auth.users;

-- Recreate the handle_new_user trigger (for profiles)
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW 
EXECUTE FUNCTION public.handle_new_user();

-- Recreate the default lists activation trigger
CREATE TRIGGER on_auth_user_created_default_lists
AFTER INSERT ON auth.users
FOR EACH ROW 
EXECUTE FUNCTION public.activate_default_lists_for_new_user();
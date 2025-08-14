-- Create the missing user_default_lists table that's referenced in the trigger function
CREATE TABLE public.user_default_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_list_id UUID NOT NULL REFERENCES public.default_vocabulary_lists(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, default_list_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_default_lists ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own default list preferences" 
ON public.user_default_lists 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own default list preferences" 
ON public.user_default_lists 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own default list preferences" 
ON public.user_default_lists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own default list preferences" 
ON public.user_default_lists 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_default_lists_updated_at
BEFORE UPDATE ON public.user_default_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create the missing trigger that calls the function when users sign up
CREATE TRIGGER on_auth_user_created_default_lists
AFTER INSERT ON auth.users
FOR EACH ROW 
EXECUTE FUNCTION public.activate_default_lists_for_new_user();
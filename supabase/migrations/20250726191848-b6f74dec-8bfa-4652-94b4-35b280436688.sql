-- Create default vocabulary lists table
CREATE TABLE public.default_vocabulary_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  vocabulary_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create default vocabularies table
CREATE TABLE public.default_vocabularies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  english TEXT NOT NULL,
  german TEXT NOT NULL,
  list_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (list_id) REFERENCES public.default_vocabulary_lists(id) ON DELETE CASCADE
);

-- Create user list preferences table (for activate/deactivate)
CREATE TABLE public.user_list_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  list_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, list_id)
);

-- Enable RLS on new tables
ALTER TABLE public.default_vocabulary_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_list_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for default lists (readable by everyone)
CREATE POLICY "Default vocabulary lists are viewable by everyone" 
ON public.default_vocabulary_lists 
FOR SELECT 
USING (true);

CREATE POLICY "Default vocabularies are viewable by everyone" 
ON public.default_vocabularies 
FOR SELECT 
USING (true);

-- Create policies for user preferences
CREATE POLICY "Users can view their own list preferences" 
ON public.user_list_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own list preferences" 
ON public.user_list_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own list preferences" 
ON public.user_list_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own list preferences" 
ON public.user_list_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_default_vocabulary_lists_updated_at
BEFORE UPDATE ON public.default_vocabulary_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_list_preferences_updated_at
BEFORE UPDATE ON public.user_list_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing lists to default lists
INSERT INTO public.default_vocabulary_lists (id, name, vocabulary_count, created_at)
SELECT id, name, vocabulary_count, created_at 
FROM public.vocabulary_lists;

-- Migrate existing vocabularies to default vocabularies
INSERT INTO public.default_vocabularies (id, english, german, list_id, created_at)
SELECT id, english, german, list_id, created_at 
FROM public.vocabularies;

-- Update vocabularies table to reference default lists and keep user progress
ALTER TABLE public.vocabularies 
ADD COLUMN default_vocabulary_id UUID,
ADD FOREIGN KEY (default_vocabulary_id) REFERENCES public.default_vocabularies(id);

-- Update existing vocabularies to link to default vocabularies
UPDATE public.vocabularies 
SET default_vocabulary_id = id;
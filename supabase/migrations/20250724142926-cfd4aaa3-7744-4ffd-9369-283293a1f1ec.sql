-- Create vocabulary_lists table
CREATE TABLE public.vocabulary_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  vocabulary_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vocabularies table
CREATE TABLE public.vocabularies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  list_id UUID NOT NULL REFERENCES public.vocabulary_lists(id) ON DELETE CASCADE,
  english TEXT NOT NULL,
  german TEXT NOT NULL,
  box INTEGER NOT NULL DEFAULT 0 CHECK (box >= 0 AND box <= 6),
  next_review TIMESTAMP WITH TIME ZONE,
  times_correct INTEGER NOT NULL DEFAULT 0,
  times_incorrect INTEGER NOT NULL DEFAULT 0,
  last_reviewed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create learning_stats table
CREATE TABLE public.learning_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  new_learned INTEGER NOT NULL DEFAULT 0,
  reviewed INTEGER NOT NULL DEFAULT 0,
  total_time INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.vocabulary_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vocabulary_lists
CREATE POLICY "Users can view their own vocabulary lists" 
ON public.vocabulary_lists 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vocabulary lists" 
ON public.vocabulary_lists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocabulary lists" 
ON public.vocabulary_lists 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vocabulary lists" 
ON public.vocabulary_lists 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for vocabularies
CREATE POLICY "Users can view their own vocabularies" 
ON public.vocabularies 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vocabularies" 
ON public.vocabularies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocabularies" 
ON public.vocabularies 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vocabularies" 
ON public.vocabularies 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for learning_stats
CREATE POLICY "Users can view their own learning stats" 
ON public.learning_stats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own learning stats" 
ON public.learning_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning stats" 
ON public.learning_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vocabulary_lists_updated_at
BEFORE UPDATE ON public.vocabulary_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vocabularies_updated_at
BEFORE UPDATE ON public.vocabularies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learning_stats_updated_at
BEFORE UPDATE ON public.learning_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_vocabulary_lists_user_id ON public.vocabulary_lists(user_id);
CREATE INDEX idx_vocabularies_user_id ON public.vocabularies(user_id);
CREATE INDEX idx_vocabularies_list_id ON public.vocabularies(list_id);
CREATE INDEX idx_vocabularies_box ON public.vocabularies(box);
CREATE INDEX idx_vocabularies_next_review ON public.vocabularies(next_review);
CREATE INDEX idx_learning_stats_user_id ON public.learning_stats(user_id);
CREATE INDEX idx_learning_stats_date ON public.learning_stats(date);
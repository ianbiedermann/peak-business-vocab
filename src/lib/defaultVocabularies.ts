// This file loads default vocabularies from Supabase and stores them locally
// This is a one-time setup helper - in production, data would be pre-bundled
import { supabase } from '@/integrations/supabase/client';
import * as localStorage from './localStorage';

interface DefaultVocabularyList {
  id: string;
  name: string;
  description?: string | null;
  vocabulary_count: number;
  premium_required: boolean;
  created_at: string;
  updated_at: string;
}

interface DefaultVocabulary {
  id: string;
  list_id: string;
  english: string;
  german: string;
  created_at: string;
}

export async function loadDefaultVocabularies(): Promise<void> {
  try {
    console.log('🔄 Loading default vocabularies from Supabase...');

    // Load lists
    const { data: lists, error: listsError } = await supabase
      .from('default_vocabulary_lists')
      .select('*')
      .order('created_at');

    if (listsError) throw listsError;
    if (!lists || lists.length === 0) {
      console.log('⚠️ No default lists found in Supabase');
      return;
    }

    // Load vocabularies
    const { data: vocabs, error: vocabsError } = await supabase
      .from('default_vocabularies')
      .select('*')
      .order('list_id, created_at');

    if (vocabsError) throw vocabsError;
    if (!vocabs || vocabs.length === 0) {
      console.log('⚠️ No default vocabularies found in Supabase');
      return;
    }

    // Transform lists
    const transformedLists = lists.map((list: DefaultVocabularyList) => ({
      id: list.id,
      name: list.name,
      description: list.description || undefined,
      vocabulary_count: list.vocabulary_count,
      is_active: false, // Default to inactive
      is_default: true,
      premium_required: list.premium_required || false,
      created_at: list.created_at,
      updated_at: list.updated_at,
    }));

    // Transform vocabularies
    const transformedVocabs = vocabs.map((vocab: DefaultVocabulary) => ({
      id: vocab.id,
      list_id: vocab.list_id,
      english: vocab.english,
      german: vocab.german,
      box: 0,
      times_correct: 0,
      times_incorrect: 0,
      created_at: vocab.created_at,
      updated_at: new Date().toISOString(),
    }));

    // Save to local storage
    await localStorage.saveListsToLocal(transformedLists);
    await localStorage.saveWordsToLocal(transformedVocabs);

    console.log(`✅ Loaded ${transformedLists.length} lists and ${transformedVocabs.length} vocabularies`);
  } catch (error) {
    console.error('❌ Error loading default vocabularies:', error);
    throw error;
  }
}

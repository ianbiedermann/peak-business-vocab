// This file loads default vocabularies from local JSON files
// If JSON files are empty, it falls back to Supabase as a one-time sync
import { supabase } from '@/integrations/supabase/client';
import * as localStorage from './localStorage';
import defaultLists from '@/data/default-lists.json';

// Dynamic imports for vocabulary data
const vocabFiles: Record<string, () => Promise<any>> = {
  '2df27e12-efce-4798-bde7-a077f65b519f': () => import('@/data/vocabularies/200-wichtigste.json'),
  '000b7200-3ff2-4a9d-9098-be4e6d03d7d6': () => import('@/data/vocabularies/a1-sprachniveau.json'),
  '5e125683-97cc-4668-9cfb-f5ee49d1660e': () => import('@/data/vocabularies/a2-sprachniveau.json'),
  'a3859f61-1037-4d76-b4fa-b022d10d77e9': () => import('@/data/vocabularies/b1-sprachniveau.json'),
  'daef9a3f-dc59-4848-86ca-5624c8a2937a': () => import('@/data/vocabularies/oxford-3000.json'),
  'ab059a0f-4bd1-4af8-bb1b-3b17abab654b': () => import('@/data/vocabularies/business-englisch.json'),
  '7e7335a5-bbef-4e28-ba2b-b7d7936ebbf5': () => import('@/data/vocabularies/venture-capital.json'),
};

async function loadFromJSON(): Promise<any[]> {
  const allVocabs: any[] = [];
  
  for (const listId of Object.keys(vocabFiles)) {
    try {
      const module = await vocabFiles[listId]();
      const vocabs = module.default || module;
      
      if (vocabs && vocabs.length > 0) {
        allVocabs.push(...vocabs);
      }
    } catch (error) {
      console.warn(`⚠️ Could not load JSON for list ${listId}:`, error);
    }
  }
  
  return allVocabs;
}

async function loadFromSupabase(): Promise<any[]> {
  console.log('📥 Fetching vocabularies from Supabase (one-time sync)...');
  
  const { data: vocabs, error } = await supabase
    .from('default_vocabularies')
    .select('*')
    .order('list_id, created_at');
  
  if (error) throw error;
  if (!vocabs || vocabs.length === 0) {
    console.warn('⚠️ No vocabularies found in Supabase');
    return [];
  }
  
  console.log(`✅ Fetched ${vocabs.length} vocabularies from Supabase`);
  return vocabs;
}

export async function loadDefaultVocabularies(): Promise<void> {
  try {
    console.log('🔄 Loading default vocabularies...');

    // Transform lists
    const transformedLists = defaultLists.map((list) => ({
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

    // Try loading from JSON files first
    let vocabsData = await loadFromJSON();
    
    // If JSON files are empty, fall back to Supabase
    if (vocabsData.length === 0) {
      console.log('⚠️ JSON files are empty, loading from Supabase...');
      vocabsData = await loadFromSupabase();
    } else {
      console.log(`✅ Loaded ${vocabsData.length} vocabularies from local JSON files`);
    }
    
    // Transform vocabularies
    const transformedVocabs = vocabsData.map((vocab: any) => ({
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

    console.log(`✅ Loaded ${transformedLists.length} lists and ${transformedVocabs.length} vocabularies!`);
  } catch (error) {
    console.error('❌ Error loading default vocabularies:', error);
    throw error;
  }
}

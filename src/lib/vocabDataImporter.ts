// Temporary script to export vocabularies from Supabase to JSON files
// Run this once to populate the JSON files, then delete this file
import { supabase } from '@/integrations/supabase/client';

const LIST_CONFIGS = [
  { id: '2df27e12-efce-4798-bde7-a077f65b519f', filename: '200-wichtigste.json' },
  { id: '000b7200-3ff2-4a9d-9098-be4e6d03d7d6', filename: 'a1-sprachniveau.json' },
  { id: '5e125683-97cc-4668-9cfb-f5ee49d1660e', filename: 'a2-sprachniveau.json' },
  { id: 'a3859f61-1037-4d76-b4fa-b022d10d77e9', filename: 'b1-sprachniveau.json' },
  { id: 'daef9a3f-dc59-4848-86ca-5624c8a2937a', filename: 'oxford-3000.json' },
  { id: 'ab059a0f-4bd1-4af8-bb1b-3b17abab654b', filename: 'business-englisch.json' },
  { id: '7e7335a5-bbef-4e28-ba2b-b7d7936ebbf5', filename: 'venture-capital.json' },
];

export async function exportVocabularies() {
  console.log('📦 Starting vocabulary export...');
  
  for (const config of LIST_CONFIGS) {
    try {
      console.log(`📥 Fetching ${config.filename}...`);
      
      const { data, error } = await supabase
        .from('default_vocabularies')
        .select('id, english, german, list_id, created_at')
        .eq('list_id', config.id)
        .order('created_at');
      
      if (error) throw error;
      
      console.log(`✅ Fetched ${data.length} vocabularies for ${config.filename}`);
      console.log(JSON.stringify(data, null, 2));
      console.log('\n---\n');
      
    } catch (error) {
      console.error(`❌ Error fetching ${config.filename}:`, error);
    }
  }
  
  console.log('✨ Export complete!');
}

// Call this from console: import('./lib/vocabDataImporter').then(m => m.exportVocabularies())

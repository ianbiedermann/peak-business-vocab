// 1. ÄNDERUNG: In der loadData Funktion, Zeile ~30
// VORHER:
supabase
  .from('default_vocabulary_lists')
  .select('*')
  .order('created_at', { ascending: false }),

// NACHHER:
supabase
  .from('default_vocabulary_lists')
  .select('*, premium_required')  // premium_required hinzufügen
  .order('created_at', { ascending: false }),

// 2. ÄNDERUNG: Im combinedLists mapping, circa Zeile 50-60
// VORHER:
...defaultLists.map(list => {
  const preference = userPreferences.find(p => p.list_id === list.id);
  return {
    id: list.id,
    name: list.name,
    isActive: preference?.is_active ?? true,
    uploadedAt: new Date(list.created_at),
    vocabularyCount: list.vocabulary_count,
    premiumRequired: list.premium_required || false
  };
})

// NACHHER:
...defaultLists.map(list => {
  const preference = userPreferences.find(p => p.list_id === list.id);
  return {
    id: list.id,
    name: list.name,
    isActive: preference?.is_active ?? true,
    uploadedAt: new Date(list.created_at),
    vocabularyCount: list.vocabulary_count,
    premiumRequired: list.premium_required || false  // NEUE ZEILE
  };
})

// 3. ÄNDERUNG: VocabularyList Type erweitern
// In der types/vocabulary.ts Datei diese Zeile hinzufügen:
export interface VocabularyList {
  id: string;
  name: string;
  isActive: boolean;
  uploadedAt: Date;
  vocabularyCount: number;
  premiumRequired?: boolean;  // NEUE ZEILE
}

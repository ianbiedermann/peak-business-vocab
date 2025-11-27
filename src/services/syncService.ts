// Sync service for uploading local data to Supabase
import { supabase } from '@/integrations/supabase/client';
import { loadListsFromLocal, loadWordsFromLocal, loadProgressFromLocal } from '@/lib/localStorage';

export interface SyncResult {
  success: boolean;
  listsUploaded: number;
  vocabulariesUploaded: number;
  statsUploaded: number;
  errors: string[];
}

export interface SyncProgress {
  phase: 'lists' | 'vocabularies' | 'stats';
  current: number;
  total: number;
}

const BATCH_SIZE = 100;

// Helper function to split array into batches
function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

export async function syncLocalToSupabase(
  userId: string,
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    listsUploaded: 0,
    vocabulariesUploaded: 0,
    statsUploaded: 0,
    errors: [],
  };

  try {
    // 1. Load all local data
    const localLists = await loadListsFromLocal();
    const localVocabularies = await loadWordsFromLocal();
    const localStats = await loadProgressFromLocal();

    // Filter out default lists (they don't need to be uploaded)
    const userLists = localLists.filter(list => !list.is_default);

    // 2. Upload vocabulary lists
    if (userLists.length > 0) {
      const listBatches = batchArray(userLists, BATCH_SIZE);
      let listsProcessed = 0;

      for (const batch of listBatches) {
        onProgress?.({
          phase: 'lists',
          current: listsProcessed,
          total: userLists.length,
        });

        const mappedLists = batch.map(list => ({
          id: list.id,
          user_id: userId,
          name: list.name,
          is_active: list.is_active ?? true,
          vocabulary_count: list.vocabulary_count ?? 0,
          created_at: list.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          uploaded_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from('vocabulary_lists')
          .upsert(mappedLists, { onConflict: 'id' });

        if (error) {
          result.errors.push(`Listen-Upload fehlgeschlagen: ${error.message}`);
          result.success = false;
        } else {
          result.listsUploaded += batch.length;
        }

        listsProcessed += batch.length;
      }
    }

    // 3. Upload vocabularies (only from user lists, not default lists)
    const userListIds = new Set(userLists.map(l => l.id));
    const userVocabularies = localVocabularies.filter(v => 
      userListIds.has(v.list_id) && v.box > 0 // Only upload vocabularies that have been learned
    );

    if (userVocabularies.length > 0) {
      const vocabBatches = batchArray(userVocabularies, BATCH_SIZE);
      let vocabsProcessed = 0;

      for (const batch of vocabBatches) {
        onProgress?.({
          phase: 'vocabularies',
          current: vocabsProcessed,
          total: userVocabularies.length,
        });

        const mappedVocabs = batch.map(vocab => ({
          id: vocab.id,
          user_id: userId,
          list_id: vocab.list_id,
          english: vocab.english,
          german: vocab.german,
          box: vocab.box ?? 0,
          times_correct: vocab.times_correct ?? 0,
          times_incorrect: vocab.times_incorrect ?? 0,
          last_reviewed: vocab.last_reviewed || null,
          next_review: vocab.next_review || null,
          created_at: vocab.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from('vocabularies')
          .upsert(mappedVocabs, { onConflict: 'id' });

        if (error) {
          result.errors.push(`Vokabel-Upload fehlgeschlagen: ${error.message}`);
          result.success = false;
        } else {
          result.vocabulariesUploaded += batch.length;
        }

        vocabsProcessed += batch.length;
      }
    }

    // 4. Upload learning stats
    if (localStats.length > 0) {
      const statsBatches = batchArray(localStats, BATCH_SIZE);
      let statsProcessed = 0;

      for (const batch of statsBatches) {
        onProgress?.({
          phase: 'stats',
          current: statsProcessed,
          total: localStats.length,
        });

        const mappedStats = batch.map(stat => ({
          id: stat.id,
          user_id: userId,
          date: stat.date,
          new_learned: stat.new_learned ?? 0,
          reviewed: stat.reviewed ?? 0,
          total_time: stat.total_time ?? 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from('learning_stats')
          .upsert(mappedStats, { onConflict: 'id' });

        if (error) {
          result.errors.push(`Statistik-Upload fehlgeschlagen: ${error.message}`);
          result.success = false;
        } else {
          result.statsUploaded += batch.length;
        }

        statsProcessed += batch.length;
      }
    }

    // Final progress update
    onProgress?.({
      phase: 'stats',
      current: localStats.length,
      total: localStats.length,
    });

  } catch (error) {
    result.success = false;
    result.errors.push(`Unerwarteter Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  }

  return result;
}

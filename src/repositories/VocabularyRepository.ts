// Repository layer for vocabulary data access
import { supabase } from '@/integrations/supabase/client';
import * as localStorage from '@/lib/localStorage';

export interface VocabularyList {
  id: string;
  name: string;
  description?: string;
  vocabulary_count: number;
  is_active: boolean;
  is_default: boolean;
  premium_required?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vocabulary {
  id: string;
  list_id: string;
  english: string;
  german: string;
  box: number;
  times_correct: number;
  times_incorrect: number;
  last_reviewed?: string;
  next_review?: string;
  created_at: string;
  updated_at: string;
}

export interface LearningStat {
  id: string;
  date: string;
  new_learned: number;
  reviewed: number;
  total_time: number;
}

class VocabularyRepositoryClass {
  private isOnline(): boolean {
    return navigator.onLine;
  }

  // Lists
  async getAllLists(): Promise<VocabularyList[]> {
    return await localStorage.loadListsFromLocal();
  }

  async getActiveListIds(): Promise<string[]> {
    const lists = await this.getAllLists();
    return lists.filter(list => list.is_active).map(list => list.id);
  }

  async createList(name: string, vocabularies: Array<{english: string, german: string}>): Promise<VocabularyList> {
    const now = new Date().toISOString();
    const listId = crypto.randomUUID();
    
    const list: VocabularyList = {
      id: listId,
      name,
      vocabulary_count: vocabularies.length,
      is_active: true,
      is_default: false,
      created_at: now,
      updated_at: now,
    };

    await localStorage.saveListToLocal(list);

    // Create vocabularies for this list
    const words = vocabularies.map(v => ({
      id: crypto.randomUUID(),
      list_id: listId,
      english: v.english,
      german: v.german,
      box: 0,
      times_correct: 0,
      times_incorrect: 0,
      created_at: now,
      updated_at: now,
    }));

    await localStorage.saveWordsToLocal(words);

    return list;
  }

  async toggleList(listId: string, isActive: boolean): Promise<void> {
    const lists = await this.getAllLists();
    const list = lists.find(l => l.id === listId);
    
    if (list) {
      list.is_active = isActive;
      list.updated_at = new Date().toISOString();
      await localStorage.saveListToLocal(list);
    }

    // If it's a default list, save preference
    if (list?.is_default) {
      await localStorage.saveDefaultListPreference(listId, isActive);
    }
  }

  async deleteList(listId: string): Promise<void> {
    await localStorage.deleteListFromLocal(listId);
    await localStorage.deleteWordsForListFromLocal(listId);
  }

  // Vocabularies
  async getWordsForList(listId: string): Promise<Vocabulary[]> {
    return await localStorage.loadWordsFromLocal(listId);
  }

  async getAllWords(): Promise<Vocabulary[]> {
    return await localStorage.loadWordsFromLocal();
  }

  async getRandomWords(count: number): Promise<Vocabulary[]> {
    const activeListIds = await this.getActiveListIds();
    const allWords = await this.getAllWords();
    
    const availableWords = allWords.filter(
      w => activeListIds.includes(w.list_id) && w.box === 0
    );

    // Shuffle and take count
    const shuffled = availableWords.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  async getWordsForReview(): Promise<Vocabulary[]> {
    const activeListIds = await this.getActiveListIds();
    const allWords = await this.getAllWords();
    const now = new Date();

    return allWords.filter(w => 
      activeListIds.includes(w.list_id) &&
      w.box > 0 &&
      w.next_review &&
      new Date(w.next_review) <= now
    );
  }

  async getWordsByBox(box: number): Promise<Vocabulary[]> {
    const allWords = await this.getAllWords();
    return allWords.filter(w => w.box === box);
  }

  async saveWordProgress(wordId: string, progress: Partial<Vocabulary>): Promise<void> {
    const allWords = await this.getAllWords();
    const word = allWords.find(w => w.id === wordId);
    
    if (word) {
      Object.assign(word, progress, { updated_at: new Date().toISOString() });
      await localStorage.saveWordToLocal(word);
    }
  }

  async moveWordToBox(wordId: string, newBox: number, isCorrect: boolean): Promise<void> {
    const allWords = await this.getAllWords();
    const word = allWords.find(w => w.id === wordId);
    
    if (word) {
      word.box = newBox;
      word.last_reviewed = new Date().toISOString();
      
      if (isCorrect) {
        word.times_correct++;
      } else {
        word.times_incorrect++;
      }

      // Calculate next review date based on box
      const daysUntilReview = Math.pow(2, newBox);
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + daysUntilReview);
      word.next_review = nextReview.toISOString();
      
      word.updated_at = new Date().toISOString();
      await localStorage.saveWordToLocal(word);
    }
  }

  // Stats
  async getStats(): Promise<LearningStat[]> {
    return await localStorage.loadProgressFromLocal();
  }

  async updateDailyStats(newLearned: number, reviewed: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const stats = await this.getStats();
    let todayStat = stats.find(s => s.date === today);

    if (todayStat) {
      todayStat.new_learned += newLearned;
      todayStat.reviewed += reviewed;
    } else {
      todayStat = {
        id: crypto.randomUUID(),
        date: today,
        new_learned: newLearned,
        reviewed: reviewed,
        total_time: 0,
      };
    }

    await localStorage.saveStatToLocal(todayStat);
  }

  // Initial sync from Supabase (one-time)
  async syncDefaultListsFromSupabase(): Promise<void> {
    if (!this.isOnline()) {
      console.log('⚠️ Offline - skipping sync from Supabase');
      return;
    }

    const hasData = await localStorage.hasLocalData();
    if (hasData) {
      console.log('✅ Local data already exists - skipping initial sync');
      return;
    }

    console.log('🔄 Loading default vocabulary lists from Supabase...');

    try {
      // Load default lists
      const { data: defaultLists, error: listsError } = await supabase
        .from('default_vocabulary_lists')
        .select('*');

      if (listsError) throw listsError;

      // Load default vocabularies
      const { data: defaultVocabs, error: vocabsError } = await supabase
        .from('default_vocabularies')
        .select('*');

      if (vocabsError) throw vocabsError;

      // Transform and save lists
      const lists: VocabularyList[] = (defaultLists || []).map(list => ({
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

      await localStorage.saveListsToLocal(lists);

      // Transform and save vocabularies
      const vocabularies: Vocabulary[] = (defaultVocabs || []).map(vocab => ({
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

      await localStorage.saveWordsToLocal(vocabularies);

      console.log(`✅ Synced ${lists.length} lists and ${vocabularies.length} vocabularies from Supabase`);
    } catch (error) {
      console.error('❌ Error syncing from Supabase:', error);
      throw error;
    }
  }
}

export const VocabularyRepository = new VocabularyRepositoryClass();

// Repository layer for vocabulary data access
import * as localStorage from '@/lib/localStorage';
import { loadDefaultVocabularies } from '@/lib/defaultVocabularies';
import { BOX_INTERVALS } from '@/types/vocabulary';

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
  // Load default vocabularies if local storage is empty
  async ensureDefaultVocabularies(): Promise<void> {
    const hasData = await localStorage.hasLocalData();
    if (!hasData) {
      console.log('📦 No local data found, loading default vocabularies...');
      try {
        await loadDefaultVocabularies();
      } catch (error) {
        console.error('❌ Failed to load default vocabularies:', error);
        // Continue anyway - app can still work with user-uploaded lists
      }
    }
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

      // Calculate next review date based on box using BOX_INTERVALS
      const daysUntilReview = BOX_INTERVALS[newBox] || 1;
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
}

export const VocabularyRepository = new VocabularyRepositoryClass();

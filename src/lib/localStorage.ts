// Local storage layer using IndexedDB for offline-first functionality
import { openDB, IDBPDatabase } from 'idb';

interface VocabAppDB {
  vocabularyLists: {
    key: string;
    value: {
      id: string;
      name: string;
      description?: string;
      vocabulary_count: number;
      is_active: boolean;
      is_default: boolean;
      premium_required?: boolean;
      created_at: string;
      updated_at: string;
    };
  };
  vocabularies: {
    key: string;
    value: {
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
    };
  };
  learningStats: {
    key: string;
    value: {
      id: string;
      date: string;
      new_learned: number;
      reviewed: number;
      total_time: number;
    };
  };
  settings: {
    key: string;
    value: any;
  };
  defaultListPreferences: {
    key: string;
    value: {
      list_id: string;
      is_active: boolean;
    };
  };
}

let dbInstance: IDBPDatabase<VocabAppDB> | null = null;

async function getDB(): Promise<IDBPDatabase<VocabAppDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<VocabAppDB>('vocab-app-db', 1, {
    upgrade(db) {
      // Vocabulary Lists
      if (!db.objectStoreNames.contains('vocabularyLists')) {
        const listStore = db.createObjectStore('vocabularyLists', { keyPath: 'id' });
        listStore.createIndex('by-active', 'is_active');
      }

      // Vocabularies
      if (!db.objectStoreNames.contains('vocabularies')) {
        const vocabStore = db.createObjectStore('vocabularies', { keyPath: 'id' });
        vocabStore.createIndex('by-list', 'list_id');
        vocabStore.createIndex('by-box', 'box');
      }

      // Learning Stats
      if (!db.objectStoreNames.contains('learningStats')) {
        const statsStore = db.createObjectStore('learningStats', { keyPath: 'id' });
        statsStore.createIndex('by-date', 'date');
      }

      // Settings
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // Default List Preferences
      if (!db.objectStoreNames.contains('defaultListPreferences')) {
        const prefStore = db.createObjectStore('defaultListPreferences', { keyPath: 'list_id' });
        prefStore.createIndex('by-list', 'list_id');
      }
    },
  });

  return dbInstance;
}

// Vocabulary Lists
export async function saveListsToLocal(lists: any[]) {
  const db = await getDB();
  const tx = db.transaction('vocabularyLists', 'readwrite');
  await Promise.all(lists.map(list => tx.store.put(list)));
  await tx.done;
}

export async function loadListsFromLocal(): Promise<any[]> {
  const db = await getDB();
  return await db.getAll('vocabularyLists');
}

export async function saveListToLocal(list: any) {
  const db = await getDB();
  await db.put('vocabularyLists', list);
}

export async function deleteListFromLocal(listId: string) {
  const db = await getDB();
  await db.delete('vocabularyLists', listId);
}

// Vocabularies
export async function saveWordsToLocal(words: any[]) {
  const db = await getDB();
  const tx = db.transaction('vocabularies', 'readwrite');
  await Promise.all(words.map(word => tx.store.put(word)));
  await tx.done;
}

export async function loadWordsFromLocal(listId?: string): Promise<any[]> {
  const db = await getDB();
  if (listId) {
    return await db.getAllFromIndex('vocabularies', 'by-list', listId);
  }
  return await db.getAll('vocabularies');
}

export async function saveWordToLocal(word: any) {
  const db = await getDB();
  await db.put('vocabularies', word);
}

export async function deleteWordFromLocal(wordId: string) {
  const db = await getDB();
  await db.delete('vocabularies', wordId);
}

export async function deleteWordsForListFromLocal(listId: string) {
  const db = await getDB();
  const words = await db.getAllFromIndex('vocabularies', 'by-list', listId);
  const tx = db.transaction('vocabularies', 'readwrite');
  await Promise.all(words.map(word => tx.store.delete(word.id)));
  await tx.done;
}

// Learning Stats
export async function saveProgressToLocal(stats: any[]) {
  const db = await getDB();
  const tx = db.transaction('learningStats', 'readwrite');
  await Promise.all(stats.map(stat => tx.store.put(stat)));
  await tx.done;
}

export async function loadProgressFromLocal(): Promise<any[]> {
  const db = await getDB();
  return await db.getAll('learningStats');
}

export async function saveStatToLocal(stat: any) {
  const db = await getDB();
  await db.put('learningStats', stat);
}

// Settings
export async function saveSetting(key: string, value: any) {
  const db = await getDB();
  await db.put('settings', { key, value });
}

export async function loadSetting(key: string): Promise<any> {
  const db = await getDB();
  const result = await db.get('settings', key);
  return result?.value;
}

export async function loadAllSettings(): Promise<Record<string, any>> {
  const db = await getDB();
  const settings = await db.getAll('settings');
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, any>);
}

// Default List Preferences
export async function saveDefaultListPreferences(preferences: any[]) {
  const db = await getDB();
  const tx = db.transaction('defaultListPreferences', 'readwrite');
  await Promise.all(preferences.map(pref => tx.store.put(pref)));
  await tx.done;
}

export async function loadDefaultListPreferences(): Promise<any[]> {
  const db = await getDB();
  return await db.getAll('defaultListPreferences');
}

export async function saveDefaultListPreference(listId: string, isActive: boolean) {
  const db = await getDB();
  await db.put('defaultListPreferences', { list_id: listId, is_active: isActive });
}

// Check if data exists
export async function hasLocalData(): Promise<boolean> {
  const db = await getDB();
  const lists = await db.getAll('vocabularyLists');
  return lists.length > 0;
}

// Clear all data (for testing/reset)
export async function clearAllLocalData() {
  const db = await getDB();
  const tx = db.transaction(['vocabularyLists', 'vocabularies', 'learningStats', 'settings', 'defaultListPreferences'], 'readwrite');
  await Promise.all([
    tx.objectStore('vocabularyLists').clear(),
    tx.objectStore('vocabularies').clear(),
    tx.objectStore('learningStats').clear(),
    tx.objectStore('settings').clear(),
    tx.objectStore('defaultListPreferences').clear(),
  ]);
  await tx.done;
}

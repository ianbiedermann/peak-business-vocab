import { useState, useEffect } from 'react';
import { Vocabulary, VocabularyList, LearningStats, AppStats, BOX_INTERVALS } from '../types/vocabulary';

const STORAGE_KEY = 'peakEnglish_vocabularies';
const STATS_KEY = 'peakEnglish_stats';
const LISTS_KEY = 'peakEnglish_lists';

export function useVocabularyStore() {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [stats, setStats] = useState<LearningStats[]>([]);
  const [lists, setLists] = useState<VocabularyList[]>([]);

  // Initialize data on first load
  useEffect(() => {
    const savedVocabs = localStorage.getItem(STORAGE_KEY);
    const savedStats = localStorage.getItem(STATS_KEY);
    const savedLists = localStorage.getItem(LISTS_KEY);

    if (savedVocabs) {
      const parsed = JSON.parse(savedVocabs);
      // Convert date strings back to Date objects
      const vocabsWithDates = parsed.map((vocab: any) => ({
        ...vocab,
        nextReview: vocab.nextReview ? new Date(vocab.nextReview) : undefined,
        lastReviewed: vocab.lastReviewed ? new Date(vocab.lastReviewed) : undefined,
        createdAt: new Date(vocab.createdAt)
      }));
      setVocabularies(vocabsWithDates);
    }

    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }

    if (savedLists) {
      const parsed = JSON.parse(savedLists);
      const listsWithDates = parsed.map((list: any) => ({
        ...list,
        uploadedAt: new Date(list.uploadedAt)
      }));
      setLists(listsWithDates);
    }
  }, []);

  // Save to localStorage whenever vocabularies change
  useEffect(() => {
    if (vocabularies.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vocabularies));
    }
  }, [vocabularies]);

  // Save stats whenever they change
  useEffect(() => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }, [stats]);

  // Save lists whenever they change
  useEffect(() => {
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  }, [lists]);

  const getActiveVocabularies = (): Vocabulary[] => {
    const activeListIds = lists.filter(list => list.isActive).map(list => list.id);
    return vocabularies.filter(vocab => activeListIds.includes(vocab.listId));
  };

  const getRandomVocabularies = (count: number = 5): Vocabulary[] => {
    const activeVocabs = getActiveVocabularies();
    const availableVocabs = activeVocabs.filter(v => v.box === 0);
    const shuffled = [...availableVocabs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, availableVocabs.length));
  };

  const getVocabulariesForReview = (): Vocabulary[] => {
    const activeVocabs = getActiveVocabularies();
    const now = new Date();
    return activeVocabs.filter(vocab => {
      if (vocab.box === 0 || vocab.box === 6) return false;
      if (!vocab.nextReview) return true; // No review date set, available for review
      return vocab.nextReview <= now;
    });
  };

  const moveVocabularyToBox = (vocabId: string, newBox: number, isCorrect: boolean) => {
    setVocabularies(prev => prev.map(vocab => {
      if (vocab.id === vocabId) {
        const now = new Date();
        let nextReview: Date | undefined;
        
        if (newBox > 0 && newBox <= 5) {
          const interval = BOX_INTERVALS[newBox as keyof typeof BOX_INTERVALS];
          nextReview = new Date(now.getTime() + interval);
        }

        return {
          ...vocab,
          box: newBox,
          timesCorrect: isCorrect ? vocab.timesCorrect + 1 : vocab.timesCorrect,
          timesIncorrect: !isCorrect ? vocab.timesIncorrect + 1 : vocab.timesIncorrect,
          lastReviewed: now,
          nextReview
        };
      }
      return vocab;
    }));
  };

  const moveVocabulariesToBox = (vocabIds: string[], newBox: number) => {
    vocabIds.forEach(id => moveVocabularyToBox(id, newBox, true));
  };

  const resetVocabularyToBox1 = (vocabId: string) => {
    moveVocabularyToBox(vocabId, 1, false);
  };

  const updateDailyStats = (newLearned: number, reviewed: number) => {
    const today = new Date().toISOString().split('T')[0];
    
    setStats(prev => {
      const existingIndex = prev.findIndex(stat => stat.date === today);
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          newLearned: updated[existingIndex].newLearned + newLearned,
          reviewed: updated[existingIndex].reviewed + reviewed
        };
        return updated;
      } else {
        return [...prev, {
          date: today,
          newLearned,
          reviewed,
          totalTime: 0
        }];
      }
    });
  };

  const getAppStats = (): AppStats => {
    const today = new Date().toISOString().split('T')[0];
    const todayStats = stats.find(s => s.date === today);
    const activeVocabs = getActiveVocabularies();

    return {
      totalVocabularies: activeVocabs.length,
      notStarted: activeVocabs.filter(v => v.box === 0).length,
      inProgress: activeVocabs.filter(v => v.box >= 1 && v.box <= 5).length,
      mastered: activeVocabs.filter(v => v.box === 6).length,
      dailyStats: stats,
      todayLearned: todayStats?.newLearned || 0,
      todayReviewed: todayStats?.reviewed || 0,
      activeLists: lists.filter(l => l.isActive).length,
      totalLists: lists.length
    };
  };

  const getVocabulariesByBox = (box: number): Vocabulary[] => {
    const activeVocabs = getActiveVocabularies();
    return activeVocabs.filter(v => v.box === box);
  };

  const uploadVocabularyList = (name: string, vocabularyData: Array<{english: string, german: string}>) => {
    const listId = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create new list
    const newList: VocabularyList = {
      id: listId,
      name,
      isActive: true,
      uploadedAt: new Date(),
      vocabularyCount: vocabularyData.length
    };

    // Create vocabularies
    const newVocabularies: Vocabulary[] = vocabularyData.map((item, index) => ({
      id: `${listId}_vocab_${index}`,
      english: item.english,
      german: item.german,
      listId,
      box: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      createdAt: new Date()
    }));

    setLists(prev => [...prev, newList]);
    setVocabularies(prev => [...prev, ...newVocabularies]);
  };

  const toggleVocabularyList = (listId: string, isActive: boolean) => {
    setLists(prev => prev.map(list => 
      list.id === listId ? { ...list, isActive } : list
    ));
  };

  const deleteVocabularyList = (listId: string) => {
    setLists(prev => prev.filter(list => list.id !== listId));
    setVocabularies(prev => prev.filter(vocab => vocab.listId !== listId));
  };

  return {
    vocabularies,
    lists,
    getRandomVocabularies,
    getVocabulariesForReview,
    moveVocabularyToBox,
    moveVocabulariesToBox,
    resetVocabularyToBox1,
    updateDailyStats,
    getAppStats,
    getVocabulariesByBox,
    uploadVocabularyList,
    toggleVocabularyList,
    deleteVocabularyList
  };
}
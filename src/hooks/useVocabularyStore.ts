import { useState, useEffect } from 'react';
import { Vocabulary, LearningStats, AppStats, BOX_INTERVALS } from '../types/vocabulary';
import { initializeVocabularies } from '../data/businessVocabulary';

const STORAGE_KEY = 'peakEnglish_vocabularies';
const STATS_KEY = 'peakEnglish_stats';

export function useVocabularyStore() {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [stats, setStats] = useState<LearningStats[]>([]);

  // Initialize data on first load
  useEffect(() => {
    const savedVocabs = localStorage.getItem(STORAGE_KEY);
    const savedStats = localStorage.getItem(STATS_KEY);

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
    } else {
      const initialVocabs = initializeVocabularies();
      setVocabularies(initialVocabs);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialVocabs));
    }

    if (savedStats) {
      setStats(JSON.parse(savedStats));
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

  const getRandomVocabularies = (count: number = 5): Vocabulary[] => {
    const availableVocabs = vocabularies.filter(v => v.box === 0);
    const shuffled = [...availableVocabs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, availableVocabs.length));
  };

  const getVocabulariesForReview = (): Vocabulary[] => {
    const now = new Date();
    return vocabularies.filter(vocab => {
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

    return {
      totalVocabularies: vocabularies.length,
      notStarted: vocabularies.filter(v => v.box === 0).length,
      inProgress: vocabularies.filter(v => v.box >= 1 && v.box <= 5).length,
      mastered: vocabularies.filter(v => v.box === 6).length,
      dailyStats: stats,
      todayLearned: todayStats?.newLearned || 0,
      todayReviewed: todayStats?.reviewed || 0
    };
  };

  const getVocabulariesByBox = (box: number): Vocabulary[] => {
    return vocabularies.filter(v => v.box === box);
  };

  return {
    vocabularies,
    getRandomVocabularies,
    getVocabulariesForReview,
    moveVocabularyToBox,
    moveVocabulariesToBox,
    resetVocabularyToBox1,
    updateDailyStats,
    getAppStats,
    getVocabulariesByBox
  };
}
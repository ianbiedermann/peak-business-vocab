import { useState, useEffect } from 'react';
import { VocabularyRepository } from '@/repositories/VocabularyRepository';
import { Vocabulary, VocabularyList, LearningStats, AppStats } from '../types/vocabulary';

export function useVocabularyStore() {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [stats, setStats] = useState<LearningStats[]>([]);
  const [lists, setLists] = useState<VocabularyList[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from local storage (offline-first)
  const loadData = async () => {
    console.log('🔄 Loading data from local storage...');
    setLoading(true);
    
    try {
      // Try to sync default lists from Supabase on first load
      await VocabularyRepository.syncDefaultListsFromSupabase();
      
      // Load all data from local storage
      const [localLists, localVocabs, localStats] = await Promise.all([
        VocabularyRepository.getAllLists(),
        VocabularyRepository.getAllWords(),
        VocabularyRepository.getStats(),
      ]);

      // Transform to UI format
      const transformedLists: VocabularyList[] = localLists.map(list => ({
        id: list.id,
        name: list.name,
        isActive: list.is_active,
        uploadedAt: new Date(list.created_at),
        vocabularyCount: list.vocabulary_count,
        isDefault: list.is_default,
        isPremium: list.premium_required || false,
        isUserUploaded: !list.is_default,
      }));

      const transformedVocabs: Vocabulary[] = localVocabs.map(vocab => ({
        id: vocab.id,
        english: vocab.english,
        german: vocab.german,
        listId: vocab.list_id,
        box: vocab.box,
        nextReview: vocab.next_review ? new Date(vocab.next_review) : undefined,
        timesCorrect: vocab.times_correct,
        timesIncorrect: vocab.times_incorrect,
        lastReviewed: vocab.last_reviewed ? new Date(vocab.last_reviewed) : undefined,
        createdAt: new Date(vocab.created_at),
        isDefaultVocab: transformedLists.find(l => l.id === vocab.list_id)?.isDefault || false,
      }));

      const transformedStats: LearningStats[] = localStats.map(stat => ({
        date: stat.date,
        newLearned: stat.new_learned,
        reviewed: stat.reviewed,
        totalTime: stat.total_time,
      }));

      setLists(transformedLists);
      setVocabularies(transformedVocabs);
      setStats(transformedStats);

      console.log(`✅ Loaded ${transformedLists.length} lists, ${transformedVocabs.length} vocabularies, ${transformedStats.length} stats from local storage`);
    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const moveVocabularyToBox = async (vocabId: string, newBox: number, isCorrect: boolean) => {
    try {
      await VocabularyRepository.moveWordToBox(vocabId, newBox, isCorrect);
      
      // Update local state
      const updatedVocabs = await VocabularyRepository.getAllWords();
      const transformedVocabs: Vocabulary[] = updatedVocabs.map(vocab => ({
        id: vocab.id,
        english: vocab.english,
        german: vocab.german,
        listId: vocab.list_id,
        box: vocab.box,
        nextReview: vocab.next_review ? new Date(vocab.next_review) : undefined,
        timesCorrect: vocab.times_correct,
        timesIncorrect: vocab.times_incorrect,
        lastReviewed: vocab.last_reviewed ? new Date(vocab.last_reviewed) : undefined,
        createdAt: new Date(vocab.created_at),
        isDefaultVocab: lists.find(l => l.id === vocab.list_id)?.isDefault || false,
      }));
      
      setVocabularies(transformedVocabs);
    } catch (error) {
      console.error('Error updating vocabulary:', error);
      throw error;
    }
  };

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
      if (!vocab.nextReview) return true;
      return vocab.nextReview <= now;
    });
  };

  const getListsWithCorrectCounts = (): VocabularyList[] => {
    return lists.map(list => {
      const vocabsInList = vocabularies.filter(vocab => vocab.listId === list.id);
      return {
        ...list,
        vocabularyCount: vocabsInList.length
      };
    });
  };
    
  const moveVocabulariesToBox = (vocabIds: string[], newBox: number) => {
    vocabIds.forEach(id => moveVocabularyToBox(id, newBox, true));
  };

  const resetVocabularyToBox1 = (vocabId: string) => {
    moveVocabularyToBox(vocabId, 1, false);
  };

  const updateDailyStats = async (newLearned: number, reviewed: number) => {
    try {
      await VocabularyRepository.updateDailyStats(newLearned, reviewed);
      
      // Update local state
      const updatedStats = await VocabularyRepository.getStats();
      const transformedStats: LearningStats[] = updatedStats.map(stat => ({
        date: stat.date,
        newLearned: stat.new_learned,
        reviewed: stat.reviewed,
        totalTime: stat.total_time,
      }));
      
      setStats(transformedStats);
    } catch (error) {
      console.error('Error updating daily stats:', error);
    }
  };

  const getAppStats = (): AppStats => {
    const activeVocabs = getActiveVocabularies();
    
    return {
      totalVocabularies: activeVocabs.length,
      notStarted: activeVocabs.filter(v => v.box === 0).length,
      inProgress: activeVocabs.filter(v => v.box > 0 && v.box < 6).length,
      mastered: activeVocabs.filter(v => v.box === 6).length,
      dailyStats: stats,
      todayLearned: stats[0]?.newLearned || 0,
      todayReviewed: stats[0]?.reviewed || 0,
      activeLists: lists.filter(l => l.isActive).length,
      totalLists: lists.length,
    };
  };

  const getVocabulariesByBox = (box: number): Vocabulary[] => {
    const activeVocabs = getActiveVocabularies();
    return activeVocabs.filter(vocab => vocab.box === box);
  };

  const uploadVocabularyList = async (
    name: string,
    vocabularyData: Array<{ english: string; german: string }>
  ): Promise<string> => {
    try {
      const list = await VocabularyRepository.createList(name, vocabularyData);
      
      // Reload data
      await loadData();
      
      return list.id;
    } catch (error) {
      console.error('Error uploading vocabulary list:', error);
      throw error;
    }
  };

  const toggleVocabularyList = async (listId: string, isActive: boolean) => {
    try {
      await VocabularyRepository.toggleList(listId, isActive);
      
      // Update local state
      setLists(prev => prev.map(list => 
        list.id === listId ? { ...list, isActive } : list
      ));
    } catch (error) {
      console.error('Error toggling list:', error);
      throw error;
    }
  };

  const deleteVocabularyList = async (listId: string) => {
    try {
      await VocabularyRepository.deleteList(listId);
      
      // Update local state
      setLists(prev => prev.filter(list => list.id !== listId));
      setVocabularies(prev => prev.filter(vocab => vocab.listId !== listId));
    } catch (error) {
      console.error('Error deleting list:', error);
      throw error;
    }
  };

  return {
    vocabularies,
    stats,
    lists,
    loading,
    moveVocabularyToBox,
    getRandomVocabularies,
    getVocabulariesForReview,
    getListsWithCorrectCounts,
    moveVocabulariesToBox,
    resetVocabularyToBox1,
    updateDailyStats,
    getAppStats,
    getVocabulariesByBox,
    uploadVocabularyList,
    toggleVocabularyList,
    deleteVocabularyList,
    reloadData: loadData,
  };
}

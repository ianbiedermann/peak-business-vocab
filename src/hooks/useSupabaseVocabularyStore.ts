import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Vocabulary, VocabularyList, LearningStats, AppStats, BOX_INTERVALS } from '../types/vocabulary';

interface DefaultVocabularyList {
  id: string;
  name: string;
  vocabulary_count: number;
  created_at: string;
}

interface DefaultVocabulary {
  id: string;
  english: string;
  german: string;
  list_id: string;
}

interface UserListPreference {
  id: string;
  list_id: string;
  is_active: boolean;
}

export function useSupabaseVocabularyStore() {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [stats, setStats] = useState<LearningStats[]>([]);
  const [defaultLists, setDefaultLists] = useState<VocabularyList[]>([]);
  const [userPreferences, setUserPreferences] = useState<UserListPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadDefaultLists(),
        loadUserVocabularies(),
        loadUserStats(),
        loadUserPreferences()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDefaultLists = async () => {
    const { data, error } = await supabase
      .from('default_vocabulary_lists')
      .select('*')
      .order('created_at');

    if (error) {
      console.error('Error loading default lists:', error);
      return;
    }

    const lists: VocabularyList[] = data.map(list => ({
      id: list.id,
      name: list.name,
      isActive: true, // Will be overridden by user preferences
      uploadedAt: new Date(list.created_at),
      vocabularyCount: list.vocabulary_count
    }));

    setDefaultLists(lists);
  };

  const loadUserPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_list_preferences')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error loading user preferences:', error);
      return;
    }

    setUserPreferences(data || []);

    // Create preferences for lists that don't have them yet
    const existingListIds = data?.map(p => p.list_id) || [];
    const missingPreferences = defaultLists.filter(list => !existingListIds.includes(list.id));

    for (const list of missingPreferences) {
      await createUserPreference(list.id, true);
    }
  };

  const createUserPreference = async (listId: string, isActive: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_list_preferences')
      .insert({
        user_id: user.id,
        list_id: listId,
        is_active: isActive
      });

    if (error) {
      console.error('Error creating user preference:', error);
    } else {
      setUserPreferences(prev => [...prev, { id: crypto.randomUUID(), list_id: listId, is_active: isActive }]);
    }
  };

  const loadUserVocabularies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('vocabularies')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error loading vocabularies:', error);
      return;
    }

    const vocabs: Vocabulary[] = data.map(vocab => ({
      id: vocab.id,
      english: vocab.english,
      german: vocab.german,
      listId: vocab.list_id,
      box: vocab.box,
      nextReview: vocab.next_review ? new Date(vocab.next_review) : undefined,
      timesCorrect: vocab.times_correct,
      timesIncorrect: vocab.times_incorrect,
      lastReviewed: vocab.last_reviewed ? new Date(vocab.last_reviewed) : undefined,
      createdAt: new Date(vocab.created_at)
    }));

    setVocabularies(vocabs);
  };

  const loadUserStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('learning_stats')
      .select('*')
      .eq('user_id', user.id)
      .order('date');

    if (error) {
      console.error('Error loading stats:', error);
      return;
    }

    const statsData: LearningStats[] = data.map(stat => ({
      date: stat.date,
      newLearned: stat.new_learned,
      reviewed: stat.reviewed,
      totalTime: stat.total_time
    }));

    setStats(statsData);
  };

  // Get lists with user preferences applied
  const getListsWithPreferences = (): VocabularyList[] => {
    return defaultLists.map(list => {
      const preference = userPreferences.find(p => p.list_id === list.id);
      return {
        ...list,
        isActive: preference ? preference.is_active : true
      };
    });
  };

  const getActiveVocabularies = (): Vocabulary[] => {
    const listsWithPrefs = getListsWithPreferences();
    const activeListIds = listsWithPrefs.filter(list => list.isActive).map(list => list.id);
    return vocabularies.filter(vocab => activeListIds.includes(vocab.listId));
  };

  const getRandomVocabularies = async (count: number = 5): Promise<Vocabulary[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get active list IDs
    const listsWithPrefs = getListsWithPreferences();
    const activeListIds = listsWithPrefs.filter(list => list.isActive).map(list => list.id);

    if (activeListIds.length === 0) return [];

    // Get default vocabularies from active lists
    const { data: defaultVocabs, error } = await supabase
      .from('default_vocabularies')
      .select('*')
      .in('list_id', activeListIds)
      .limit(count * 3); // Get more to ensure we have enough after filtering

    if (error) {
      console.error('Error loading default vocabularies:', error);
      return [];
    }

    // Filter out vocabularies that user already has progress on
    const userVocabIds = vocabularies.map(v => v.id);
    const availableVocabs = defaultVocabs.filter(dv => !userVocabIds.includes(dv.id));

    // Shuffle and take the requested count
    const shuffled = [...availableVocabs].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, availableVocabs.length));

    // Convert to Vocabulary format and create user vocabulary records
    const newVocabularies: Vocabulary[] = [];
    for (const dv of selected) {
      const newVocab: Vocabulary = {
        id: dv.id,
        english: dv.english,
        german: dv.german,
        listId: dv.list_id,
        box: 0,
        timesCorrect: 0,
        timesIncorrect: 0,
        createdAt: new Date()
      };

      // Create user vocabulary record
      const { error: insertError } = await supabase
        .from('vocabularies')
        .insert({
          id: dv.id,
          user_id: user.id,
          english: dv.english,
          german: dv.german,
          list_id: dv.list_id,
          default_vocabulary_id: dv.id,
          box: 0,
          times_correct: 0,
          times_incorrect: 0
        });

      if (!insertError) {
        newVocabularies.push(newVocab);
      }
    }

    // Update local state
    setVocabularies(prev => [...prev, ...newVocabularies]);
    return newVocabularies;
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

  const moveVocabularyToBox = async (vocabId: string, newBox: number, isCorrect: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    let nextReview: Date | undefined;
    
    if (newBox > 0 && newBox <= 5) {
      const interval = BOX_INTERVALS[newBox as keyof typeof BOX_INTERVALS];
      nextReview = new Date(now.getTime() + interval);
    }

    const vocab = vocabularies.find(v => v.id === vocabId);
    if (!vocab) return;

    const updatedVocab = {
      box: newBox,
      times_correct: isCorrect ? vocab.timesCorrect + 1 : vocab.timesCorrect,
      times_incorrect: !isCorrect ? vocab.timesIncorrect + 1 : vocab.timesIncorrect,
      last_reviewed: now.toISOString(),
      next_review: nextReview?.toISOString()
    };

    const { error } = await supabase
      .from('vocabularies')
      .update(updatedVocab)
      .eq('id', vocabId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating vocabulary:', error);
      return;
    }

    // Update local state
    setVocabularies(prev => prev.map(v => 
      v.id === vocabId ? {
        ...v,
        box: newBox,
        timesCorrect: isCorrect ? v.timesCorrect + 1 : v.timesCorrect,
        timesIncorrect: !isCorrect ? v.timesIncorrect + 1 : v.timesIncorrect,
        lastReviewed: now,
        nextReview
      } : v
    ));
  };

  const updateDailyStats = async (newLearned: number, reviewed: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    const { data: existingStat, error: fetchError } = await supabase
      .from('learning_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching daily stats:', fetchError);
      return;
    }

    if (existingStat) {
      // Update existing record
      const { error } = await supabase
        .from('learning_stats')
        .update({
          new_learned: existingStat.new_learned + newLearned,
          reviewed: existingStat.reviewed + reviewed
        })
        .eq('id', existingStat.id);

      if (error) {
        console.error('Error updating daily stats:', error);
      }
    } else {
      // Create new record
      const { error } = await supabase
        .from('learning_stats')
        .insert({
          user_id: user.id,
          date: today,
          new_learned: newLearned,
          reviewed: reviewed,
          total_time: 0
        });

      if (error) {
        console.error('Error creating daily stats:', error);
      }
    }

    // Reload stats
    await loadUserStats();
  };

  const toggleVocabularyList = async (listId: string, isActive: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existingPreference = userPreferences.find(p => p.list_id === listId);

    if (existingPreference) {
      const { error } = await supabase
        .from('user_list_preferences')
        .update({ is_active: isActive })
        .eq('user_id', user.id)
        .eq('list_id', listId);

      if (error) {
        console.error('Error updating list preference:', error);
        return;
      }

      setUserPreferences(prev => prev.map(p => 
        p.list_id === listId ? { ...p, is_active: isActive } : p
      ));
    } else {
      await createUserPreference(listId, isActive);
    }
  };

  const getAppStats = (): AppStats => {
    const today = new Date().toISOString().split('T')[0];
    const todayStats = stats.find(s => s.date === today);
    const activeVocabs = getActiveVocabularies();
    const listsWithPrefs = getListsWithPreferences();

    return {
      totalVocabularies: activeVocabs.length,
      notStarted: activeVocabs.filter(v => v.box === 0).length,
      inProgress: activeVocabs.filter(v => v.box >= 1 && v.box <= 5).length,
      mastered: activeVocabs.filter(v => v.box === 6).length,
      dailyStats: stats,
      todayLearned: todayStats?.newLearned || 0,
      todayReviewed: todayStats?.reviewed || 0,
      activeLists: listsWithPrefs.filter(l => l.isActive).length,
      totalLists: listsWithPrefs.length
    };
  };

  const getVocabulariesByBox = (box: number): Vocabulary[] => {
    const activeVocabs = getActiveVocabularies();
    return activeVocabs.filter(v => v.box === box);
  };

  return {
    vocabularies,
    lists: getListsWithPreferences(),
    isLoading,
    getRandomVocabularies,
    getVocabulariesForReview,
    moveVocabularyToBox,
    updateDailyStats,
    getAppStats,
    getVocabulariesByBox,
    toggleVocabularyList,
    // No upload/delete for default lists
    uploadVocabularyList: () => Promise.resolve(),
    deleteVocabularyList: () => {}
  };
}
import { useState, useEffect } from 'react';
import { Vocabulary, VocabularyList, LearningStats, AppStats, BOX_INTERVALS } from '../types/vocabulary';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export function useVocabularyStore() {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [stats, setStats] = useState<LearningStats[]>([]);
  const [lists, setLists] = useState<VocabularyList[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load data from Supabase when user is authenticated
  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      // Clear data when user logs out
      setVocabularies([]);
      setStats([]);
      setLists([]);
      setLoading(false);
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load vocabulary lists
      const { data: listsData, error: listsError } = await supabase
        .from('vocabulary_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (listsError) throw listsError;

      // Transform database data to match our interface
      const transformedLists: VocabularyList[] = listsData?.map(list => ({
        id: list.id,
        name: list.name,
        isActive: list.is_active,
        uploadedAt: new Date(list.uploaded_at),
        vocabularyCount: list.vocabulary_count
      })) || [];

      setLists(transformedLists);

      // Load vocabularies
      const { data: vocabsData, error: vocabsError } = await supabase
        .from('vocabularies')
        .select('*')
        .eq('user_id', user.id);

      if (vocabsError) throw vocabsError;

      // Transform database data to match our interface
      const transformedVocabs: Vocabulary[] = vocabsData?.map(vocab => ({
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
      })) || [];

      setVocabularies(transformedVocabs);

      // Load learning stats
      const { data: statsData, error: statsError } = await supabase
        .from('learning_stats')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (statsError) throw statsError;

      const transformedStats: LearningStats[] = statsData?.map(stat => ({
        date: stat.date,
        newLearned: stat.new_learned,
        reviewed: stat.reviewed,
        totalTime: stat.total_time
      })) || [];

      setStats(transformedStats);

    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Fehler beim Laden der Daten",
        description: "Deine Daten konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActiveVocabularies = (): Vocabulary[] => {
    const activeListIds = lists.filter(list => list.isActive).map(list => list.id);
    const activeVocabs = vocabularies.filter(vocab => activeListIds.includes(vocab.listId));
    console.log('Active Lists:', activeListIds);
    console.log('All Vocabularies:', vocabularies.length);
    console.log('Active Vocabularies:', activeVocabs.length);
    return activeVocabs;
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

  const moveVocabularyToBox = async (vocabId: string, newBox: number, isCorrect: boolean) => {
    if (!user) return;

    try {
      const now = new Date();
      let nextReview: string | null = null;
      
      if (newBox > 0 && newBox <= 5) {
        const interval = BOX_INTERVALS[newBox as keyof typeof BOX_INTERVALS];
        nextReview = new Date(now.getTime() + interval).toISOString();
      }

      const vocab = vocabularies.find(v => v.id === vocabId);
      if (!vocab) return;

      const { error } = await supabase
        .from('vocabularies')
        .update({
          box: newBox,
          times_correct: isCorrect ? vocab.timesCorrect + 1 : vocab.timesCorrect,
          times_incorrect: !isCorrect ? vocab.timesIncorrect + 1 : vocab.timesIncorrect,
          last_reviewed: now.toISOString(),
          next_review: nextReview
        })
        .eq('id', vocabId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setVocabularies(prev => prev.map(v => {
        if (v.id === vocabId) {
          return {
            ...v,
            box: newBox,
            timesCorrect: isCorrect ? v.timesCorrect + 1 : v.timesCorrect,
            timesIncorrect: !isCorrect ? v.timesIncorrect + 1 : v.timesIncorrect,
            lastReviewed: now,
            nextReview: nextReview ? new Date(nextReview) : undefined
          };
        }
        return v;
      }));

    } catch (error) {
      console.error('Error updating vocabulary:', error);
      toast({
        title: "Fehler beim Speichern",
        description: "Der Fortschritt konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    }
  };

  const moveVocabulariesToBox = async (vocabIds: string[], newBox: number) => {
    for (const id of vocabIds) {
      await moveVocabularyToBox(id, newBox, true);
    }
  };

  const resetVocabularyToBox1 = async (vocabId: string) => {
    await moveVocabularyToBox(vocabId, 1, false);
  };

  const updateDailyStats = async (newLearned: number, reviewed: number) => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Try to update existing record first
      const { data: existingStats } = await supabase
        .from('learning_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (existingStats) {
        // Update existing record
        const { error } = await supabase
          .from('learning_stats')
          .update({
            new_learned: existingStats.new_learned + newLearned,
            reviewed: existingStats.reviewed + reviewed
          })
          .eq('user_id', user.id)
          .eq('date', today);

        if (error) throw error;

        // Update local state
        setStats(prev => prev.map(stat => 
          stat.date === today 
            ? {
                ...stat,
                newLearned: stat.newLearned + newLearned,
                reviewed: stat.reviewed + reviewed
              }
            : stat
        ));
      } else {
        // Insert new record
        const { error } = await supabase
          .from('learning_stats')
          .insert({
            user_id: user.id,
            date: today,
            new_learned: newLearned,
            reviewed: reviewed,
            total_time: 0
          });

        if (error) throw error;

        // Update local state
        setStats(prev => [...prev, {
          date: today,
          newLearned,
          reviewed,
          totalTime: 0
        }]);
      }

    } catch (error) {
      console.error('Error updating daily stats:', error);
      toast({
        title: "Fehler beim Speichern der Statistiken",
        description: "Die Lernstatistiken konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    }
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

  const uploadVocabularyList = async (name: string, vocabularyData: Array<{english: string, german: string}>) => {
    if (!user) return;

    try {
      // Insert vocabulary list
      const { data: listData, error: listError } = await supabase
        .from('vocabulary_lists')
        .insert({
          user_id: user.id,
          name,
          is_active: true,
          vocabulary_count: vocabularyData.length
        })
        .select()
        .single();

      if (listError) throw listError;

      // Insert vocabularies
      const vocabulariesToInsert = vocabularyData.map(item => ({
        user_id: user.id,
        list_id: listData.id,
        english: item.english,
        german: item.german,
        box: 0,
        times_correct: 0,
        times_incorrect: 0
      }));

      const { data: vocabData, error: vocabError } = await supabase
        .from('vocabularies')
        .insert(vocabulariesToInsert)
        .select();

      if (vocabError) throw vocabError;

      // Update local state
      const newList: VocabularyList = {
        id: listData.id,
        name: listData.name,
        isActive: listData.is_active,
        uploadedAt: new Date(listData.uploaded_at),
        vocabularyCount: listData.vocabulary_count
      };

      const newVocabularies: Vocabulary[] = vocabData?.map(vocab => ({
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
      })) || [];

      setLists(prev => [newList, ...prev]);
      setVocabularies(prev => [...prev, ...newVocabularies]);

      toast({
        title: "Liste erfolgreich hochgeladen",
        description: `${vocabularyData.length} Vokabeln wurden hinzugefügt.`,
      });

    } catch (error) {
      console.error('Error uploading vocabulary list:', error);
      toast({
        title: "Fehler beim Hochladen",
        description: "Die Vokabelliste konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    }
  };

  const toggleVocabularyList = async (listId: string, isActive: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('vocabulary_lists')
        .update({ is_active: isActive })
        .eq('id', listId)
        .eq('user_id', user.id);

      if (error) throw error;

      setLists(prev => prev.map(list => 
        list.id === listId ? { ...list, isActive } : list
      ));

    } catch (error) {
      console.error('Error toggling vocabulary list:', error);
      toast({
        title: "Fehler beim Aktualisieren",
        description: "Der Status der Liste konnte nicht geändert werden.",
        variant: "destructive",
      });
    }
  };

  const deleteVocabularyList = async (listId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('vocabulary_lists')
        .delete()
        .eq('id', listId)
        .eq('user_id', user.id);

      if (error) throw error;

      setLists(prev => prev.filter(list => list.id !== listId));
      setVocabularies(prev => prev.filter(vocab => vocab.listId !== listId));

      toast({
        title: "Liste gelöscht",
        description: "Die Vokabelliste wurde erfolgreich gelöscht.",
      });

    } catch (error) {
      console.error('Error deleting vocabulary list:', error);
      toast({
        title: "Fehler beim Löschen",
        description: "Die Liste konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
  };

  return {
    vocabularies,
    lists,
    loading,
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
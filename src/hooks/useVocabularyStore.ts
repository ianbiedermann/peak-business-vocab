import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Vocabulary, VocabularyList, LearningStats, AppStats, BOX_INTERVALS } from '../types/vocabulary';

export function useVocabularyStore() {
const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
const [stats, setStats] = useState<LearningStats[]>([]);
const [lists, setLists] = useState<VocabularyList[]>([]);
const [loading, setLoading] = useState(true);
const { user } = useAuth();

// Optimierte loadData Funktion mit korrigiertem Default-Vocab Mapping
const loadData = async () => {
  if (!user) return;

  // Prevent multiple simultaneous loads
  if (loading) {
    console.log('⚠️ loadData already running, skipping...');
    return;
  }

  setLoading(true);
  console.log('🔄 Starting loadData...');
  
  try {
    // Parallel loading of all basic data
    const [userListsResult, defaultListsResult, userPreferencesResult, learningStatsResult] = await Promise.all([
      // Load user vocabulary lists
      supabase
        .from('vocabulary_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      
      // Load default vocabulary lists
      supabase
        .from('default_vocabulary_lists')
        .select('*')
        .order('created_at', { ascending: false }),
      
      // Load user preferences for default lists
      supabase
        .from('user_list_preferences')
        .select('*')
        .eq('user_id', user.id),
      
      // Load learning stats
      supabase
        .from('learning_stats')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
    ]);

    console.log('✅ Basic data loaded');

    // Process lists immediately
    const userLists = userListsResult.data || [];
    const defaultLists = defaultListsResult.data || [];
    const userPreferences = userPreferencesResult.data || [];

    // Combine lists
    const combinedLists: VocabularyList[] = [
      ...userLists.map(list => ({
        id: list.id,
        name: list.name,
        isActive: list.is_active,
        uploadedAt: new Date(list.uploaded_at),
        vocabularyCount: list.vocabulary_count
      })),
      ...defaultLists.map(list => {
        const preference = userPreferences.find(p => p.list_id === list.id);
        return {
          id: list.id,
          name: list.name,
          isActive: preference?.is_active ?? true,
          uploadedAt: new Date(list.created_at),
          vocabularyCount: list.vocabulary_count
        };
      })
    ];

    // Update lists first (so UI shows correct list counts immediately)
    setLists(combinedLists);
    console.log('✅ Lists updated in UI');

    // Load ALL default lists (not just active ones) so counts are correct
    const allDefaultListIds = combinedLists
      .filter(list => !userLists.some(ul => ul.id === list.id))
      .map(list => list.id);
    
    // Parallel loading of vocabularies
    const [userVocabsResult, defaultVocabsResult] = await Promise.all([
      // Load user vocabularies
      supabase
        .from('vocabularies')
        .select('*')
        .eq('user_id', user.id),
      
      // Load ALL default vocabularies (so we can show correct counts)
      allDefaultListIds.length > 0 
        ? supabase
            .from('default_vocabularies')
            .select('*')
            .in('list_id', allDefaultListIds)
        : Promise.resolve({ data: [] })
    ]);

    console.log('✅ Vocabularies loaded');

    const userVocabs = userVocabsResult.data || [];
    const defaultVocabs = defaultVocabsResult.data || [];

    // WICHTIG: User Progress für ALLE default vocabularies laden, nicht nur die aktiven Listen
    const allDefaultVocabIds = defaultVocabs.map(v => v.id);
    
    console.log('🔍 Loading user progress for vocabs:', {
      totalDefaultVocabs: allDefaultVocabIds.length,
      sampleIds: allDefaultVocabIds.slice(0, 5)
    });

    // CORS-Fix: Lade Progress-Daten in kleineren Batches um große URLs zu vermeiden
    let userProgress: any[] = [];
    
    if (allDefaultVocabIds.length > 0) {
      try {
        // Split IDs into smaller chunks to avoid URL length limits and CORS issues
        const BATCH_SIZE = 100; // Reduzierte Batch-Größe
        const batches = [];
        
        for (let i = 0; i < allDefaultVocabIds.length; i += BATCH_SIZE) {
          batches.push(allDefaultVocabIds.slice(i, i + BATCH_SIZE));
        }
        
        console.log(`🔄 Loading progress in ${batches.length} batches of max ${BATCH_SIZE} items each`);
        
        // Load all batches in parallel
        const batchResults = await Promise.all(
          batches.map(async (batch, index) => {
            console.log(`📦 Loading batch ${index + 1}/${batches.length} with ${batch.length} items`);
            
            const result = await supabase
              .from('user_vocabulary_progress')
              .select('*')
              .eq('user_id', user.id)
              .in('vocabulary_id', batch);
              
            if (result.error) {
              console.error(`❌ Error in batch ${index + 1}:`, result.error);
              return [];
            }
            
            console.log(`✅ Batch ${index + 1} loaded: ${result.data?.length || 0} progress entries`);
            return result.data || [];
          })
        );
        
        // Combine all batch results
        userProgress = batchResults.flat();
        console.log(`🎯 Total progress entries loaded: ${userProgress.length}`);
        
      } catch (error) {
        console.error('❌ Error loading user progress in batches:', error);
        userProgress = [];
      }
    }

    console.log('✅ User progress loaded:', {
      progressEntries: userProgress.length,
      vocabsWithProgress: userProgress.filter(p => p.box > 0).length
    });

    // Debug: Überprüfe die Verknüpfung zwischen Vocab IDs und Progress
    const progressByVocabId = new Map(userProgress.map(p => [p.vocabulary_id, p]));
    console.log('🔧 Progress mapping verification:', {
      firstFiveDefaultVocabs: defaultVocabs.slice(0, 5).map(v => ({
        vocabId: v.id,
        english: v.english,
        hasProgress: progressByVocabId.has(v.id),
        progress: progressByVocabId.get(v.id)
      }))
    });
    
    // Map vocabularies - Korrigierte Verknüpfung
    const mappedUserVocabs: Vocabulary[] = userVocabs.map(vocab => ({
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
      isDefaultVocab: false
    }));

    const mappedDefaultVocabs: Vocabulary[] = defaultVocabs.map(vocab => {
      // Verwende die Map für bessere Performance und korrekte Verknüpfung
      const progress = progressByVocabId.get(vocab.id);
      
      const result = {
        id: vocab.id,
        english: vocab.english,
        german: vocab.german,
        listId: vocab.list_id,
        box: progress?.box ?? 0,
        nextReview: progress?.next_review ? new Date(progress.next_review) : undefined,
        timesCorrect: progress?.times_correct ?? 0,
        timesIncorrect: progress?.times_incorrect ?? 0,
        lastReviewed: progress?.last_reviewed ? new Date(progress.last_reviewed) : undefined,
        createdAt: new Date(vocab.created_at),
        isDefaultVocab: true
      };

      // Debug für problematische Vokabeln
      if (progress && progress.box > 0) {
        console.log(`✅ Found progress for vocab ${vocab.id}:`, {
          english: vocab.english,
          box: result.box,
          timesCorrect: result.timesCorrect
        });
      }
      
      return result;
    });
    
    // Detailliertes Debug-Logging nach dem Mapping
    const vocabsWithProgress = mappedDefaultVocabs.filter(v => v.box > 0);
    console.log('📊 Final Vocabulary Mapping Summary:', {
      userVocabs: mappedUserVocabs.length,
      defaultVocabs: mappedDefaultVocabs.length,
      defaultVocabsWithProgress: vocabsWithProgress.length,
      progressExamples: vocabsWithProgress.slice(0, 3).map(v => ({
        id: v.id,
        english: v.english,
        box: v.box,
        timesCorrect: v.timesCorrect
      })),
      boxDistribution: {
        box0: mappedDefaultVocabs.filter(v => v.box === 0).length,
        box1: mappedDefaultVocabs.filter(v => v.box === 1).length,
        box2: mappedDefaultVocabs.filter(v => v.box === 2).length,
        box3: mappedDefaultVocabs.filter(v => v.box === 3).length,
        box4: mappedDefaultVocabs.filter(v => v.box === 4).length,
        box5: mappedDefaultVocabs.filter(v => v.box === 5).length,
        box6: mappedDefaultVocabs.filter(v => v.box === 6).length,
      }
    });
    
    // Update vocabularies (this will update the box counts)
    const allVocabs = [...mappedUserVocabs, ...mappedDefaultVocabs];
    setVocabularies(allVocabs);

    console.log(`✅ Final update: ${allVocabs.length} vocabularies (User: ${mappedUserVocabs.length}, Default: ${mappedDefaultVocabs.length})`);

    // Update stats
    const mappedStats: LearningStats[] = (learningStatsResult.data || []).map(stat => ({
      date: stat.date,
      newLearned: stat.new_learned,
      reviewed: stat.reviewed,
      totalTime: stat.total_time
    }));

    setStats(mappedStats);
    console.log('✅ Stats updated');

  } catch (error) {
    console.error('❌ Error loading data:', error);
  } finally {
    setLoading(false);
    console.log('✅ loadData completed');
  }
};

  
// Optimierter useEffect mit Debouncing
useEffect(() => {
  let timeoutId: NodeJS.Timeout;
  
  if (user) {
    // Debounce to prevent multiple rapid calls
    timeoutId = setTimeout(() => {
      loadData();
    }, 100);
  } else {
    setVocabularies([]);
    setStats([]);
    setLists([]);
    setLoading(false);
  }

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}, [user]);


const moveVocabularyToBox = async (vocabId: string, newBox: number, isCorrect: boolean) => {
  if (!user) return;

  const now = new Date();
  let nextReview: Date | undefined;

  if (newBox > 0 && newBox <= 5) {
    const intervalDays = BOX_INTERVALS[newBox];
    nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + intervalDays);
    
    console.log('⏰ Next review calculation:', {
      currentBox: newBox,
      intervalDays,
      nextReview: nextReview.toISOString()
    });
  }

  const vocab = vocabularies.find(v => v.id === vocabId);
  if (!vocab) return;

  const updatedVocab = {
    ...vocab,
    box: newBox,
    timesCorrect: isCorrect ? vocab.timesCorrect + 1 : vocab.timesCorrect,
    timesIncorrect: !isCorrect ? vocab.timesIncorrect + 1 : vocab.timesIncorrect,
    lastReviewed: now,
    nextReview
  };

  try {
    if (vocab.isDefaultVocab) {
      // Für Standard-Vokabeln: in user_vocabulary_progress speichern
      const { error } = await supabase
        .from('user_vocabulary_progress')
        .upsert({
          user_id: user.id,
          vocabulary_id: vocabId,
          box: newBox,
          next_review: nextReview?.toISOString(),
          times_correct: updatedVocab.timesCorrect,
          times_incorrect: updatedVocab.timesIncorrect,
          last_reviewed: now.toISOString(),
          updated_at: now.toISOString()
        }, {
          onConflict: 'user_id,vocabulary_id'
        });

      if (error) {
        console.error('❌ Error updating default vocab progress:', error);
        throw error;
      }
      
      console.log('✅ Updated default vocab progress:', {
        vocabId,
        box: newBox,
        timesCorrect: updatedVocab.timesCorrect
      });
    } else {
      // Für User-Vokabeln: in vocabularies speichern
      const { error } = await supabase
        .from('vocabularies')
        .update({
          box: newBox,
          times_correct: updatedVocab.timesCorrect,
          times_incorrect: updatedVocab.timesIncorrect,
          last_reviewed: now.toISOString(),
          next_review: nextReview?.toISOString()
        })
        .eq('id', vocabId)
        .eq('user_id', user.id);

      if (error) throw error;
    }

    // Update local state
    setVocabularies(prev => prev.map(vocabulary => {
      if (vocabulary.id === vocabId) {
        return updatedVocab;
      }
      return vocabulary;
    }));

  } catch (error) {
    console.error('Error updating vocabulary:', error);
    throw error;
  }
};

// Initialize data on user login
useEffect(() => {
  let timeoutId: NodeJS.Timeout;
  
  if (user) {
    timeoutId = setTimeout(() => {
      loadData();
    }, 100);
  } else {
    setVocabularies([]);
    setStats([]);
    setLists([]);
    setLoading(false);
  }

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}, [user]);

// Erweitere getActiveVocabularies um detaillierteres Logging:
const getActiveVocabularies = (): Vocabulary[] => {
  const activeListIds = lists.filter(list => list.isActive).map(list => list.id);
  const activeVocabs = vocabularies.filter(vocab => activeListIds.includes(vocab.listId));
  
  // Detaillierte Box-Analyse für aktive Vokabeln
  const boxDistribution = {
    box0: activeVocabs.filter(v => v.box === 0).length,
    box1: activeVocabs.filter(v => v.box === 1).length,
    box2: activeVocabs.filter(v => v.box === 2).length,
    box3: activeVocabs.filter(v => v.box === 3).length,
    box4: activeVocabs.filter(v => v.box === 4).length,
    box5: activeVocabs.filter(v => v.box === 5).length,
    box6: activeVocabs.filter(v => v.box === 6).length,
  };

  // Sample der ersten 10 aktiven Vokabeln für Detail-Debug
  const sampleVocabs = activeVocabs.slice(0, 10).map(v => ({
    id: v.id,
    english: v.english,
    box: v.box,
    isDefault: v.isDefaultVocab,
    listId: v.listId,
    timesCorrect: v.timesCorrect
  }));

  console.log('🔍 getActiveVocabularies DETAILED Debug:', {
    totalLists: lists.length,
    activeLists: activeListIds.length,
    activeListIds,
    totalVocabs: vocabularies.length,
    activeVocabs: activeVocabs.length,
    boxDistribution,
    sampleVocabs,
    vocabsByList: activeListIds.map(listId => {
      const listVocabs = vocabularies.filter(v => v.listId === listId);
      return {
        listId,
        totalCount: listVocabs.length,
        boxDistribution: {
          box0: listVocabs.filter(v => v.box === 0).length,
          box1: listVocabs.filter(v => v.box === 1).length,
          box2: listVocabs.filter(v => v.box === 2).length,
          box3: listVocabs.filter(v => v.box === 3).length,
          box4: listVocabs.filter(v => v.box === 4).length,
          box5: listVocabs.filter(v => v.box === 5).length,
          box6: listVocabs.filter(v => v.box === 6).length,
        }
      };
    })
  });
  
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
if (!vocab.nextReview) return true; // No review date set, available for review
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
if (!user) return;

const today = new Date().toISOString().split('T')[0];

// Check if entry exists for today
const existingStat = stats.find(stat => stat.date === today);

if (existingStat) {
// Update existing entry
await supabase
.from('learning_stats')
.update({
new_learned: existingStat.newLearned + newLearned,
reviewed: existingStat.reviewed + reviewed
})
.eq('user_id', user.id)
.eq('date', today);
} else {
// Create new entry
await supabase
.from('learning_stats')
.insert({
user_id: user.id,
date: today,
new_learned: newLearned,
reviewed: reviewed,
total_time: 0
});
}

// Update local state
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

const getBoxStatsForActiveVocabularies = () => {
  const activeVocabs = getActiveVocabularies();
  
  return {
    box0: activeVocabs.filter(v => v.box === 0).length,
    box1: activeVocabs.filter(v => v.box === 1).length,
    box2: activeVocabs.filter(v => v.box === 2).length,
    box3: activeVocabs.filter(v => v.box === 3).length,
    box4: activeVocabs.filter(v => v.box === 4).length,
    box5: activeVocabs.filter(v => v.box === 5).length,
    box6: activeVocabs.filter(v => v.box === 6).length,
  };
};

const getVocabulariesByBox = (box: number): Vocabulary[] => {
const activeVocabs = getActiveVocabularies();
return activeVocabs.filter(v => v.box === box);
};

const uploadVocabularyList = async (name: string, vocabularyData: Array<{english: string, german: string}>) => {
if (!user) throw new Error('User not authenticated');

// Check if user has reached the 50 list limit (excluding default lists)
const userLists = lists.filter(list => !list.id.startsWith('default_'));
if (userLists.length >= 50) {
throw new Error('Maximale Anzahl von 50 Listen erreicht. Bitte lösche zuerst eine andere Liste.');
}

try {
// Create new list in Supabase
const { data: newListData, error: listError } = await supabase
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

// Create vocabularies in Supabase
const vocabulariesToInsert = vocabularyData.map(item => ({
user_id: user.id,
list_id: newListData.id,
english: item.english,
german: item.german,
box: 0,
times_correct: 0,
times_incorrect: 0
}));

const { error: vocabError } = await supabase
.from('vocabularies')
.insert(vocabulariesToInsert);

if (vocabError) throw vocabError;

// Update local state
const newList: VocabularyList = {
id: newListData.id,
name: newListData.name,
isActive: newListData.is_active,
uploadedAt: new Date(newListData.uploaded_at),
vocabularyCount: newListData.vocabulary_count
};

const newVocabularies: Vocabulary[] = vocabulariesToInsert.map((item, index) => ({
id: `${newListData.id}_vocab_${index}`,
english: item.english,
german: item.german,
listId: newListData.id,
box: 0,
timesCorrect: 0,
timesIncorrect: 0,
createdAt: new Date()
}));

setLists(prev => [...prev, newList]);
setVocabularies(prev => [...prev, ...newVocabularies]);

return newListData.id;
} catch (error) {
console.error('Error uploading list:', error);
throw error;
}
};

const toggleVocabularyList = async (listId: string, isActive: boolean) => {
if (!user) return;

try {
// Check if this is a default list or user list
const isDefaultList = await supabase
.from('default_vocabulary_lists')
.select('id')
.eq('id', listId)
.single();

if (isDefaultList.data) {
// Handle default list preference
const { data: existingPreference } = await supabase
.from('user_list_preferences')
.select('*')
.eq('user_id', user.id)
.eq('list_id', listId)
.single();

if (existingPreference) {
// Update existing preference
await supabase
.from('user_list_preferences')
.update({ is_active: isActive })
.eq('user_id', user.id)
.eq('list_id', listId);
} else {
// Create new preference
await supabase
.from('user_list_preferences')
.insert({
user_id: user.id,
list_id: listId,
is_active: isActive
});
}
} else {
// Handle user list
await supabase
.from('vocabulary_lists')
.update({ is_active: isActive })
.eq('id', listId)
.eq('user_id', user.id);
}

// Update local state
setLists(prev => prev.map(list => 
list.id === listId ? { ...list, isActive } : list
));
} catch (error) {
console.error('Error toggling list:', error);
}
};

const deleteVocabularyList = async (listId: string) => {
if (!user) return;

try {
// Check if this is a default list (cannot be deleted)
const isDefaultList = await supabase
.from('default_vocabulary_lists')
.select('id')
.eq('id', listId)
.single();

if (isDefaultList.data) {
throw new Error('Standardlisten können nicht gelöscht werden.');
}

// Delete user vocabularies first
await supabase
.from('vocabularies')
.delete()
.eq('list_id', listId)
.eq('user_id', user.id);

// Delete the list
await supabase
.from('vocabulary_lists')
.delete()
.eq('id', listId)
.eq('user_id', user.id);

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
  lists: getListsWithCorrectCounts(),
  loading,
  getRandomVocabularies,
  getVocabulariesForReview,
  getActiveVocabularies,
  moveVocabularyToBox,
  moveVocabulariesToBox,
  resetVocabularyToBox1,
  updateDailyStats,
  getAppStats,
  getVocabulariesByBox,
  getBoxStatsForActiveVocabularies,
  uploadVocabularyList,
  toggleVocabularyList,
  deleteVocabularyList
};
}

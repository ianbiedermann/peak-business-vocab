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

// Load data from Supabase
const loadData = async () => {
if (!user) return;

setLoading(true);
try {
// Load user vocabulary lists
const { data: userLists } = await supabase
.from('vocabulary_lists')
.select('*')
.eq('user_id', user.id)
.order('created_at', { ascending: false });

// Load default vocabulary lists
const { data: defaultLists } = await supabase
.from('default_vocabulary_lists')
.select('*')
.order('created_at', { ascending: false });

// Load user preferences for default lists
const { data: userPreferences } = await supabase
.from('user_list_preferences')
.select('*')
.eq('user_id', user.id);

// Combine user lists and default lists with preferences
const combinedLists: VocabularyList[] = [
...(userLists || []).map(list => ({
id: list.id,
name: list.name,
isActive: list.is_active,
uploadedAt: new Date(list.uploaded_at),
vocabularyCount: list.vocabulary_count
})),
...(defaultLists || []).map(list => {
const preference = userPreferences?.find(p => p.list_id === list.id);
return {
id: list.id,
name: list.name,
isActive: preference?.is_active ?? true,
uploadedAt: new Date(list.created_at),
vocabularyCount: list.vocabulary_count
};
})
];

setLists(combinedLists);

// Load user vocabularies
const { data: userVocabs } = await supabase
  .from('vocabularies')
  .select('*')
  .eq('user_id', user.id);

// Aktive Default-Listen identifizieren
const activeDefaultListIds = combinedLists
  .filter(list => list.isActive && !(userLists || []).some(ul => ul.id === list.id))
  .map(list => list.id);

// Standard-Vokabeln laden
const { data: defaultVocabs } = await supabase
  .from('default_vocabularies')
  .select('*')
  .in('list_id', activeDefaultListIds);

// User-Fortschritt für Standard-Vokabeln laden
const defaultVocabIds = (defaultVocabs || []).map(v => v.id);
const { data: userProgress } = await supabase
  .from('user_vocabulary_progress')
  .select('*')
  .eq('user_id', user.id)
  .in('vocabulary_id', defaultVocabIds);

// User-Vokabeln mappen
const mappedUserVocabs: Vocabulary[] = (userVocabs || []).map(vocab => ({
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

// Standard-Vokabeln mit User-Fortschritt kombinieren
const mappedDefaultVocabs: Vocabulary[] = (defaultVocabs || []).map(vocab => {
  const progress = userProgress?.find(p => p.vocabulary_id === vocab.id);
  
  return {
    id: vocab.id,
    english: vocab.english,
    german: vocab.german,
    listId: vocab.list_id,
    box: progress?.box || 0,
    nextReview: progress?.next_review ? new Date(progress.next_review) : undefined,
    timesCorrect: progress?.times_correct || 0,
    timesIncorrect: progress?.times_incorrect || 0,
    lastReviewed: progress?.last_reviewed ? new Date(progress.last_reviewed) : undefined,
    createdAt: new Date(vocab.created_at),
    isDefaultVocab: true
  };
});

// Alle Vokabeln kombinieren
const allVocabs = [...mappedUserVocabs, ...mappedDefaultVocabs];
setVocabularies(allVocabs);

console.log(`Geladene Vokabeln: ${allVocabs.length} (User: ${mappedUserVocabs.length}, Standard: ${mappedDefaultVocabs.length})`);

// Load learning stats
const { data: learningStats } = await supabase
.from('learning_stats')
.select('*')
.eq('user_id', user.id)
.order('date', { ascending: false });

const mappedStats: LearningStats[] = (learningStats || []).map(stat => ({
date: stat.date,
newLearned: stat.new_learned,
reviewed: stat.reviewed,
totalTime: stat.total_time
}));

setStats(mappedStats);
} catch (error) {
console.error('Error loading data:', error);
} finally {
setLoading(false);
}
};

const updateVocabularyProgress = async (vocabulary: Vocabulary, isCorrect: boolean) => {
    if (!user) return;

    const newBox = isCorrect 
      ? Math.min(vocabulary.box + 1, BOX_INTERVALS.length - 1)
      : Math.max(vocabulary.box - 1, 0);

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + BOX_INTERVALS[newBox]);

    const updatedVocab = {
      ...vocabulary,
      box: newBox,
      nextReview: nextReviewDate,
      timesCorrect: vocabulary.timesCorrect + (isCorrect ? 1 : 0),
      timesIncorrect: vocabulary.timesIncorrect + (isCorrect ? 0 : 1),
      lastReviewed: new Date()
    };

    try {
      if (vocabulary.isDefaultVocab) {
        // Für Standard-Vokabeln: in user_vocabulary_progress speichern
        const { error } = await supabase
          .from('user_vocabulary_progress')
          .upsert({
            user_id: user.id,
            vocabulary_id: vocabulary.id,
            box: newBox,
            next_review: nextReviewDate.toISOString(),
            times_correct: updatedVocab.timesCorrect,
            times_incorrect: updatedVocab.timesIncorrect,
            last_reviewed: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,vocabulary_id'
          });

        if (error) throw error;
      } else {
        // Für User-Vokabeln: in vocabularies speichern
        const { error } = await supabase
          .from('vocabularies')
          .update({
            box: newBox,
            next_review: nextReviewDate.toISOString(),
            times_correct: updatedVocab.timesCorrect,
            times_incorrect: updatedVocab.timesIncorrect,
            last_reviewed: new Date().toISOString()
          })
          .eq('id', vocabulary.id)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      // Lokalen State aktualisieren
      setVocabularies(prev => 
        prev.map(v => v.id === vocabulary.id ? updatedVocab : v)
      );

      return updatedVocab;
    } catch (error) {
      console.error('Error updating vocabulary progress:', error);
      throw error;
    }
  };


// Initialize data on user login
useEffect(() => {
if (user) {
loadData();
} else {
setVocabularies([]);
setStats([]);
setLists([]);
setLoading(false);
}
}, [user]);

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

const moveVocabularyToBox = async (vocabId: string, newBox: number, isCorrect: boolean) => {
if (!user) return;

const now = new Date();
let nextReview: Date | undefined;

if (newBox > 0 && newBox <= 5) {
const interval = BOX_INTERVALS[newBox as keyof typeof BOX_INTERVALS];
nextReview = new Date(now.getTime() + interval);
}

// Get current vocabulary to update counters correctly
const vocab = vocabularies.find(v => v.id === vocabId);
if (!vocab) return;

// Update in Supabase
await supabase
.from('vocabularies')
.update({
box: newBox,
times_correct: isCorrect ? vocab.timesCorrect + 1 : vocab.timesCorrect,
times_incorrect: !isCorrect ? vocab.timesIncorrect + 1 : vocab.timesIncorrect,
last_reviewed: now.toISOString(),
next_review: nextReview?.toISOString()
})
.eq('id', vocabId)
.eq('user_id', user.id);

// Update local state
setVocabularies(prev => prev.map(vocab => {
if (vocab.id === vocabId) {
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
deleteVocabularyList,
updateVocabularyProgress
};
}

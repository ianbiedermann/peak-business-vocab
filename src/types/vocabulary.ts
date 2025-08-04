export interface VocabularyList {
  id: string;
  name: string;
  isActive: boolean;
  uploadedAt: Date;
  vocabularyCount: number;
  isDefault?: boolean;
  isPremium?: boolean;
  isUserUploaded?: boolean;
}

export interface Vocabulary {
  id: string;
  english: string;
  german: string;
  listId: string;
  box: number; // 0 = not learned, 1-5 = learning boxes, 6 = mastered
  nextReview?: Date;
  timesCorrect: number;
  timesIncorrect: number;
  lastReviewed?: Date;
  createdAt: Date;
  isDefaultVocab?: boolean;
}

export interface LearningSession {
  vocabularies: Vocabulary[];
  currentPhase: 'introduction' | 'matching' | 'writing' | 'completed';
  currentIndex: number;
  matchedPairs: Set<string>;
  mistakes: Map<string, number>;
}

export interface LearningStats {
  date: string;
  newLearned: number;
  reviewed: number;
  totalTime: number;
}

export interface AppStats {
  totalVocabularies: number;
  notStarted: number; // box 0
  inProgress: number; // box 1-5
  mastered: number; // box 6
  dailyStats: LearningStats[];
  todayLearned: number;
  todayReviewed: number;
  activeLists: number;
  totalLists: number;
}

export const BOX_INTERVALS = [
  0,  // Box 0: Nicht begonnen
  1,  // Box 1: 1 Tag
  2,  // Box 2: 2 Tage  
  4,  // Box 3: 4 Tage
  8,  // Box 4: 8 Tage
  16, // Box 5: 16 Tage
  0   // Box 6: Gelernt (keine Wiederholung)
];

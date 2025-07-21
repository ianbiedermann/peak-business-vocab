export interface VocabularyList {
  id: string;
  name: string;
  isActive: boolean;
  uploadedAt: Date;
  vocabularyCount: number;
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

export const BOX_INTERVALS = {
  1: 24 * 60 * 60 * 1000, // 24 hours
  2: 48 * 60 * 60 * 1000, // 48 hours
  3: 96 * 60 * 60 * 1000, // 96 hours
  4: 192 * 60 * 60 * 1000, // 192 hours
  5: 384 * 60 * 60 * 1000, // 384 hours
};
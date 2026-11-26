export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type StudyMode = 'tone' | 'audio';

export type SelfScore = 'circle' | 'triangle' | 'cross';

export type WordStatus = 'new' | 'learning' | 'archived';

export interface VocabWord {
  id: string;
  level: HskLevel;
  number: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
}

export interface WordProgress {
  wordId: string;
  mode: StudyMode;
  level: HskLevel;
  status: 'learning' | 'archived';
  streak: number;
  totalAttempts: number;
  correctCount: number;
  lastResult: SelfScore;
  lastTestedAt: number; // epoch ms
  nextReviewAt: number | null; // epoch ms
  archivedAt: number | null; // epoch ms
}

export interface LevelSummary {
  level: HskLevel;
  total: number;
  archived: number;
  learning: number;
  dueNow: number;
  unseen: number;
}

export interface SessionCard {
  word: VocabWord;
  progress: WordProgress | null;
  isRetryInSession?: boolean;
}

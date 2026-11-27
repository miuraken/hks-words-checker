export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type StudyMode = 'tone' | 'audio';

/**
 * 自己採点の4選択肢
 * - madamada: まだまだ（旧 cross）
 * - nantonaku: なんとなく（旧 triangle）
 * - oboeta: 覚えた（旧 circle）
 * - daijobu: もう大丈夫（今後出題しない・即アーカイブ）
 * 後方互換のため旧値も許容する
 */
export type SelfScore =
  | 'madamada'
  | 'nantonaku'
  | 'oboeta'
  | 'daijobu'
  | 'cross'
  | 'triangle'
  | 'circle';

export type NormalizedScore = 'madamada' | 'nantonaku' | 'oboeta' | 'daijobu';

export type WordStatus = 'new' | 'learning' | 'archived';

export type ToneRuleType =
  | 'jidaku_nissho'
  | 'zendaku_nissho'
  | 'seion_nissho'
  | 'zendaku_hi_nissho'
  | 'jidaku_hi_nissho';

export interface ToneHint {
  char: string;
  jpChar?: string;
  reading: string;
  rule: ToneRuleType;
  tone: 1 | 2 | 3 | 4;
  text: string;
}

export interface VocabWord {
  id: string;
  level: HskLevel;
  number: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
  toneHints?: ToneHint[];
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
  madamada: number;
  nantonaku: number;
  oboeta: number;
}

export interface DailyStatSnapshot {
  date: string; // YYYY-MM-DD
  madamada: number;
  nantonaku: number;
  oboeta: number;
  daijobu: number;
}

export interface SessionCard {
  word: VocabWord;
  progress: WordProgress | null;
  isRetryInSession?: boolean;
}

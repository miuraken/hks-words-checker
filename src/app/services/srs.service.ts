import { Injectable } from '@angular/core';
import {
  HskLevel,
  LevelSummary,
  NormalizedScore,
  SelfScore,
  SessionCard,
  StudyMode,
  VocabWord,
  WordProgress,
} from '../models/vocab.model';

const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_SESSION_SIZE = 15;

export function normalizeScore(score: SelfScore): NormalizedScore {
  switch (score) {
    case 'cross':
    case 'madamada':
      return 'madamada';
    case 'triangle':
    case 'nantonaku':
      return 'nantonaku';
    case 'circle':
    case 'oboeta':
      return 'oboeta';
    case 'daijobu':
      return 'daijobu';
  }
}

@Injectable({ providedIn: 'root' })
export class SrsService {
  /**
   * 自己採点結果に基づき、次回の WordProgress を計算する（純粋関数）
   * - madamada (まだまだ): streak=0 にリセット、+1分後（セッション内3問後に再テスト）
   * - nantonaku (なんとなく): streak=0 にリセット、+6時間後（忘却曲線初期・半日後に再テスト）
   * - oboeta (覚えた): streak + 1。1回目:+1日、2回目:+3日、3回目でアーカイブ
   * - daijobu (もう大丈夫): streak=3、即座にアーカイブ（今後出題しない）
   */
  calculateNextProgress(
    word: VocabWord,
    mode: StudyMode,
    current: WordProgress | null,
    score: SelfScore,
    now: number = Date.now(),
  ): WordProgress {
    const norm = normalizeScore(score);
    const prevStreak = current?.streak ?? 0;
    const prevAttempts = current?.totalAttempts ?? 0;
    const prevCorrect = current?.correctCount ?? 0;

    let nextStreak = 0;
    let status: 'learning' | 'archived' = 'learning';
    let nextReviewAt: number | null = null;
    let archivedAt: number | null = null;
    let isCorrect = false;

    if (norm === 'daijobu') {
      nextStreak = 3;
      status = 'archived';
      nextReviewAt = null;
      archivedAt = now;
      isCorrect = true;
    } else if (norm === 'oboeta') {
      isCorrect = true;
      nextStreak = prevStreak + 1;
      if (nextStreak >= 3) {
        status = 'archived';
        nextReviewAt = null;
        archivedAt = now;
      } else if (nextStreak === 1) {
        nextReviewAt = now + 1 * ONE_DAY_MS;
      } else {
        // nextStreak === 2
        nextReviewAt = now + 3 * ONE_DAY_MS;
      }
    } else if (norm === 'nantonaku') {
      nextStreak = 0;
      status = 'learning';
      nextReviewAt = now + 6 * ONE_HOUR_MS;
    } else {
      // madamada
      nextStreak = 0;
      status = 'learning';
      nextReviewAt = now + 1 * ONE_MINUTE_MS;
    }

    return {
      wordId: word.id,
      mode,
      level: word.level,
      status,
      streak: nextStreak,
      totalAttempts: prevAttempts + 1,
      correctCount: prevCorrect + (isCorrect ? 1 : 0),
      lastResult: norm,
      lastTestedAt: now,
      nextReviewAt,
      archivedAt,
    };
  }

  /**
   * セッションに出題するカードリスト（最大 sessionSize 問）を構築する。
   * 優先順位:
   * 1. 復習期限が到来している learning 単語（期限超過が大きい順）
   * 2. 未出題 (new) 単語からランダム抽出
   */
  buildSessionQueue(
    words: VocabWord[],
    progressMap: ReadonlyMap<string, WordProgress>,
    sessionSize: number = DEFAULT_SESSION_SIZE,
    now: number = Date.now(),
    includeAheadOfSchedule: boolean = false,
  ): SessionCard[] {
    const dueCards: SessionCard[] = [];
    const newCards: SessionCard[] = [];
    const aheadCards: SessionCard[] = [];

    for (const word of words) {
      const prog = progressMap.get(word.id) ?? null;
      if (!prog) {
        newCards.push({ word, progress: null });
      } else if (prog.status === 'archived') {
        continue;
      } else if (prog.nextReviewAt === null || prog.nextReviewAt <= now) {
        dueCards.push({ word, progress: prog });
      } else {
        aheadCards.push({ word, progress: prog });
      }
    }

    dueCards.sort(
      (a, b) => (a.progress?.nextReviewAt ?? 0) - (b.progress?.nextReviewAt ?? 0),
    );
    this.shuffleInPlace(newCards);

    const selected: SessionCard[] = [];
    for (const card of dueCards) {
      if (selected.length >= sessionSize) break;
      selected.push(card);
    }
    for (const card of newCards) {
      if (selected.length >= sessionSize) break;
      selected.push(card);
    }

    if (includeAheadOfSchedule && selected.length < sessionSize) {
      aheadCards.sort(
        (a, b) => (a.progress?.nextReviewAt ?? 0) - (b.progress?.nextReviewAt ?? 0),
      );
      for (const card of aheadCards) {
        if (selected.length >= sessionSize) break;
        selected.push(card);
      }
    }

    return selected;
  }

  /**
   * 指定された級・モードの統計サマリー（4状態の絶対数含む）を計算する
   */
  computeLevelCounts(
    words: VocabWord[],
    progressMap: ReadonlyMap<string, WordProgress>,
    level: HskLevel,
    now: number = Date.now(),
  ): LevelSummary {
    let archived = 0;
    let learning = 0;
    let dueNow = 0;
    let unseen = 0;
    let madamada = 0;
    let nantonaku = 0;
    let oboeta = 0;

    for (const word of words) {
      const prog = progressMap.get(word.id);
      if (!prog) {
        unseen++;
      } else if (prog.status === 'archived') {
        archived++;
      } else {
        learning++;
        if (prog.nextReviewAt === null || prog.nextReviewAt <= now) {
          dueNow++;
        }
        const norm = normalizeScore(prog.lastResult);
        if (norm === 'madamada') madamada++;
        else if (norm === 'nantonaku') nantonaku++;
        else if (norm === 'oboeta') oboeta++;
      }
    }

    return {
      level,
      total: words.length,
      archived,
      learning,
      dueNow,
      unseen,
      madamada,
      nantonaku,
      oboeta,
    };
  }

  /**
   * progressMap 単体から日次スナップショット用の4状態絶対数を集計する
   */
  computeStatusBreakdown(progressMap: ReadonlyMap<string, WordProgress>): {
    madamada: number;
    nantonaku: number;
    oboeta: number;
    daijobu: number;
  } {
    let madamada = 0;
    let nantonaku = 0;
    let oboeta = 0;
    let daijobu = 0;

    for (const prog of progressMap.values()) {
      if (prog.status === 'archived') {
        daijobu++;
      } else {
        const norm = normalizeScore(prog.lastResult);
        if (norm === 'madamada') madamada++;
        else if (norm === 'nantonaku') nantonaku++;
        else if (norm === 'oboeta') oboeta++;
      }
    }

    return { madamada, nantonaku, oboeta, daijobu };
  }

  private shuffleInPlace<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}

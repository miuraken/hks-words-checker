import { Injectable } from '@angular/core';
import {
  HskLevel,
  SelfScore,
  SessionCard,
  StudyMode,
  VocabWord,
  WordProgress,
} from '../models/vocab.model';

const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_SESSION_SIZE = 15;

@Injectable({ providedIn: 'root' })
export class SrsService {
  /**
   * 自己採点結果に基づき、次回の WordProgress を計算する（純粋関数）
   * - ◯ (circle): 連続正解 +1。3回連続でアーカイブ。1回目は+1日、2回目は+3日。
   * - △ (triangle): streak を 0 にリセット、+10分後（同セッション内再出題対象）。
   * - ✗ (cross): streak を 0 にリセット、+1分後（同セッション内再出題対象）。
   */
  calculateNextProgress(
    word: VocabWord,
    mode: StudyMode,
    current: WordProgress | null,
    score: SelfScore,
    now: number = Date.now(),
  ): WordProgress {
    const prevStreak = current?.streak ?? 0;
    const prevAttempts = current?.totalAttempts ?? 0;
    const prevCorrect = current?.correctCount ?? 0;

    let nextStreak = 0;
    let status: 'learning' | 'archived' = 'learning';
    let nextReviewAt: number | null = null;
    let archivedAt: number | null = null;

    if (score === 'circle') {
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
    } else if (score === 'triangle') {
      nextStreak = 0;
      status = 'learning';
      nextReviewAt = now + 10 * ONE_MINUTE_MS;
    } else {
      // cross
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
      correctCount: prevCorrect + (score === 'circle' ? 1 : 0),
      lastResult: score,
      lastTestedAt: now,
      nextReviewAt,
      archivedAt,
    };
  }

  /**
   * セッションに出題するカードリスト（最大 sessionSize 問）を構築する。
   * 優先順位:
   * 1. 復習期限が到来している learning 単語（期限超過が大きい順、同程度は軽くシャッフル）
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

    // 期限到来単語は nextReviewAt 昇順（古い順）
    dueCards.sort(
      (a, b) => (a.progress?.nextReviewAt ?? 0) - (b.progress?.nextReviewAt ?? 0),
    );

    // 未学習単語はランダムシャッフル
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
   * 指定された級・モードの統計サマリーを計算する
   */
  computeLevelCounts(
    words: VocabWord[],
    progressMap: ReadonlyMap<string, WordProgress>,
    level: HskLevel,
    now: number = Date.now(),
  ) {
    let archived = 0;
    let learning = 0;
    let dueNow = 0;
    let unseen = 0;

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
      }
    }

    return {
      level,
      total: words.length,
      archived,
      learning,
      dueNow,
      unseen,
    };
  }

  private shuffleInPlace<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}

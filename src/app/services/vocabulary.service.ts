import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HskLevel, VocabWord } from '../models/vocab.model';

export const HSK_LEVEL_TOTALS: Record<HskLevel, number> = {
  1: 153,
  2: 153,
  3: 299,
  4: 600,
  5: 1300,
  6: 2513,
};

const VOCAB_DATA_VERSION = '20261127_1';

/**
 * 関連語検索で無視する頻出接頭語・接尾語・助詞
 */
const IGNORED_RELATED_CHARS = new Set([
  '不',
  '子',
  '一',
  '儿',
  '的',
  '了',
  '吗',
  '呢',
  '吧',
  '啊',
  '们',
  '么',
]);

@Injectable({ providedIn: 'root' })
export class VocabularyService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<HskLevel, VocabWord[]>();

  async getLevelWords(level: HskLevel): Promise<VocabWord[]> {
    const cached = this.cache.get(level);
    if (cached) return cached;

    const words = await firstValueFrom(
      this.http.get<VocabWord[]>(
        `/assets/vocabulary/hsk${level}.json?v=${VOCAB_DATA_VERSION}`,
      ),
    );
    this.cache.set(level, words);
    return words;
  }

  /**
   * 1級 〜 min(6, level + 2) 級までの単語を先読みし、関連語検索に備える
   */
  async preloadUpToLevel(maxLevel: HskLevel): Promise<void> {
    const levels: HskLevel[] = [];
    for (let lv = 1; lv <= maxLevel; lv++) {
      levels.push(lv as HskLevel);
    }
    await Promise.all(levels.map((lv) => this.getLevelWords(lv)));
  }

  /**
   * 対象単語と同じ漢字（接頭語・接尾語等を除く）を持つ関連語句を
   * 1級〜min(6, target.level + 2) 級から抽出する
   */
  findRelatedWords(
    target: VocabWord,
    limit: number = 5,
  ): VocabWord[] {
    const targetChars = Array.from(
      new Set(
        Array.from(target.hanzi).filter(
          (ch) => /[\u4e00-\u9fff]/.test(ch) && !IGNORED_RELATED_CHARS.has(ch),
        ),
      ),
    );

    if (targetChars.length === 0) return [];

    const maxLevel = Math.min(6, target.level + 2) as HskLevel;
    const candidates: { word: VocabWord; matchCount: number; levelDiff: number }[] = [];
    const seenHanzi = new Set<string>([target.hanzi]);

    for (let lv = 1; lv <= maxLevel; lv++) {
      const words = this.cache.get(lv as HskLevel);
      if (!words) continue;

      for (const w of words) {
        if (w.id === target.id || seenHanzi.has(w.hanzi)) continue;

        let matchCount = 0;
        for (const ch of targetChars) {
          if (w.hanzi.includes(ch)) {
            matchCount++;
          }
        }
        if (matchCount > 0) {
          seenHanzi.add(w.hanzi);
          candidates.push({
            word: w,
            matchCount,
            levelDiff: Math.abs(w.level - target.level),
          });
        }
      }
    }

    candidates.sort((a, b) => {
      // 6件以上になる場合は現在の級より下の級を優先的に除外（より低い級ほど後ろへ）
      const aLower = a.word.level < target.level ? 1 : 0;
      const bLower = b.word.level < target.level ? 1 : 0;
      if (aLower !== bLower) return aLower - bLower;
      if (aLower === 1 && a.word.level !== b.word.level) {
        return b.word.level - a.word.level;
      }
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      if (a.levelDiff !== b.levelDiff) return a.levelDiff - b.levelDiff;
      return a.word.level - b.word.level;
    });

    return candidates.slice(0, limit).map((c) => c.word);
  }
}

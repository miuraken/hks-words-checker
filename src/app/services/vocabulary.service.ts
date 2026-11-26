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

const VOCAB_DATA_VERSION = '20261126_2';

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
}

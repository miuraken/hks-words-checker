import { beforeEach, describe, expect, it } from 'vitest';
import { SrsService } from './srs.service';
import { VocabWord } from '../models/vocab.model';

describe('SrsService', () => {
  let service: SrsService;
  const sampleWord: VocabWord = {
    id: 'hsk1_1',
    level: 1,
    number: 1,
    hanzi: '爱',
    pinyin: 'ài',
    meaning: '愛する',
  };

  beforeEach(() => {
    service = new SrsService();
  });

  it('archives a word after 3 consecutive circle answers', () => {
    const t0 = 1_700_000_000_000;
    const p1 = service.calculateNextProgress(sampleWord, 'tone', null, 'circle', t0);
    expect(p1.streak).toBe(1);
    expect(p1.status).toBe('learning');
    expect(p1.nextReviewAt).toBe(t0 + 24 * 60 * 60 * 1000);

    const p2 = service.calculateNextProgress(sampleWord, 'tone', p1, 'circle', t0 + 1000);
    expect(p2.streak).toBe(2);
    expect(p2.status).toBe('learning');
    expect(p2.nextReviewAt).toBe(t0 + 1000 + 3 * 24 * 60 * 60 * 1000);

    const p3 = service.calculateNextProgress(sampleWord, 'tone', p2, 'circle', t0 + 2000);
    expect(p3.streak).toBe(3);
    expect(p3.status).toBe('archived');
    expect(p3.nextReviewAt).toBeNull();
    expect(p3.archivedAt).toBe(t0 + 2000);
  });

  it('resets streak on triangle or cross', () => {
    const t0 = 1_700_000_000_000;
    const p1 = service.calculateNextProgress(sampleWord, 'audio', null, 'circle', t0);
    expect(p1.streak).toBe(1);

    const pTri = service.calculateNextProgress(sampleWord, 'audio', p1, 'triangle', t0 + 5000);
    expect(pTri.streak).toBe(0);
    expect(pTri.status).toBe('learning');

    const pCross = service.calculateNextProgress(sampleWord, 'audio', p1, 'cross', t0 + 5000);
    expect(pCross.streak).toBe(0);
    expect(pCross.status).toBe('learning');
  });

  it('prioritizes due learning words before new words and excludes archived words', () => {
    const now = 1_700_000_000_000;
    const w1: VocabWord = { ...sampleWord, id: 'hsk1_1', number: 1 };
    const w2: VocabWord = { ...sampleWord, id: 'hsk1_2', number: 2 };
    const w3: VocabWord = { ...sampleWord, id: 'hsk1_3', number: 3 };

    const progressMap = new Map([
      [
        'hsk1_1',
        {
          wordId: 'hsk1_1',
          mode: 'tone' as const,
          level: 1 as const,
          status: 'archived' as const,
          streak: 3,
          totalAttempts: 3,
          correctCount: 3,
          lastResult: 'circle' as const,
          lastTestedAt: now - 1000,
          nextReviewAt: null,
          archivedAt: now - 1000,
        },
      ],
      [
        'hsk1_2',
        {
          wordId: 'hsk1_2',
          mode: 'tone' as const,
          level: 1 as const,
          status: 'learning' as const,
          streak: 1,
          totalAttempts: 1,
          correctCount: 1,
          lastResult: 'circle' as const,
          lastTestedAt: now - 10000,
          nextReviewAt: now - 100, // due
          archivedAt: null,
        },
      ],
    ]);

    const q = service.buildSessionQueue([w1, w2, w3], progressMap, 15, now);
    expect(q.map((c) => c.word.id)).toEqual(['hsk1_2', 'hsk1_3']);
  });
});

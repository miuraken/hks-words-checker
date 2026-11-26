import { Injectable } from '@angular/core';
import { HskLevel, NormalizedScore, StudyMode } from '../models/vocab.model';

export type AudioTriggerSource =
  | 'study_card'
  | 'related_word'
  | 'words_list'
  | 'auto'
  | 'shortcut';

export type BookmarkSource = 'study' | 'words';

declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'js',
      targetOrAction: string | Date,
      params?: Record<string, string | number | boolean>,
    ) => void;
    dataLayer?: unknown[];
  }
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private sendEvent(
    eventName: string,
    params: Record<string, string | number | boolean>,
  ): void {
    if (typeof window === 'undefined') return;
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  }

  trackRevealAnswer(params: {
    mode: StudyMode;
    level: HskLevel;
    wordId: string;
    hanzi: string;
  }): void {
    this.sendEvent('reveal_answer', {
      study_mode: params.mode,
      hsk_level: params.level,
      word_id: params.wordId,
      hanzi: params.hanzi,
    });
  }

  trackSubmitScore(params: {
    score: NormalizedScore;
    mode: StudyMode;
    level: HskLevel;
    wordId: string;
    hanzi: string;
    streak: number;
  }): void {
    this.sendEvent('submit_score', {
      score: params.score,
      study_mode: params.mode,
      hsk_level: params.level,
      word_id: params.wordId,
      hanzi: params.hanzi,
      streak: params.streak,
    });
  }

  trackToggleBookmark(params: {
    bookmarked: boolean;
    source: BookmarkSource;
    mode: StudyMode;
    level: HskLevel;
    wordId: string;
    hanzi: string;
  }): void {
    this.sendEvent('toggle_bookmark', {
      bookmarked: params.bookmarked,
      source: params.source,
      study_mode: params.mode,
      hsk_level: params.level,
      word_id: params.wordId,
      hanzi: params.hanzi,
    });
  }

  trackPlayAudio(params: {
    source: AudioTriggerSource;
    rate: number;
    mode: StudyMode;
    level: HskLevel;
    wordId: string;
    hanzi: string;
  }): void {
    this.sendEvent('play_audio', {
      source: params.source,
      tts_rate: params.rate,
      study_mode: params.mode,
      hsk_level: params.level,
      word_id: params.wordId,
      hanzi: params.hanzi,
    });
  }
}

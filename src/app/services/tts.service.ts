import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TtsService {
  readonly isSupported = signal(
    typeof window !== 'undefined' && 'speechSynthesis' in window,
  );
  readonly isSpeaking = signal(false);

  private cachedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (this.isSupported()) {
      this.pickChineseVoice();
      window.speechSynthesis.addEventListener?.('voiceschanged', () => {
        this.pickChineseVoice();
      });
    }
  }

  /**
   * 中国語 (zh-CN) で発音を読み上げる。
   * モバイルブラウザの自動再生制限を避けるため、ユーザー操作ハンドラ内から同期的に呼び出すこと。
   */
  speak(text: string, rate: number = 1.0): void {
    if (!this.isSupported() || !text) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = rate;
    if (this.cachedVoice) {
      utterance.voice = this.cachedVoice;
    }

    utterance.onstart = () => this.isSpeaking.set(true);
    utterance.onend = () => this.isSpeaking.set(false);
    utterance.onerror = () => this.isSpeaking.set(false);

    synth.speak(utterance);
  }

  stop(): void {
    if (!this.isSupported()) return;
    window.speechSynthesis.cancel();
    this.isSpeaking.set(false);
  }

  private pickChineseVoice(): void {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;

    this.cachedVoice =
      voices.find((v) => v.lang.toLowerCase() === 'zh-cn') ??
      voices.find((v) => v.lang.toLowerCase().startsWith('zh-')) ??
      voices.find((v) => v.lang.toLowerCase().startsWith('zh')) ??
      null;
  }
}

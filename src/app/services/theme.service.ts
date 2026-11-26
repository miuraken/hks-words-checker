import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(false);

  constructor() {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    this.applyTheme(mq.matches);

    const listener = (e: MediaQueryListEvent) => this.applyTheme(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener('change', listener);
    } else {
      // 旧 Safari フォールバック
      mq.addListener(listener);
    }
  }

  private applyTheme(dark: boolean): void {
    this.isDark.set(dark);
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.classList.toggle('dark-theme', dark);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', dark ? '#111414' : '#006a6a');
    }
  }
}

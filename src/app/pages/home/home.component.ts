import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HskLevel, LevelSummary, StudyMode } from '../../models/vocab.model';
import { FirebaseService } from '../../services/firebase.service';
import { SrsService } from '../../services/srs.service';
import {
  HSK_LEVEL_TOTALS,
  VocabularyService,
} from '../../services/vocabulary.service';

const LEVELS: HskLevel[] = [1, 2, 3, 4, 5, 6];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    MatTooltipModule,
  ],
  template: `
    <mat-toolbar class="top-bar">
      <span class="toolbar-title">HSK 語彙特訓</span>
      <span class="spacer"></span>
      @if (fb.user(); as user) {
        <span class="user-name">{{ user.displayName || '学習中' }}</span>
        <button
          mat-icon-button
          (click)="onLogout()"
          aria-label="ログアウト"
          matTooltip="ログアウト"
        >
          <mat-icon>logout</mat-icon>
        </button>
      } @else {
        <button
          mat-stroked-button
          class="login-btn"
          (click)="onGoogleLogin()"
        >
          <mat-icon>login</mat-icon>
          ログイン
        </button>
      }
    </mat-toolbar>

    <main class="home-main">
      @if (fb.authReady() && !fb.user()) {
        <div class="guest-banner">
          <mat-icon>devices</mat-icon>
          <span>
            ゲストモード利用中（進捗はこの端末に保存されます。Google ログインでクラウド同期できます）
          </span>
        </div>
      }
      <section class="mode-section">
        <h2 class="section-label">特訓モードを選択</h2>
        <mat-button-toggle-group
          class="mode-toggle"
          [value]="selectedMode()"
          (change)="onModeChange($event.value)"
          aria-label="学習モード"
        >
          <mat-button-toggle value="tone">
            <mat-icon>record_voice_over</mat-icon>
            ① 声調特訓
          </mat-button-toggle>
          <mat-button-toggle value="audio">
            <mat-icon>hearing</mat-icon>
            ② 音→概念
          </mat-button-toggle>
        </mat-button-toggle-group>

        <p class="mode-desc">
          @if (selectedMode() === 'tone') {
            漢字を見てピンインと声調を思い浮かべる特訓です。
          } @else {
            ピンインと中国語音声（TTS）から意味・漢字を思い浮かべる特訓です。
          }
        </p>
      </section>

      <section class="levels-section">
        <h2 class="section-label">HSK 級を選択</h2>

        @if (loading()) {
          <div class="loading-box">
            <mat-spinner diameter="36" />
            <p>学習状況を読み込み中...</p>
          </div>
        } @else {
          <div class="level-grid">
            @for (item of summaries(); track item.level) {
              <mat-card class="level-card" appearance="outlined">
                <div class="level-header">
                  <div class="level-title-row">
                    <span class="level-badge">HSK {{ item.level }}級</span>
                    <span class="total-count">全 {{ item.total }} 語</span>
                  </div>
                  @if (item.dueNow > 0) {
                    <span class="due-badge">復習 {{ item.dueNow }}</span>
                  }
                </div>

                <div class="progress-wrap">
                  <div
                    class="stacked-progress"
                    role="progressbar"
                    [attr.aria-valuenow]="item.archived + item.learning"
                    [attr.aria-valuemax]="item.total"
                  >
                    @if (item.archived > 0) {
                      <div
                        class="seg seg-daijobu"
                        [style.width.%]="(item.archived / item.total) * 100"
                        [matTooltip]="'もう大丈夫: ' + item.archived"
                      ></div>
                    }
                    @if (item.oboeta > 0) {
                      <div
                        class="seg seg-oboeta"
                        [style.width.%]="(item.oboeta / item.total) * 100"
                        [matTooltip]="'覚えた: ' + item.oboeta"
                      ></div>
                    }
                    @if (item.nantonaku > 0) {
                      <div
                        class="seg seg-nantonaku"
                        [style.width.%]="(item.nantonaku / item.total) * 100"
                        [matTooltip]="'なんとなく: ' + item.nantonaku"
                      ></div>
                    }
                    @if (item.madamada > 0) {
                      <div
                        class="seg seg-madamada"
                        [style.width.%]="(item.madamada / item.total) * 100"
                        [matTooltip]="'まだまだ: ' + item.madamada"
                      ></div>
                    }
                  </div>
                  <div class="stats-row">
                    <span>習得済: {{ item.archived }} / {{ item.total }}</span>
                    <span class="breakdown-inline">
                      <i class="dot daijobu"></i>{{ item.archived }}
                      <i class="dot oboeta"></i>{{ item.oboeta }}
                      <i class="dot nantonaku"></i>{{ item.nantonaku }}
                      <i class="dot madamada"></i>{{ item.madamada }}
                    </span>
                  </div>
                </div>

                <div class="card-actions">
                  <button
                    mat-stroked-button
                    (click)="openWordList(item.level)"
                    aria-label="HSK{{ item.level }}級の単語一覧"
                  >
                    <mat-icon>list_alt</mat-icon>
                    一覧
                  </button>
                  <button
                    mat-stroked-button
                    (click)="openStats(item.level)"
                    aria-label="HSK{{ item.level }}級の推移グラフ"
                  >
                    <mat-icon>bar_chart</mat-icon>
                    推移
                  </button>
                  <button
                    mat-flat-button
                    color="primary"
                    class="start-btn"
                    (click)="startStudy(item.level)"
                  >
                    <mat-icon>play_arrow</mat-icon>
                    スタート
                  </button>
                </div>
              </mat-card>
            }
          </div>
        }
      </section>
    </main>
  `,
  styles: `
    .top-bar {
      background: var(--surface-bg);
      color: var(--text-primary);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .toolbar-title {
      font-weight: 700;
      font-size: 1.15rem;
    }
    .spacer {
      flex: 1;
    }
    .user-name {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-right: 4px;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .login-btn {
      height: 36px;
      border-radius: 18px;
      font-size: 0.85rem;
    }
    .guest-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 12px;
      background: var(--banner-bg);
      color: var(--banner-fg);
      font-size: 0.8rem;
      line-height: 1.4;
      mat-icon {
        flex-shrink: 0;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }
    .home-main {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-bottom: 32px;
    }
    .section-label {
      margin: 0 0 10px;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .mode-toggle {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-radius: 14px;
      overflow: hidden;
      mat-button-toggle {
        height: 48px;
        font-weight: 600;
      }
    }
    .mode-desc {
      margin: 8px 0 0;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .loading-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 0;
      gap: 12px;
      color: var(--text-secondary);
    }
    .level-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .level-card {
      padding: 16px;
      border-radius: 16px;
      background: var(--surface-bg);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .level-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .level-title-row {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    .level-badge {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--accent-heading);
    }
    .total-count {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .due-badge {
      background: var(--due-bg);
      color: var(--due-fg);
      font-size: 0.78rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
    }
    .progress-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .stacked-progress {
      width: 100%;
      height: 8px;
      border-radius: 999px;
      background: var(--surface-subtle);
      display: flex;
      overflow: hidden;
    }
    .seg {
      height: 100%;
      transition: width 0.25s ease;
    }
    .seg-daijobu {
      background: var(--bar-daijobu);
    }
    .seg-oboeta {
      background: var(--bar-oboeta);
    }
    .seg-nantonaku {
      background: var(--bar-nantonaku);
    }
    .seg-madamada {
      background: var(--bar-madamada);
    }
    .stats-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
    .breakdown-inline {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.76rem;
    }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      &.daijobu {
        background: var(--bar-daijobu);
      }
      &.oboeta {
        background: var(--bar-oboeta);
      }
      &.nantonaku {
        background: var(--bar-nantonaku);
      }
      &.madamada {
        background: var(--bar-madamada);
      }
    }
    .card-actions {
      display: flex;
      gap: 10px;
      margin-top: 2px;
    }
    .start-btn {
      flex: 1;
      height: 42px;
      border-radius: 21px;
    }
  `,
})
export class HomeComponent implements OnInit {
  readonly fb = inject(FirebaseService);
  private readonly vocab = inject(VocabularyService);
  private readonly srs = inject(SrsService);
  private readonly router = inject(Router);

  readonly selectedMode = signal<StudyMode>('tone');
  readonly loading = signal(true);
  readonly summaries = signal<LevelSummary[]>(
    LEVELS.map((level) => ({
      level,
      total: HSK_LEVEL_TOTALS[level],
      archived: 0,
      learning: 0,
      dueNow: 0,
      unseen: HSK_LEVEL_TOTALS[level],
      madamada: 0,
      nantonaku: 0,
      oboeta: 0,
    })),
  );

  async ngOnInit(): Promise<void> {
    await this.refreshSummaries();
  }

  async onModeChange(mode: StudyMode): Promise<void> {
    if (!mode || mode === this.selectedMode()) return;
    this.selectedMode.set(mode);
    await this.refreshSummaries();
  }

  async refreshSummaries(): Promise<void> {
    this.loading.set(true);
    const mode = this.selectedMode();
    const now = Date.now();
    try {
      const results = await Promise.all(
        LEVELS.map(async (level) => {
          const [words, progressMap] = await Promise.all([
            this.vocab.getLevelWords(level),
            this.fb.loadLevelProgress(mode, level),
          ]);
          return this.srs.computeLevelCounts(words, progressMap, level, now);
        }),
      );
      this.summaries.set(results);
    } finally {
      this.loading.set(false);
    }
  }

  startStudy(level: HskLevel): void {
    this.router.navigate(['/study', this.selectedMode(), level]);
  }

  openWordList(level: HskLevel): void {
    this.router.navigate(['/words', this.selectedMode(), level]);
  }

  openStats(level: HskLevel): void {
    this.router.navigate(['/stats', this.selectedMode(), level]);
  }

  async onGoogleLogin(): Promise<void> {
    try {
      await this.fb.signInWithGoogle();
      await this.refreshSummaries();
    } catch {
      // ポップアップ閉じ等の場合は何もしない
    }
  }

  async onLogout(): Promise<void> {
    await this.fb.logout();
    window.location.href = '/';
  }
}

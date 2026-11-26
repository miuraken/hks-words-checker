import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  HskLevel,
  StudyMode,
  VocabWord,
  WordProgress,
  WordStatus,
} from '../../models/vocab.model';
import { FirebaseService } from '../../services/firebase.service';
import { TtsService } from '../../services/tts.service';
import { VocabularyService } from '../../services/vocabulary.service';

interface WordRow {
  word: VocabWord;
  status: WordStatus;
  progress: WordProgress | null;
}

@Component({
  selector: 'app-words',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatTooltipModule,
  ],
  template: `
    <mat-toolbar class="words-toolbar">
      <button mat-icon-button (click)="goHome()" aria-label="ホームに戻る">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <span>
        HSK {{ level() }}級 単語一覧 ({{
          mode() === 'tone' ? '声調特訓' : '音→概念'
        }})
      </span>
    </mat-toolbar>

    <main class="words-main">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>漢字・ピンイン・意味で検索</mat-label>
        <input
          matInput
          [ngModel]="searchText()"
          (ngModelChange)="searchText.set($event)"
          placeholder="例: 爱, ai, 愛"
        />
        @if (searchText()) {
          <button
            mat-icon-button
            matSuffix
            (click)="searchText.set('')"
            aria-label="検索をクリア"
          >
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-form-field>

      <mat-button-toggle-group
        class="filter-toggle"
        [value]="filterStatus()"
        (change)="filterStatus.set($event.value)"
        aria-label="ステータス絞り込み"
      >
        <mat-button-toggle value="all">すべて</mat-button-toggle>
        <mat-button-toggle value="archived">習得済</mat-button-toggle>
        <mat-button-toggle value="learning">学習中</mat-button-toggle>
        <mat-button-toggle value="new">未学習</mat-button-toggle>
      </mat-button-toggle-group>

      @if (loading()) {
        <div class="center-box">
          <mat-spinner diameter="36" />
        </div>
      } @else {
        <p class="count-label">表示件数: {{ filteredRows().length }} 語</p>
        <div class="word-list">
          @for (row of filteredRows().slice(0, displayLimit()); track row.word.id) {
            <mat-card class="word-card" appearance="outlined">
              <div class="word-main">
                <div class="word-top">
                  <span class="hanzi hanzi-font">{{ row.word.hanzi }}</span>
                  <span class="pinyin">{{ row.word.pinyin }}</span>
                  <span class="badge" [class]="row.status">
                    @if (row.status === 'archived') {
                      習得済
                    } @else if (row.status === 'learning') {
                      学習中 ({{ row.progress?.streak ?? 0 }}/3)
                    } @else {
                      未学習
                    }
                  </span>
                </div>
                <div class="meaning">{{ row.word.meaning }}</div>
              </div>
              <div class="word-actions">
                <button
                  mat-icon-button
                  (click)="tts.speak(row.word.hanzi)"
                  aria-label="発音を聞く"
                  matTooltip="発音を聞く"
                >
                  <mat-icon>volume_up</mat-icon>
                </button>
                @if (row.progress) {
                  <button
                    mat-icon-button
                    (click)="onResetWord(row)"
                    aria-label="学習状態をリセット"
                    matTooltip="未学習に戻す"
                  >
                    <mat-icon>restart_alt</mat-icon>
                  </button>
                }
              </div>
            </mat-card>
          }
        </div>

        @if (filteredRows().length > displayLimit()) {
          <button
            mat-stroked-button
            class="load-more-btn"
            (click)="loadMore()"
          >
            さらに表示 ({{ filteredRows().length - displayLimit() }} 語)
          </button>
        }
      }
    </main>
  `,
  styles: `
    .words-toolbar {
      background: var(--surface-bg);
      color: var(--text-primary);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .words-main {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-bottom: 32px;
    }
    .search-field {
      width: 100%;
    }
    .filter-toggle {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
    }
    .center-box {
      display: flex;
      justify-content: center;
      padding: 40px 0;
    }
    .count-label {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .word-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .word-card {
      padding: 12px 14px;
      border-radius: 14px;
      background: var(--surface-bg);
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .word-main {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .word-top {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 8px;
    }
    .hanzi {
      font-size: 1.25rem;
      font-weight: 700;
    }
    .pinyin {
      font-size: 0.95rem;
      color: var(--accent-primary);
      font-weight: 500;
    }
    .meaning {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .badge {
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 600;
      &.archived {
        background: var(--pill-daijobu-bg);
        color: var(--pill-daijobu-fg);
      }
      &.learning {
        background: var(--pill-nantonaku-bg);
        color: var(--pill-nantonaku-fg);
      }
      &.new {
        background: var(--surface-subtle);
        color: var(--text-secondary);
      }
    }
    .word-actions {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .load-more-btn {
      align-self: center;
      margin-top: 8px;
      border-radius: 20px;
    }
  `,
})
export class WordsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FirebaseService);
  private readonly vocab = inject(VocabularyService);
  private readonly snackBar = inject(MatSnackBar);
  readonly tts = inject(TtsService);

  readonly mode = signal<StudyMode>('tone');
  readonly level = signal<HskLevel>(1);
  readonly loading = signal(true);
  readonly searchText = signal('');
  readonly filterStatus = signal<'all' | WordStatus>('all');
  readonly displayLimit = signal(50);

  private readonly rows = signal<WordRow[]>([]);

  readonly filteredRows = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    const status = this.filterStatus();

    return this.rows().filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (!q) return true;
      return (
        r.word.hanzi.toLowerCase().includes(q) ||
        r.word.pinyin.toLowerCase().includes(q) ||
        r.word.meaning.toLowerCase().includes(q)
      );
    });
  });

  async ngOnInit(): Promise<void> {
    const modeParam = this.route.snapshot.paramMap.get('mode');
    const levelParam = Number(this.route.snapshot.paramMap.get('level'));

    this.mode.set(modeParam === 'audio' ? 'audio' : 'tone');
    this.level.set(
      levelParam >= 1 && levelParam <= 6 ? (levelParam as HskLevel) : 1,
    );

    await this.loadRows();
  }

  private async loadRows(): Promise<void> {
    this.loading.set(true);
    try {
      const [words, progMap] = await Promise.all([
        this.vocab.getLevelWords(this.level()),
        this.fb.loadLevelProgress(this.mode(), this.level()),
      ]);
      this.rows.set(
        words.map((word) => {
          const progress = progMap.get(word.id) ?? null;
          const status: WordStatus = progress ? progress.status : 'new';
          return { word, progress, status };
        }),
      );
    } finally {
      this.loading.set(false);
    }
  }

  async onResetWord(row: WordRow): Promise<void> {
    await this.fb.resetWordProgress(this.mode(), this.level(), row.word.id);
    this.rows.update((list) =>
      list.map((r) =>
        r.word.id === row.word.id
          ? { ...r, progress: null, status: 'new' }
          : r,
      ),
    );
    this.snackBar.open(`「${row.word.hanzi}」を未学習に戻しました`, undefined, {
      duration: 2000,
    });
  }

  loadMore(): void {
    this.displayLimit.update((v) => v + 50);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}

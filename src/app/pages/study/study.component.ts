import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  HskLevel,
  SelfScore,
  SessionCard,
  StudyMode,
  VocabWord,
  WordProgress,
} from '../../models/vocab.model';
import { FirebaseService } from '../../services/firebase.service';
import { DEFAULT_SESSION_SIZE, SrsService } from '../../services/srs.service';
import { TtsService } from '../../services/tts.service';
import { VocabularyService } from '../../services/vocabulary.service';

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatToolbarModule,
  ],
  template: `
    <mat-toolbar class="study-toolbar">
      <button mat-icon-button (click)="goHome()" aria-label="ホームに戻る">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <div class="toolbar-info">
        <span class="toolbar-title">
          HSK {{ level() }}級 ·
          {{ mode() === 'tone' ? '① 声調特訓' : '② 音→概念' }}
        </span>
        @if (!loading() && !sessionFinished()) {
          <span class="toolbar-sub">
            {{ Math.min(currentIndex() + 1, queue().length) }} /
            {{ queue().length }}
          </span>
        }
      </div>
      <span class="spacer"></span>
      <button
        mat-stroked-button
        class="rate-btn"
        (click)="toggleRate()"
        aria-label="読み上げ速度切替"
      >
        {{ ttsRate() === 1.0 ? '1.0x' : '0.8x' }}
      </button>
    </mat-toolbar>

    @if (!loading() && !sessionFinished() && queue().length > 0) {
      <mat-progress-bar
        mode="determinate"
        [value]="(currentIndex() / queue().length) * 100"
      />
    }

    <main class="study-main">
      @if (loading()) {
        <div class="center-state">
          <mat-spinner diameter="40" />
          <p>出題カードを準備中...</p>
        </div>
      } @else if (queue().length === 0) {
        <mat-card class="summary-card" appearance="outlined">
          <mat-icon class="big-icon done-icon">task_alt</mat-icon>
          <h2>本日の対象単語はありません</h2>
          <p>
            復習期限が来ている単語や未学習の単語がありません。<br />
            期限前の単語を前倒しで復習することもできます。
          </p>
          <div class="summary-actions">
            <button
              mat-flat-button
              color="primary"
              (click)="startSession(true)"
            >
              前倒しで復習する
            </button>
            <button mat-stroked-button (click)="goHome()">ホームへ戻る</button>
          </div>
        </mat-card>
      } @else if (sessionFinished()) {
        <mat-card class="summary-card" appearance="outlined">
          <mat-icon class="big-icon done-icon">celebration</mat-icon>
          <h2>セット完了！</h2>
          <div class="result-grid">
            <div class="result-box daijobu-box">
              <span class="num">{{ daijobuCount() }}</span>
              <span class="lbl">もう大丈夫</span>
            </div>
            <div class="result-box oboeta-box">
              <span class="num">{{ oboetaCount() }}</span>
              <span class="lbl">覚えた</span>
            </div>
            <div class="result-box nantonaku-box">
              <span class="num">{{ nantonakuCount() }}</span>
              <span class="lbl">なんとなく</span>
            </div>
            <div class="result-box madamada-box">
              <span class="num">{{ madamadaCount() }}</span>
              <span class="lbl">まだまだ</span>
            </div>
          </div>
          @if (archivedInSession() > 0) {
            <p class="archived-note">
              今回新たに <strong>{{ archivedInSession() }}語</strong> がアーカイブ（習得済み）になりました！
            </p>
          }
          <div class="summary-actions">
            <button
              mat-flat-button
              color="primary"
              (click)="startSession(false)"
            >
              続けて次のセットへ
            </button>
            <button mat-stroked-button (click)="goHome()">ホームへ戻る</button>
          </div>
        </mat-card>
      } @else if (currentCard(); as card) {
        <div class="card-stage">
          <mat-card
            class="flashcard"
            appearance="outlined"
            (click)="revealAnswer()"
            tabindex="0"
            role="button"
            [attr.aria-label]="isRevealed() ? '解答表示中' : 'タップして答えを表示'"
          >
            <div class="card-meta">
              <span class="status-pill" [class.retry]="card.isRetryInSession">
                @if (card.isRetryInSession) {
                  再チャレンジ
                } @else if (!card.progress) {
                  新規
                } @else {
                  復習
                }
              </span>
              <div class="streak-dots" aria-label="連続正解数">
                @for (step of [1, 2, 3]; track step) {
                  <span
                    class="dot"
                    [class.filled]="(card.progress?.streak ?? 0) >= step"
                  ></span>
                }
              </div>
            </div>

            <div class="card-body">
              @if (mode() === 'tone') {
                <!-- ① 声調特訓モード: 表＝漢字＋意味 / 裏＝ピンイン＋音声 -->
                <div class="primary-prompt hanzi-font">
                  {{ card.word.hanzi }}
                </div>
                <div class="meaning-prompt">{{ card.word.meaning }}</div>

                @if (isRevealed()) {
                  <div class="answer-divider"></div>
                  <div class="answer-block">
                    <div class="pinyin-answer">{{ card.word.pinyin }}</div>
                    <button
                      mat-tonal-button
                      type="button"
                      class="speak-btn"
                      (click)="playAudio($event, card.word)"
                    >
                      <mat-icon>volume_up</mat-icon>
                      発音を聞く
                    </button>
                  </div>
                } @else {
                  <p class="tap-hint">タップしてピンイン・声調を確認</p>
                }
              } @else {
                <!-- ② 音→概念モード: 表＝ピンイン＋音声 / 裏＝漢字＋意味 -->
                <div class="primary-prompt pinyin-prompt">
                  {{ card.word.pinyin }}
                </div>
                <button
                  mat-tonal-button
                  type="button"
                  class="speak-btn"
                  (click)="playAudio($event, card.word)"
                >
                  <mat-icon>volume_up</mat-icon>
                  {{ tts.isSpeaking() ? '再生中...' : 'もう一度聞く' }}
                </button>

                @if (isRevealed()) {
                  <div class="answer-divider"></div>
                  <div class="answer-block">
                    <div class="hanzi-answer hanzi-font">
                      {{ card.word.hanzi }}
                    </div>
                    <div class="meaning-answer">{{ card.word.meaning }}</div>
                  </div>
                } @else {
                  <p class="tap-hint">意味を思い浮かべてタップ</p>
                }
              }
            </div>
          </mat-card>
        </div>

        <footer class="bottom-actions">
          @if (!isRevealed()) {
            <button
              mat-flat-button
              color="primary"
              class="reveal-btn"
              (click)="revealAnswer()"
            >
              答えを見る
            </button>
          } @else {
            <div class="score-buttons">
              <button
                mat-flat-button
                class="score-btn madamada-btn"
                (click)="submitScore('madamada')"
              >
                <span class="label">まだまだ</span>
                <span class="sub">もう1回</span>
              </button>
              <button
                mat-flat-button
                class="score-btn nantonaku-btn"
                (click)="submitScore('nantonaku')"
              >
                <span class="label">なんとなく</span>
                <span class="sub">6時間後</span>
              </button>
              <button
                mat-flat-button
                class="score-btn oboeta-btn"
                (click)="submitScore('oboeta')"
              >
                <span class="label">覚えた</span>
                <span class="sub">忘却曲線</span>
              </button>
              <button
                mat-flat-button
                class="score-btn daijobu-btn"
                (click)="submitScore('daijobu')"
              >
                <span class="label">もう大丈夫</span>
                <span class="sub">今後除外</span>
              </button>
            </div>
          }
        </footer>
      }
    </main>
  `,
  styles: `
    .study-toolbar {
      background: var(--surface-bg);
      color: var(--text-primary);
      border-bottom: 1px solid var(--border-color);
    }
    .toolbar-info {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
      margin-left: 4px;
    }
    .toolbar-title {
      font-size: 1rem;
      font-weight: 700;
    }
    .toolbar-sub {
      font-size: 0.78rem;
      color: var(--text-secondary);
    }
    .spacer {
      flex: 1;
    }
    .rate-btn {
      min-width: 56px;
      height: 34px;
      font-size: 0.8rem;
    }
    .study-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 16px;
      gap: 16px;
    }
    .center-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #5f6368;
    }
    .card-stage {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .flashcard {
      flex: 1;
      min-height: 340px;
      padding: 20px;
      border-radius: 24px;
      background: var(--surface-bg);
      display: flex;
      flex-direction: column;
      cursor: pointer;
      user-select: none;
      transition: box-shadow 0.2s ease;
      &:active {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }
    }
    .card-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .status-pill {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
      background: #e8f0fe;
      color: #1967d2;
      &.retry {
        background: #fef7e0;
        color: #b06000;
      }
    }
    .streak-dots {
      display: flex;
      gap: 6px;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid var(--accent-primary);
      &.filled {
        background: var(--accent-primary);
      }
    }
    .card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 16px;
      padding: 16px 0;
    }
    .primary-prompt {
      font-size: clamp(2.4rem, 11vw, 3.8rem);
      font-weight: 700;
      line-height: 1.25;
      color: var(--text-primary);
    }
    .pinyin-prompt {
      font-size: clamp(2rem, 8vw, 3rem);
      color: var(--accent-heading);
    }
    .meaning-prompt {
      font-size: 1.05rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .tap-hint {
      margin: 12px 0 0;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .answer-divider {
      width: 60%;
      height: 1px;
      background: var(--border-color);
    }
    .answer-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      animation: fadeIn 0.18s ease-out;
    }
    .pinyin-answer {
      font-size: clamp(1.6rem, 6vw, 2.2rem);
      font-weight: 700;
      color: var(--accent-primary);
    }
    .hanzi-answer {
      font-size: clamp(2.2rem, 9vw, 3.2rem);
      font-weight: 700;
      color: var(--text-primary);
    }
    .meaning-answer {
      font-size: 1.15rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .speak-btn {
      margin-top: 4px;
      border-radius: 999px;
    }
    .bottom-actions {
      padding-bottom: env(safe-area-inset-bottom, 8px);
    }
    .reveal-btn {
      width: 100%;
      height: 54px;
      font-size: 1.05rem;
      border-radius: 16px;
    }
    .score-buttons {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .score-btn {
      height: 58px;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      line-height: 1.2;
      ::ng-deep .mdc-button__label {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }
      .label {
        font-size: 0.92rem;
        font-weight: 700;
      }
      .sub {
        font-size: 0.7rem;
        font-weight: 500;
        opacity: 0.4;
      }
    }
    .madamada-btn {
      background-color: var(--btn-madamada-bg) !important;
      color: var(--btn-madamada-fg) !important;
    }
    .nantonaku-btn {
      background-color: var(--btn-nantonaku-bg) !important;
      color: var(--btn-nantonaku-fg) !important;
    }
    .oboeta-btn {
      background-color: var(--btn-oboeta-bg) !important;
      color: var(--btn-oboeta-fg) !important;
    }
    .daijobu-btn {
      background-color: var(--btn-daijobu-bg) !important;
      color: var(--btn-daijobu-fg) !important;
    }
    .summary-card {
      margin: auto 0;
      padding: 28px 20px;
      border-radius: 24px;
      background: var(--surface-bg);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      h2 {
        margin: 0;
      }
      p {
        margin: 0;
        color: var(--text-secondary);
        font-size: 0.92rem;
      }
    }
    .big-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
    }
    .done-icon {
      color: var(--accent-primary);
    }
    .result-grid {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin: 8px 0;
    }
    .result-box {
      padding: 12px 6px;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      .num {
        font-size: 1.5rem;
        font-weight: 700;
      }
      .lbl {
        font-size: 0.78rem;
        font-weight: 600;
      }
    }
    .daijobu-box {
      background: var(--pill-daijobu-bg);
      color: var(--pill-daijobu-fg);
    }
    .oboeta-box {
      background: var(--pill-oboeta-bg);
      color: var(--pill-oboeta-fg);
    }
    .nantonaku-box {
      background: var(--pill-nantonaku-bg);
      color: var(--pill-nantonaku-fg);
    }
    .madamada-box {
      background: var(--pill-madamada-bg);
      color: var(--pill-madamada-fg);
    }
    .archived-note {
      color: var(--accent-primary) !important;
      font-weight: 500;
    }
    .summary-actions {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
      button {
        height: 46px;
        border-radius: 23px;
      }
    }
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
})
export class StudyComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FirebaseService);
  private readonly vocab = inject(VocabularyService);
  private readonly srs = inject(SrsService);
  private readonly snackBar = inject(MatSnackBar);
  readonly tts = inject(TtsService);
  readonly Math = Math;

  readonly mode = signal<StudyMode>('tone');
  readonly level = signal<HskLevel>(1);
  readonly loading = signal(true);
  readonly queue = signal<SessionCard[]>([]);
  readonly currentIndex = signal(0);
  readonly isRevealed = signal(false);
  readonly sessionFinished = signal(false);
  readonly ttsRate = signal(1.0);

  readonly daijobuCount = signal(0);
  readonly oboetaCount = signal(0);
  readonly nantonakuCount = signal(0);
  readonly madamadaCount = signal(0);
  readonly archivedInSession = signal(0);

  private allWords: VocabWord[] = [];
  private progressMap = new Map<string, WordProgress>();

  readonly currentCard = computed(
    () => this.queue()[this.currentIndex()] ?? null,
  );

  async ngOnInit(): Promise<void> {
    const modeParam = this.route.snapshot.paramMap.get('mode');
    const levelParam = Number(this.route.snapshot.paramMap.get('level'));

    this.mode.set(modeParam === 'audio' ? 'audio' : 'tone');
    this.level.set(
      levelParam >= 1 && levelParam <= 6 ? (levelParam as HskLevel) : 1,
    );

    await this.loadDataAndStart(false);
  }

  ngOnDestroy(): void {
    this.tts.stop();
  }

  private async loadDataAndStart(includeAhead: boolean): Promise<void> {
    this.loading.set(true);
    try {
      const [words, progMap] = await Promise.all([
        this.vocab.getLevelWords(this.level()),
        this.fb.loadLevelProgress(this.mode(), this.level()),
      ]);
      this.allWords = words;
      this.progressMap = progMap;
      this.startSession(includeAhead);
    } finally {
      this.loading.set(false);
    }
  }

  startSession(includeAhead: boolean): void {
    const selected = this.srs.buildSessionQueue(
      this.allWords,
      this.progressMap,
      DEFAULT_SESSION_SIZE,
      Date.now(),
      includeAhead,
    );
    this.queue.set(selected);
    this.currentIndex.set(0);
    this.isRevealed.set(false);
    this.sessionFinished.set(false);
    this.daijobuCount.set(0);
    this.oboetaCount.set(0);
    this.nantonakuCount.set(0);
    this.madamadaCount.set(0);
    this.archivedInSession.set(0);

    if (selected.length > 0 && this.mode() === 'audio') {
      this.tts.speak(selected[0].word.hanzi, this.ttsRate());
    }
  }

  revealAnswer(): void {
    if (!this.isRevealed()) {
      this.isRevealed.set(true);
    }
  }

  playAudio(event: Event, word: VocabWord): void {
    event.stopPropagation();
    this.tts.speak(word.hanzi, this.ttsRate());
  }

  toggleRate(): void {
    this.ttsRate.update((r) => (r === 1.0 ? 0.8 : 1.0));
    const card = this.currentCard();
    if (card && this.mode() === 'audio') {
      this.tts.speak(card.word.hanzi, this.ttsRate());
    }
  }

  submitScore(score: SelfScore): void {
    const card = this.currentCard();
    if (!card) return;

    if (score === 'daijobu') this.daijobuCount.update((c) => c + 1);
    else if (score === 'oboeta' || score === 'circle')
      this.oboetaCount.update((c) => c + 1);
    else if (score === 'nantonaku' || score === 'triangle')
      this.nantonakuCount.update((c) => c + 1);
    else this.madamadaCount.update((c) => c + 1);

    const updated = this.srs.calculateNextProgress(
      card.word,
      this.mode(),
      card.progress,
      score,
    );

    this.progressMap.set(card.word.id, updated);

    if (updated.status === 'archived') {
      this.archivedInSession.update((c) => c + 1);
      const msg =
        score === 'daijobu'
          ? `「${card.word.hanzi}」を今後出題しないリストへ移動しました`
          : `「${card.word.hanzi}」を習得済みにアーカイブしました！`;
      this.snackBar.open(msg, undefined, { duration: 2000 });
    }

    // Firestore / localStorage への保存は非同期で実行（UX を止めない）
    this.fb.saveProgress(updated).catch(() => {
      this.snackBar.open('進捗の保存に失敗しました', '閉じる', {
        duration: 3000,
      });
    });

    // 「まだまだ」の場合のみ、同じセッションの3問後に再出題キューへ追加
    const nextQueue = [...this.queue()];
    if (score === 'madamada' || score === 'cross') {
      const retryCard: SessionCard = {
        word: card.word,
        progress: updated,
        isRetryInSession: true,
      };
      const insertAt = Math.min(this.currentIndex() + 4, nextQueue.length);
      nextQueue.splice(insertAt, 0, retryCard);
      this.queue.set(nextQueue);
    }

    const nextIdx = this.currentIndex() + 1;
    if (nextIdx >= nextQueue.length) {
      this.tts.stop();
      this.sessionFinished.set(true);
    } else {
      this.currentIndex.set(nextIdx);
      this.isRevealed.set(false);
      if (this.mode() === 'audio') {
        // モバイル自動再生制限対策: クリックイベント内で同期的に呼び出す
        this.tts.speak(nextQueue[nextIdx].word.hanzi, this.ttsRate());
      }
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (this.loading() || this.sessionFinished() || !this.currentCard()) return;

    if (event.key === ' ' || event.key === 'Enter') {
      if (!this.isRevealed()) {
        event.preventDefault();
        this.revealAnswer();
      }
    } else if (event.key.toLowerCase() === 'r') {
      const card = this.currentCard();
      if (card) {
        this.tts.speak(card.word.hanzi, this.ttsRate());
      }
    } else if (this.isRevealed()) {
      if (event.key === '1') {
        this.submitScore('madamada');
      } else if (event.key === '2') {
        this.submitScore('nantonaku');
      } else if (event.key === '3') {
        this.submitScore('oboeta');
      } else if (event.key === '4') {
        this.submitScore('daijobu');
      }
    }
  }

  goHome(): void {
    this.tts.stop();
    this.router.navigate(['/']);
  }
}

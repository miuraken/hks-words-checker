import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  DailyStatSnapshot,
  HskLevel,
  StudyMode,
} from '../../models/vocab.model';
import { FirebaseService } from '../../services/firebase.service';
import { SrsService } from '../../services/srs.service';
import { HSK_LEVEL_TOTALS } from '../../services/vocabulary.service';

interface ChartBar {
  dayNumber: number;
  date: string;
  madamada: number;
  nantonaku: number;
  oboeta: number;
  daijobu: number;
  total: number;
  x: number;
  width: number;
  // bottom-up stacked heights
  yDaijobu: number;
  hDaijobu: number;
  yOboeta: number;
  hOboeta: number;
  yNantonaku: number;
  hNantonaku: number;
  yMadamada: number;
  hMadamada: number;
}

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
  ],
  template: `
    <mat-toolbar class="stats-toolbar">
      <button mat-icon-button (click)="goHome()" aria-label="ホームに戻る">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <span>
        HSK {{ level() }}級 学習推移 ({{
          mode() === 'tone' ? '① 声調特訓' : '② 音→概念'
        }})
      </span>
    </mat-toolbar>

    <main class="stats-main">
      @if (loading()) {
        <div class="center-box">
          <mat-spinner diameter="36" />
          <p>統計データを読み込み中...</p>
        </div>
      } @else {
        <!-- 現在の4状態サマリー -->
        <mat-card class="summary-card" appearance="outlined">
          <h2 class="card-title">
            現在の学習状況 (全 {{ totalWords() }} 語中
            {{ currentTotal() }} 語着手)
          </h2>
          <div class="current-grid">
            <div class="stat-pill madamada">
              <span class="num">{{ currentBreakdown().madamada }}</span>
              <span class="lbl">まだまだ</span>
            </div>
            <div class="stat-pill nantonaku">
              <span class="num">{{ currentBreakdown().nantonaku }}</span>
              <span class="lbl">なんとなく</span>
            </div>
            <div class="stat-pill oboeta">
              <span class="num">{{ currentBreakdown().oboeta }}</span>
              <span class="lbl">覚えた</span>
            </div>
            <div class="stat-pill daijobu">
              <span class="num">{{ currentBreakdown().daijobu }}</span>
              <span class="lbl">もう大丈夫</span>
            </div>
          </div>
        </mat-card>

        <!-- 日次累積グラフ -->
        <mat-card class="chart-card" appearance="outlined">
          <div class="chart-header">
            <h2 class="card-title">日次 累積語数推移</h2>
            <span class="chart-sub">
              学習した日のみカウント（計 {{ snapshots().length }} 日）
            </span>
          </div>

          @if (snapshots().length === 0) {
            <div class="empty-chart">
              <mat-icon>bar_chart</mat-icon>
              <p>
                この級で特訓を開始すると、学習日ごとの累積推移グラフがここに表示されます。
              </p>
            </div>
          } @else {
            <div class="legend">
              <span class="leg-item"
                ><i class="sw daijobu"></i>もう大丈夫</span
              >
              <span class="leg-item"><i class="sw oboeta"></i>覚えた</span>
              <span class="leg-item"
                ><i class="sw nantonaku"></i>なんとなく</span
              >
              <span class="leg-item"
                ><i class="sw madamada"></i>まだまだ</span
              >
            </div>

            <div class="svg-scroll">
              <svg
                [attr.viewBox]="'0 0 ' + svgWidth() + ' ' + svgHeight"
                [style.min-width.px]="svgWidth()"
                class="chart-svg"
                role="img"
                aria-label="日次累積語数グラフ"
              >
                <!-- 横グリッド線 -->
                @for (tick of yTicks(); track tick.value) {
                  <line
                    [attr.x1]="padLeft"
                    [attr.x2]="svgWidth() - padRight"
                    [attr.y1]="tick.y"
                    [attr.y2]="tick.y"
                    stroke="var(--chart-grid)"
                    stroke-width="1"
                  />
                  <text
                    [attr.x]="padLeft - 6"
                    [attr.y]="tick.y + 4"
                    text-anchor="end"
                    class="axis-label"
                  >
                    {{ tick.value }}
                  </text>
                }

                <!-- 積み上げバー -->
                @for (bar of bars(); track bar.date) {
                  <g
                    class="bar-group"
                    (click)="selectedDay.set(bar.dayNumber)"
                    tabindex="0"
                    (keydown.enter)="selectedDay.set(bar.dayNumber)"
                  >
                    @if (selectedDay() === bar.dayNumber) {
                      <rect
                        [attr.x]="bar.x - 3"
                        [attr.y]="padTop - 4"
                        [attr.width]="bar.width + 6"
                        [attr.height]="plotHeight + 8"
                        rx="4"
                        fill="var(--chart-highlight)"
                      />
                    }

                    @if (bar.hDaijobu > 0) {
                      <rect
                        [attr.x]="bar.x"
                        [attr.y]="bar.yDaijobu"
                        [attr.width]="bar.width"
                        [attr.height]="bar.hDaijobu"
                        fill="#0d652d"
                      />
                    }
                    @if (bar.hOboeta > 0) {
                      <rect
                        [attr.x]="bar.x"
                        [attr.y]="bar.yOboeta"
                        [attr.width]="bar.width"
                        [attr.height]="bar.hOboeta"
                        fill="#006a6a"
                      />
                    }
                    @if (bar.hNantonaku > 0) {
                      <rect
                        [attr.x]="bar.x"
                        [attr.y]="bar.yNantonaku"
                        [attr.width]="bar.width"
                        [attr.height]="bar.hNantonaku"
                        fill="#e37400"
                      />
                    }
                    @if (bar.hMadamada > 0) {
                      <rect
                        [attr.x]="bar.x"
                        [attr.y]="bar.yMadamada"
                        [attr.width]="bar.width"
                        [attr.height]="bar.hMadamada"
                        fill="#c5221f"
                      />
                    }

                    <!-- X軸ラベル (日数) -->
                    <text
                      [attr.x]="bar.x + bar.width / 2"
                      [attr.y]="svgHeight - 8"
                      text-anchor="middle"
                      class="axis-label"
                      [class.active-day]="selectedDay() === bar.dayNumber"
                    >
                      {{ bar.dayNumber }}日
                    </text>
                  </g>
                }
              </svg>
            </div>

            @if (selectedBar(); as sel) {
              <div class="detail-box">
                <div class="detail-title">
                  <strong>{{ sel.dayNumber }}日目</strong>
                  <span>({{ sel.date }})</span>
                  <span class="detail-total">合計 {{ sel.total }} 語</span>
                </div>
                <div class="detail-counts">
                  <span class="c-daijobu">もう大丈夫: {{ sel.daijobu }}</span>
                  <span class="c-oboeta">覚えた: {{ sel.oboeta }}</span>
                  <span class="c-nantonaku"
                    >なんとなく: {{ sel.nantonaku }}</span
                  >
                  <span class="c-madamada">まだまだ: {{ sel.madamada }}</span>
                </div>
              </div>
            }
          }
        </mat-card>
      }
    </main>
  `,
  styles: `
    .stats-toolbar {
      background: var(--surface-bg);
      color: var(--text-primary);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .stats-main {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-bottom: 32px;
    }
    .center-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 0;
      gap: 12px;
      color: var(--text-secondary);
    }
    .summary-card,
    .chart-card {
      padding: 16px;
      border-radius: 18px;
      background: var(--surface-bg);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .card-title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .current-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .stat-pill {
      padding: 10px 4px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      .num {
        font-size: 1.25rem;
        font-weight: 700;
      }
      .lbl {
        font-size: 0.7rem;
        font-weight: 600;
      }
      &.madamada {
        background: var(--pill-madamada-bg);
        color: var(--pill-madamada-fg);
      }
      &.nantonaku {
        background: var(--pill-nantonaku-bg);
        color: var(--pill-nantonaku-fg);
      }
      &.oboeta {
        background: var(--pill-oboeta-bg);
        color: var(--pill-oboeta-fg);
      }
      &.daijobu {
        background: var(--pill-daijobu-bg);
        color: var(--pill-daijobu-fg);
      }
    }
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 4px;
    }
    .chart-sub {
      font-size: 0.78rem;
      color: var(--text-secondary);
    }
    .empty-chart {
      padding: 32px 12px;
      text-align: center;
      color: var(--text-secondary);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: var(--text-muted);
      }
      p {
        margin: 0;
        font-size: 0.85rem;
      }
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 0.78rem;
      color: var(--text-secondary);
    }
    .leg-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .sw {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 2px;
      &.daijobu {
        background: #0d652d;
      }
      &.oboeta {
        background: #006a6a;
      }
      &.nantonaku {
        background: #e37400;
      }
      &.madamada {
        background: #c5221f;
      }
    }
    .svg-scroll {
      width: 100%;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .chart-svg {
      display: block;
      width: 100%;
      height: auto;
    }
    .axis-label {
      font-size: 10px;
      fill: var(--text-secondary);
      &.active-day {
        fill: var(--accent-heading);
        font-weight: 700;
      }
    }
    .bar-group {
      cursor: pointer;
      outline: none;
    }
    .detail-box {
      background: var(--surface-subtle);
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .detail-title {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: 0.85rem;
    }
    .detail-total {
      margin-left: auto;
      font-weight: 600;
      color: var(--accent-heading);
    }
    .detail-counts {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .c-daijobu {
      color: var(--pill-daijobu-fg);
    }
    .c-oboeta {
      color: var(--pill-oboeta-fg);
    }
    .c-nantonaku {
      color: var(--pill-nantonaku-fg);
    }
    .c-madamada {
      color: var(--pill-madamada-fg);
    }
  `,
})
export class StatsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FirebaseService);
  private readonly srs = inject(SrsService);

  readonly mode = signal<StudyMode>('tone');
  readonly level = signal<HskLevel>(1);
  readonly loading = signal(true);
  readonly snapshots = signal<DailyStatSnapshot[]>([]);
  readonly currentBreakdown = signal({
    madamada: 0,
    nantonaku: 0,
    oboeta: 0,
    daijobu: 0,
  });
  readonly selectedDay = signal<number | null>(null);

  readonly padLeft = 36;
  readonly padRight = 12;
  readonly padTop = 14;
  readonly padBottom = 26;
  readonly svgHeight = 220;
  readonly plotHeight = this.svgHeight - this.padTop - this.padBottom;

  readonly totalWords = computed(() => HSK_LEVEL_TOTALS[this.level()]);
  readonly currentTotal = computed(() => {
    const b = this.currentBreakdown();
    return b.madamada + b.nantonaku + b.oboeta + b.daijobu;
  });

  readonly svgWidth = computed(() =>
    Math.max(320, this.padLeft + this.padRight + this.snapshots().length * 36),
  );

  private readonly maxY = computed(() => {
    let max = 10;
    for (const s of this.snapshots()) {
      const t = s.madamada + s.nantonaku + s.oboeta + s.daijobu;
      if (t > max) max = t;
    }
    return Math.ceil(max / 5) * 5;
  });

  readonly yTicks = computed(() => {
    const max = this.maxY();
    const steps = 4;
    const ticks = [];
    for (let i = 0; i <= steps; i++) {
      const value = Math.round((max / steps) * i);
      const y =
        this.padTop + this.plotHeight - (value / max) * this.plotHeight;
      ticks.push({ value, y });
    }
    return ticks;
  });

  readonly bars = computed<ChartBar[]>(() => {
    const list = this.snapshots();
    const max = this.maxY();
    const count = list.length;
    if (count === 0) return [];

    const availW = this.svgWidth() - this.padLeft - this.padRight;
    const slotW = availW / count;
    const barW = Math.min(26, Math.max(12, slotW * 0.62));
    const baseLine = this.padTop + this.plotHeight;

    return list.map((s, idx) => {
      const scale = (v: number) => (v / max) * this.plotHeight;
      const hDaijobu = scale(s.daijobu);
      const hOboeta = scale(s.oboeta);
      const hNantonaku = scale(s.nantonaku);
      const hMadamada = scale(s.madamada);

      const yDaijobu = baseLine - hDaijobu;
      const yOboeta = yDaijobu - hOboeta;
      const yNantonaku = yOboeta - hNantonaku;
      const yMadamada = yNantonaku - hMadamada;

      return {
        dayNumber: idx + 1,
        date: s.date,
        madamada: s.madamada,
        nantonaku: s.nantonaku,
        oboeta: s.oboeta,
        daijobu: s.daijobu,
        total: s.madamada + s.nantonaku + s.oboeta + s.daijobu,
        x: this.padLeft + idx * slotW + (slotW - barW) / 2,
        width: barW,
        yDaijobu,
        hDaijobu,
        yOboeta,
        hOboeta,
        yNantonaku,
        hNantonaku,
        yMadamada,
        hMadamada,
      };
    });
  });

  readonly selectedBar = computed(() => {
    const day = this.selectedDay();
    if (!day) return null;
    return this.bars().find((b) => b.dayNumber === day) ?? null;
  });

  async ngOnInit(): Promise<void> {
    const modeParam = this.route.snapshot.paramMap.get('mode');
    const levelParam = Number(this.route.snapshot.paramMap.get('level'));

    this.mode.set(modeParam === 'audio' ? 'audio' : 'tone');
    this.level.set(
      levelParam >= 1 && levelParam <= 6 ? (levelParam as HskLevel) : 1,
    );

    this.loading.set(true);
    try {
      const [progMap, stats] = await Promise.all([
        this.fb.loadLevelProgress(this.mode(), this.level()),
        this.fb.loadDailyStats(this.mode(), this.level()),
      ]);
      this.currentBreakdown.set(this.srs.computeStatusBreakdown(progMap));
      this.snapshots.set(stats);
      if (stats.length > 0) {
        this.selectedDay.set(stats.length);
      }
    } finally {
      this.loading.set(false);
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}

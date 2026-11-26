import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-help-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="title-icon">translate</mat-icon>
      HSK 語彙特訓について
    </h2>

    <mat-dialog-content class="dialog-content">
      <p class="intro-text">
        中国語学習における<strong>「声調があやふや」</strong>と<strong>「音を聞いても意味がすぐ浮かばない」</strong>という2つの課題を克服するためのフラッシュカード特訓アプリです（HSK 1〜6級・全 5,018 語収録）。
      </p>

      <section class="help-section">
        <h3>
          <mat-icon>record_voice_over</mat-icon>
          ① 声調特訓モード
        </h3>
        <p>
          <strong>目的：</strong>漢字と意味を見て、ピンインと声調を正確に思い浮かべる力を鍛えます。<br />
          解答画面では発音の確認や、同じ漢字を含む関連語句（〜N+2級）もあわせて復習できます。
        </p>
      </section>

      <section class="help-section">
        <h3>
          <mat-icon>hearing</mat-icon>
          ② 音→概念モード
        </h3>
        <p>
          <strong>目的：</strong>ピンインと中国語音声（TTS）から、漢字と意味を即座に結びつける聴解力を鍛えます。<br />
          読み上げ速度の切り替え（<code>1.0x</code> / <code>0.8x</code>）にも対応しています。
        </p>
      </section>

      <section class="help-section">
        <h3>
          <mat-icon>event_repeat</mat-icon>
          主な機能
        </h3>
        <ul>
          <li>
            <strong>忘却曲線（4段階採点）：</strong>
            「まだまだ（同セット内で再出題）」「なんとなく（6時間後）」「覚えた（1日後→3日後→3回連続でアーカイブ）」「もう大丈夫（今後除外）」で効率よく反復できます。
          </li>
          <li>
            <strong>進捗バー ＆ 日次推移グラフ：</strong>
            4状態の割合を色別プログレスバーで表示し、「推移」から実学習日数ごとの累積グラフを確認できます。
          </li>
          <li>
            <strong>ブックマーク：</strong>
            モードごとに気になる単語をチェックし、単語一覧からブックマークだけを絞り込めます。
          </li>
          <li>
            <strong>ゲスト利用 ＆ クラウド同期：</strong>
            ログインなしでもブラウザに自動保存され、Google ログインすると複数端末間で同期できます。
          </li>
        </ul>
      </section>

      <div class="repo-link-box">
        <mat-icon>code</mat-icon>
        <span>ソースコード・詳細：</span>
        <a
          href="https://github.com/miuraken/hks-words-checker/"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://github.com/miuraken/hks-words-checker/
        </a>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" mat-dialog-close>閉じる</button>
    </mat-dialog-actions>
  `,
  styles: `
    .dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.15rem;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .title-icon {
      color: var(--accent-primary);
    }
    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 14px;
      font-size: 0.88rem;
      line-height: 1.55;
      color: var(--text-primary);
    }
    .intro-text {
      margin: 0;
      color: var(--text-secondary);
    }
    .help-section {
      background: var(--surface-subtle);
      border-radius: 12px;
      padding: 10px 12px;
      h3 {
        margin: 0 0 6px;
        font-size: 0.92rem;
        font-weight: 700;
        color: var(--accent-heading);
        display: flex;
        align-items: center;
        gap: 6px;
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
      p {
        margin: 0;
        color: var(--text-secondary);
      }
      ul {
        margin: 0;
        padding-left: 18px;
        color: var(--text-secondary);
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      strong {
        color: var(--text-primary);
      }
    }
    .repo-link-box {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      padding-top: 6px;
      border-top: 1px solid var(--border-color);
      font-size: 0.8rem;
      color: var(--text-secondary);
      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
      a {
        color: var(--accent-primary);
        word-break: break-all;
      }
    }
  `,
})
export class HelpDialogComponent {}

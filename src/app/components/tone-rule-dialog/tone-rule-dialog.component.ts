import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ToneRuleType } from '../../models/vocab.model';

export interface ToneRuleDialogData {
  highlightRule?: ToneRuleType;
}

@Component({
  selector: 'app-tone-rule-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="title-icon">lightbulb</mat-icon>
      音読みから声調を推測する法則
    </h2>

    <mat-dialog-content class="dialog-content">
      <p class="intro-text">
        日本語の漢字の音読みから現代中国語（普通話）の声調を推測するルールは、
        <strong>「①語尾の形（入声か非入声か）」</strong>と
        <strong>「②頭子音の清濁（無声音か有声音か）」</strong>の2つの掛け合わせで整理できます。
      </p>

      <section class="rule-section">
        <h3>1. 全体対応表（音読みの特徴 → 普通話の声調）</h3>
        <div class="table-wrap">
          <table class="rule-table">
            <thead>
              <tr>
                <th>音読みの特徴</th>
                <th>中古音</th>
                <th>普通話の声調</th>
                <th>代表例</th>
              </tr>
            </thead>
            <tbody>
              <tr [class.highlighted]="highlightRule === 'jidaku_nissho'">
                <td><strong>〜ツ・チ・ク・キ</strong>（次濁：マ・ナ・ラ・ヤ・ワ行）</td>
                <td>次濁入声</td>
                <td><strong>第4声</strong>（ほぼ確実）</td>
                <td>物 wù / 力 lì / 月 yuè / 日 rì</td>
              </tr>
              <tr [class.highlighted]="highlightRule === 'zendaku_nissho'">
                <td><strong>〜ツ・チ・ク・キ</strong>（全濁：ガ・ザ・ダ・バ行）</td>
                <td>全濁入声</td>
                <td><strong>第2声</strong>（高確率）</td>
                <td>学 xué / 俗 sú / 奪 duó / 別 bié</td>
              </tr>
              <tr [class.highlighted]="highlightRule === 'seion_nissho'">
                <td><strong>〜ツ・チ・ク・キ</strong>（清音：カ・サ・タ・ハ行など）</td>
                <td>清入声</td>
                <td><strong>第4声が最多</strong>（1〜3声にも分散）</td>
                <td>作 zuò / 一 yī / 国 guó / 北 běi</td>
              </tr>
              <tr>
                <td><strong>上記以外</strong>（母音・ン・ウ終わり）で<strong>清音</strong></td>
                <td>清音の平・上・去</td>
                <td><strong>第1・3・4声</strong></td>
                <td>東 dōng (1) / 古 gǔ (3) / 去 qù (4)</td>
              </tr>
              <tr [class.highlighted]="highlightRule === 'zendaku_hi_nissho'">
                <td><strong>上記以外</strong>で<strong>全濁音</strong>（ガ・ザ・ダ・バ行）</td>
                <td>全濁の平・上・去</td>
                <td><strong>第2声・第4声</strong>（1・3声は原則なし）</td>
                <td>同 tóng (2) / 動 dòng (4)</td>
              </tr>
              <tr [class.highlighted]="highlightRule === 'jidaku_hi_nissho'">
                <td><strong>上記以外</strong>で<strong>次濁音</strong>（マ・ナ・ラ・ヤ・ワ行）</td>
                <td>次濁の平・上・去</td>
                <td><strong>第2・3・4声</strong>（1声は原則なし）</td>
                <td>人 rén (2) / 米 mǐ (3) / 問 wèn (4)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="rule-section">
        <h3>2. 実践的な3つの推測ステップ</h3>
        <div class="step-block">
          <h4>ステップ1：語尾が「〜ツ・〜チ・〜ク・〜キ」か？（入声の判定）</h4>
          <ul>
            <li>該当すればかつての<strong>入声</strong>です。</li>
            <li><strong>マ・ナ・ラ・ヤ・ワ行</strong>なら、ほぼ例外なく<strong>第4声</strong>（例：木 mù、熱 rè、立 lì、薬 yào）。</li>
            <li><strong>濁音（ガ・ザ・ダ・バ行）</strong>なら、高確率で<strong>第2声</strong>（例：白 bái、十 shí、読 dú）。</li>
            <li>それ以外の清音は<strong>第4声</strong>が最多で、次いで第1・2声、第3声は少数派です。</li>
          </ul>
        </div>

        <div class="step-block">
          <h4>ステップ2：頭子音は「濁音（ガ・ザ・ダ・バ行）」か？（全濁の判定）</h4>
          <ul>
            <li>日本語の漢音・呉音で濁音になる漢字は、<strong>第1声（陰平）になることが原則ありません</strong>。</li>
            <li>平声由来なら<strong>第2声</strong>（例：同 tóng、神 shén）、上声・去声由来なら<strong>第4声</strong>（例：道 dào、大 dà、電 diàn、部 bù）へ合流します（全濁上変去）。</li>
          </ul>
        </div>

        <div class="step-block">
          <h4>ステップ3：頭子音は「マ・ナ・ラ・ヤ・ワ行」か？（次濁の判定）</h4>
          <ul>
            <li>鼻音・流音で始まる漢字も、<strong>第1声になることが原則ありません</strong>（例外は「媽 mā」「拉 lā」など口語由来の字に限られます）。</li>
            <li>非入声なら<strong>第2・3・4声</strong>のいずれか（例：門 mén、馬 mǎ、面 miàn）、入声なら<strong>第4声</strong>に集中します。</li>
          </ul>
        </div>
      </section>

      <section class="rule-section">
        <h3>3. 例外が生じる主な理由（ズレの正体）</h3>
        <ol>
          <li>
            <strong>呉音と漢音の混在：</strong>
            日本語の音読みには「呉音（濁音が多い）」と「漢音（清音化）」が混在します。濁音の判断はより古い清濁を保つ<strong>呉音</strong>を基準にすると精度が上がります（例：「同」はドウ＝濁音なので第2声 tóng）。
          </li>
          <li>
            <strong>「〜ウ」語尾の合流：</strong>
            かつての入声語尾 <strong>-p</strong>（法・合・十など）は「〜フ」→「〜ウ」に変化したため、非入声の「〜ウ」（東・高など）と見た目上区別がつきにくくなっています。
          </li>
          <li>
            <strong>形声文字の音符と類推：</strong>
            同じパーツ（旁）を持つ漢字同士で声調が引きずられる現象（例：「百 bǎi」は清入声で第3声だが「白 bái」系列は第2声）が一部にあります。
          </li>
        </ol>
      </section>
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
      font-size: 1.08rem;
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
      font-size: 0.84rem;
      line-height: 1.55;
      color: var(--text-primary);
    }
    .intro-text {
      margin: 0;
      color: var(--text-secondary);
      strong {
        color: var(--text-primary);
      }
    }
    .rule-section {
      background: var(--surface-subtle);
      border-radius: 12px;
      padding: 10px 12px;
      h3 {
        margin: 0 0 8px;
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--accent-heading);
      }
      h4 {
        margin: 8px 0 4px;
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--text-primary);
      }
      ul,
      ol {
        margin: 0;
        padding-left: 18px;
        color: var(--text-secondary);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      strong {
        color: var(--text-primary);
      }
    }
    .step-block:first-of-type h4 {
      margin-top: 2px;
    }
    .table-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .rule-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.76rem;
      background: var(--surface-bg);
      border-radius: 8px;
      overflow: hidden;
      th,
      td {
        padding: 6px 7px;
        border-bottom: 1px solid var(--border-color);
        text-align: left;
        vertical-align: top;
      }
      th {
        font-weight: 700;
        color: var(--text-primary);
        background: var(--banner-bg);
        white-space: nowrap;
      }
      td {
        color: var(--text-secondary);
      }
      tr.highlighted td {
        background: var(--banner-bg);
        color: var(--banner-fg);
      }
      tr:last-child td {
        border-bottom: none;
      }
    }
  `,
})
export class ToneRuleDialogComponent {
  private readonly data = inject<ToneRuleDialogData | null>(MAT_DIALOG_DATA, {
    optional: true,
  });

  readonly highlightRule = this.data?.highlightRule;
}

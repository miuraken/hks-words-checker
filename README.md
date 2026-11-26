# HSK 語彙特訓フラッシュカード (HSK Words Checker)

中国語（HSK 1級〜6級・全 5,018 語）の **声調の定着** と **音と意味の即時結合** を目的とした、モバイルファーストの Web フラッシュカードアプリです。

- **公開 URL**: https://hsk-words-checker-261125.web.app
- **詳細仕様書**: [docs/SPECIFICATION.md](docs/SPECIFICATION.md)

---

## 主な機能

1. **① 声調特訓モード**
   - 漢字と日本語の意味を見て、頭の中でピンイン・声調を思い浮かべてから解答を確認します。
   - 確認用の音声再生ボタン付き。
2. **② 音→概念モード（聴解特訓）**
   - ピンイン表示と同時に中国語音声（`zh-CN` / Web Speech API TTS）を再生し、音から漢字・意味を即座に思い浮かべる練習ができます。
   - 再生速度の切り替え（`1.0x` / `0.8x`）に対応。
3. **忘却曲線（SRS）＆ 3回連続アーカイブ**
   - 「◯（自信あり）」「△（たまたま）」「✗（外れた）」の自己採点に基づき復習タイミングを自動計算します。
   - `◯` 1回目＝+1日後、2回目＝+3日後、**3回連続 `◯` で習得済みとしてアーカイブ**。`△` / `✗` は同セット後半に再出題します。
   - 1セット 15問構成で、モバイル片手操作および PC キーボードショートカット（`Space`/`Enter`, `1`/`2`/`3`, `R`）に対応しています。
4. **ゲスト利用 ＆ クラウド同期**
   - Google ログインなしでも、ブラウザの `localStorage` に進捗を保存してすぐに試せます。
   - Google アカウントでログインすると、Cloud Firestore を通じてスマホ・PC 間で学習履歴を同期できます。

---

## 技術スタック

- **フロントエンド**: Angular 22 (Standalone Components / Signals) + Angular Material
- **音声合成**: Web Speech API (`window.speechSynthesis`, `zh-CN`)
- **バックエンド / インフラ**: Firebase Hosting / Firebase Authentication (Google) / Cloud Firestore
- **語彙マスターデータ**: `vocabulary/hsk1.csv` 〜 `hsk6.csv`（ビルド前スクリプト `scripts/convert-vocab.mjs` により JSON 化）

---

## 開発・ビルド・デプロイ

```bash
# 依存パッケージのインストール
npm install --legacy-peer-deps

# 開発サーバー起動 (http://localhost:4200/)
npm start

# ユニットテスト実行 (Vitest)
npx vitest run src/app/services/srs.service.spec.ts

# 語彙 JSON 生成 & 本番ビルド
npm run build

# Firebase Hosting へデプロイ
firebase deploy --only hosting
```

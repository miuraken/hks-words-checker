import fs from 'node:fs';
import path from 'node:path';

const VOCAB_DIR = path.resolve('vocabulary');
const OUT_DIR = path.resolve('public', 'assets', 'vocabulary');

/**
 * シンプルな CSV 行パーサー（ダブルクォート・エスケープ対応）
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

let totalWords = 0;
const summary = [];

for (let level = 1; level <= 6; level++) {
  const csvPath = path.join(VOCAB_DIR, `hsk${level}.csv`);
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/);

  const words = [];
  // 1行目はヘッダ ("番号,中国語,ピンイン,日本語,FALSE") のためスキップ
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;

    const cols = parseCsvLine(line);
    if (cols.length < 4) continue;

    const numStr = cols[0].trim();
    const hanzi = cols[1].trim();
    const pinyin = cols[2].trim();
    const meaning = cols[3].trim();

    if (!hanzi || !numStr) continue;

    const number = Number.parseInt(numStr, 10);
    if (Number.isNaN(number)) continue;

    words.push({
      id: `hsk${level}_${number}`,
      level,
      number,
      hanzi,
      pinyin,
      meaning,
    });
  }

  const outPath = path.join(OUT_DIR, `hsk${level}.json`);
  fs.writeFileSync(outPath, JSON.stringify(words), 'utf-8');
  totalWords += words.length;
  summary.push({ level, count: words.length });
}

console.log('Vocabulary conversion complete:', summary, 'Total:', totalWords);

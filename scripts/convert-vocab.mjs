import fs from 'node:fs';
import path from 'node:path';

const VOCAB_DIR = path.resolve('vocabulary');
const OUT_DIR = path.resolve('public', 'assets', 'vocabulary');
const KANJI_DATA_PATH = path.resolve('scripts', 'kanji-tone-data.json');

const kanjiData = fs.existsSync(KANJI_DATA_PATH)
  ? JSON.parse(fs.readFileSync(KANJI_DATA_PATH, 'utf-8'))
  : {};

const JIDAKU_INIT = /^[まみむめもなにぬねのらりるれろやゆよわ]/;
const ZENDAKU_INIT = /^[がぎぐげござじずぜぞだぢづでどばびぶべぼ]/;
const SEION_INIT = /^[あいうえおかきくけこさしすせそたちつてとはひふへほ]/;
const NISSHO_END = /[つちくき]$/;

// 疑母 (中古音 ng- → 日本語ガ行) の次濁入声（第4声）
const GIBO_JIDAKU_NISSHO = new Set([
  '月', '玉', '逆', '虐', '岳', '楽', '乐', '额', '額', '鳄', '鱷',
]);

// 「十」など促音化（じっ）して表記される全濁入声の補足
const SPECIAL_ZENDAKU_NISSHO = {
  '十': 'じっ（じつ）',
};

const TONE_VOWELS = {
  'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4,
  'ē': 1, 'é': 2, 'ě': 3, 'è': 4,
  'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4,
  'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4,
  'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4,
  'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4,
  'ń': 2, 'ň': 3, 'ǹ': 4,
};

const STRIP_TONE = {
  'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
  'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
  'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
  'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
  'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
  'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v', 'ü': 'v',
  'ń': 'n', 'ň': 'n', 'ǹ': 'n',
};

const VALID_SYLLABLES = new Set([
  'a','ai','an','ang','ao','ba','bai','ban','bang','bao','bei','ben','beng','bi','bian','biao','bie','bin','bing','bo','bu',
  'ca','cai','can','cang','cao','ce','cen','ceng','cha','chai','chan','chang','chao','che','chen','cheng','chi','chong','chou','chu','chua','chuai','chuan','chuang','chui','chun','chuo','ci','cong','cou','cu','cuan','cui','cun','cuo',
  'da','dai','dan','dang','dao','de','dei','den','deng','di','dia','dian','diao','die','ding','diu','dong','dou','du','duan','dui','dun','duo',
  'e','ei','en','eng','er','fa','fan','fang','fei','fen','feng','fo','fou','fu',
  'ga','gai','gan','gang','gao','ge','gei','gen','geng','gong','gou','gu','gua','guai','guan','guang','gui','gun','guo',
  'ha','hai','han','hang','hao','he','hei','hen','heng','hong','hou','hu','hua','huai','huan','huang','hui','hun','huo',
  'ji','jia','jian','jiang','jiao','jie','jin','jing','jiong','jiu','ju','juan','jue','jun',
  'ka','kai','kan','kang','kao','ke','kei','ken','keng','kong','kou','ku','kua','kuai','kuan','kuang','kui','kun','kuo',
  'la','lai','lan','lang','lao','le','lei','leng','li','lia','lian','liang','liao','lie','lin','ling','liu','lo','long','lou','lu','luan','lun','luo','lv','lve','lue',
  'ma','mai','man','mang','mao','me','mei','men','meng','mi','mian','miao','mie','min','ming','miu','mo','mou','mu',
  'na','nai','nan','nang','nao','ne','nei','nen','neng','ni','nian','niang','niao','nie','nin','ning','niu','nong','nou','nu','nuan','nuo','nv','nve','nue',
  'o','ou','pa','pai','pan','pang','pao','pei','pen','peng','pi','pian','piao','pie','pin','ping','po','pou','pu',
  'qi','qia','qian','qiang','qiao','qie','qin','qing','qiong','qiu','qu','quan','que','qun',
  'ran','rang','rao','re','ren','reng','ri','rong','rou','ru','rua','ruan','rui','run','ruo',
  'sa','sai','san','sang','sao','se','sen','seng','sha','shai','shan','shang','shao','she','shei','shen','sheng','shi','shou','shu','shua','shuai','shuan','shuang','shui','shun','shuo','si','song','sou','su','suan','sui','sun','suo',
  'ta','tai','tan','tang','tao','te','tei','teng','ti','tian','tiao','tie','ting','tong','tou','tu','tuan','tui','tun','tuo',
  'wa','wai','wan','wang','wei','wen','weng','wo','wu',
  'xi','xia','xian','xiang','xiao','xie','xin','xing','xiong','xiu','xu','xuan','xue','xun',
  'ya','yan','yang','yao','ye','yi','yin','ying','yo','yong','you','yu','yuan','yue','yun',
  'za','zai','zan','zang','zao','ze','zei','zen','zeng','zha','zhai','zhan','zhang','zhao','zhe','zhei','zhen','zheng','zhi','zhong','zhou','zhu','zhua','zhuai','zhuan','zhuang','zhui','zhun','zhuo','zi','zong','zou','zu','zuan','zui','zun','zuo',
  'r','n',
]);

function segmentPlainPinyin(plain, idx = 0, memo = new Map()) {
  if (idx === plain.length) return [];
  if (memo.has(idx)) return memo.get(idx);
  for (let len = Math.min(6, plain.length - idx); len >= 1; len--) {
    const sub = plain.slice(idx, idx + len);
    if (VALID_SYLLABLES.has(sub)) {
      const rest = segmentPlainPinyin(plain, idx + len, memo);
      if (rest !== null) {
        const res = [sub, ...rest];
        memo.set(idx, res);
        return res;
      }
    }
  }
  memo.set(idx, null);
  return null;
}

function splitPinyinTones(pinyinStr, hanziCount) {
  const chunks = pinyinStr
    .toLowerCase()
    .split(/[\s'’·,，、/()（）-]+/)
    .filter(Boolean);
  const tones = [];
  for (const chunk of chunks) {
    const plainChars = [];
    const charTones = [];
    for (const ch of chunk) {
      if (STRIP_TONE[ch]) {
        plainChars.push(STRIP_TONE[ch]);
        charTones.push(TONE_VOWELS[ch] || 0);
      } else if (/[a-z]/.test(ch)) {
        plainChars.push(ch);
        charTones.push(0);
      }
    }
    const segs = segmentPlainPinyin(plainChars.join(''));
    if (!segs) return null;
    let offset = 0;
    for (const seg of segs) {
      let tone = 0;
      for (let k = offset; k < offset + seg.length; k++) {
        if (charTones[k]) tone = charTones[k];
      }
      tones.push(tone);
      offset += seg.length;
    }
  }
  return tones.length === hanziCount ? tones : null;
}

function formatHintText(char, jpChar, reading, rule, tone) {
  const label = jpChar ? `${char}（${jpChar}）` : char;
  switch (rule) {
    case 'jidaku_nissho':
      return `「${label}」は「${reading}」と読める入声（次濁）なので、第4声です。`;
    case 'zendaku_nissho':
      return `「${label}」は「${reading}」と読める入声（全濁）なので、第2声です。`;
    case 'seion_nissho':
      return `「${label}」は「${reading}」と読める入声（清音・第4声が最多）なので、第4声です。`;
    case 'zendaku_hi_nissho':
      return `「${label}」は「${reading}」と読める全濁音（非入声）なので、第2声・第4声に絞れます（第${tone}声）。`;
    case 'jidaku_hi_nissho':
      return `「${label}」は「${reading}」と読める次濁音（非入声）なので、第1声にはなりません（第${tone}声）。`;
  }
}

function analyzeCharHint(ch, tone) {
  if (tone < 1 || tone > 4) return null;
  const info = kanjiData[ch];
  if (!info || !Array.isArray(info.on) || info.on.length === 0) return null;

  const jpChar = info.jp;
  const isNissho = info.n === 1;
  // 単位由来の特殊な長音読み（りっとる、めえとる等）を除外
  const onList = info.on.filter(
    (k) => k.length <= 4 && !/(とる|らむ|んち|ぽんど)$/.test(k),
  );
  if (onList.length === 0) return null;

  if (isNissho) {
    if (tone === 2 && SPECIAL_ZENDAKU_NISSHO[ch]) {
      const reading = SPECIAL_ZENDAKU_NISSHO[ch];
      return {
        prio: 2,
        hint: {
          char: ch,
          ...(jpChar ? { jpChar } : {}),
          reading,
          rule: 'zendaku_nissho',
          tone,
          text: formatHintText(ch, jpChar, reading, 'zendaku_nissho', tone),
        },
      };
    }

    const nisshoReadings = onList.filter((k) => k.length >= 2 && NISSHO_END.test(k));
    if (nisshoReadings.length === 0) return null;

    if (tone === 4) {
      const jidaku = nisshoReadings.find((k) => JIDAKU_INIT.test(k));
      if (jidaku || GIBO_JIDAKU_NISSHO.has(ch)) {
        const reading = jidaku || nisshoReadings[0];
        return {
          prio: 1,
          hint: {
            char: ch,
            ...(jpChar ? { jpChar } : {}),
            reading,
            rule: 'jidaku_nissho',
            tone,
            text: formatHintText(ch, jpChar, reading, 'jidaku_nissho', tone),
          },
        };
      }
    }

    if (tone === 2) {
      const zendaku = nisshoReadings.find((k) => ZENDAKU_INIT.test(k));
      if (zendaku) {
        return {
          prio: 2,
          hint: {
            char: ch,
            ...(jpChar ? { jpChar } : {}),
            reading: zendaku,
            rule: 'zendaku_nissho',
            tone,
            text: formatHintText(ch, jpChar, zendaku, 'zendaku_nissho', tone),
          },
        };
      }
    }

    if (tone === 4) {
      const seion = nisshoReadings.find((k) => SEION_INIT.test(k));
      if (seion) {
        return {
          prio: 3,
          hint: {
            char: ch,
            ...(jpChar ? { jpChar } : {}),
            reading: seion,
            rule: 'seion_nissho',
            tone,
            text: formatHintText(ch, jpChar, seion, 'seion_nissho', tone),
          },
        };
      }
    }

    return null;
  }

  // 非入声（全濁音 → 第2・4声、次濁音 → 第2・3・4声）
  if (tone === 2 || tone === 4) {
    const zendaku = onList.find((k) => ZENDAKU_INIT.test(k));
    if (zendaku) {
      return {
        prio: 4,
        hint: {
          char: ch,
          ...(jpChar ? { jpChar } : {}),
          reading: zendaku,
          rule: 'zendaku_hi_nissho',
          tone,
          text: formatHintText(ch, jpChar, zendaku, 'zendaku_hi_nissho', tone),
        },
      };
    }
  }

  if (tone === 2 || tone === 3 || tone === 4) {
    const jidaku = onList.find((k) => JIDAKU_INIT.test(k));
    if (jidaku) {
      return {
        prio: 5,
        hint: {
          char: ch,
          ...(jpChar ? { jpChar } : {}),
          reading: jidaku,
          rule: 'jidaku_hi_nissho',
          tone,
          text: formatHintText(ch, jpChar, jidaku, 'jidaku_hi_nissho', tone),
        },
      };
    }
  }

  return null;
}

function buildWordToneHints(hanzi, pinyin) {
  const chars = Array.from(hanzi).filter((c) => /[\u4e00-\u9fff]/.test(c));
  if (chars.length === 0) return [];
  const tones = splitPinyinTones(pinyin, chars.length);
  if (!tones) return [];

  const matched = [];
  const seen = new Set();
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (seen.has(ch)) continue;
    const res = analyzeCharHint(ch, tones[i]);
    if (res) {
      seen.add(ch);
      matched.push(res);
    }
  }

  matched.sort((a, b) => a.prio - b.prio);
  // 入声の法則が当てはまる漢字があれば最大2件まで優先表示、それ以外は最大2件
  return matched.slice(0, 2).map((m) => m.hint);
}

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
let wordsWithHints = 0;
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

    const toneHints = buildWordToneHints(hanzi, pinyin);
    if (toneHints.length > 0) wordsWithHints++;

    words.push({
      id: `hsk${level}_${number}`,
      level,
      number,
      hanzi,
      pinyin,
      meaning,
      ...(toneHints.length > 0 ? { toneHints } : {}),
    });
  }

  const outPath = path.join(OUT_DIR, `hsk${level}.json`);
  fs.writeFileSync(outPath, JSON.stringify(words), 'utf-8');
  totalWords += words.length;
  summary.push({ level, count: words.length });
}

console.log(
  'Vocabulary conversion complete:',
  summary,
  'Total:',
  totalWords,
  'With toneHints:',
  wordsWithHints,
);

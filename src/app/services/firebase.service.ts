import { Injectable, signal } from '@angular/core';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import {
  Firestore,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { environment } from '../../environments/environment';
import {
  DailyStatSnapshot,
  HskLevel,
  StudyMode,
  WordProgress,
} from '../models/vocab.model';
import { normalizeScore } from './srs.service';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly db: Firestore;

  readonly user = signal<User | null>(null);
  readonly authReady = signal(false);

  private readonly progressCache = new Map<string, Map<string, WordProgress>>();
  private readonly bookmarkCache = new Map<string, Set<string>>();

  constructor() {
    this.app = getApps().length ? getApps()[0] : initializeApp(environment.firebase);
    this.auth = getAuth(this.app);

    this.db = initializeFirestore(this.app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });

    getRedirectResult(this.auth).catch(() => {
      // リダイレクト結果がない場合は無視
    });

    onAuthStateChanged(this.auth, (u) => {
      if (!u) {
        this.progressCache.clear();
        this.bookmarkCache.clear();
      }
      this.user.set(u);
      this.authReady.set(true);
    });
  }

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(this.auth, provider);
      this.progressCache.clear();
      this.bookmarkCache.clear();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        await signInWithRedirect(this.auth, provider);
        return;
      }
      throw err;
    }
  }

  async logout(): Promise<void> {
    this.progressCache.clear();
    this.bookmarkCache.clear();
    await signOut(this.auth);
  }

  private cacheKey(mode: StudyMode, level: HskLevel): string {
    return `${mode}_${level}`;
  }

  private guestStorageKey(mode: StudyMode, level: HskLevel): string {
    return `hsk_guest_progress_v1_${mode}_${level}`;
  }

  private guestStatsStorageKey(mode: StudyMode, level: HskLevel): string {
    return `hsk_guest_daily_stats_v1_${mode}_${level}`;
  }

  private guestBookmarksStorageKey(mode: StudyMode, level: HskLevel): string {
    return `hsk_guest_bookmarks_v1_${mode}_${level}`;
  }

  private todayDateKey(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private docId(mode: StudyMode, wordId: string): string {
    return `${mode}_${wordId}`;
  }

  private readGuestMap(mode: StudyMode, level: HskLevel): Map<string, WordProgress> {
    const map = new Map<string, WordProgress>();
    if (typeof localStorage === 'undefined') return map;
    try {
      const raw = localStorage.getItem(this.guestStorageKey(mode, level));
      if (!raw) return map;
      const obj = JSON.parse(raw) as Record<string, WordProgress>;
      for (const [k, v] of Object.entries(obj)) {
        map.set(k, v);
      }
    } catch {
      // 破損データ時は空として扱う
    }
    return map;
  }

  private writeGuestMap(
    mode: StudyMode,
    level: HskLevel,
    map: Map<string, WordProgress>,
  ): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const obj = Object.fromEntries(map.entries());
      localStorage.setItem(this.guestStorageKey(mode, level), JSON.stringify(obj));
    } catch {
      // ストレージ容量超過時などは無視
    }
  }

  /**
   * 指定モード・級の学習進捗を取得。
   * ログイン時は Firestore、未ログイン（ゲスト）時は localStorage から読み込む。
   */
  async loadLevelProgress(
    mode: StudyMode,
    level: HskLevel,
    forceRefresh = false,
  ): Promise<Map<string, WordProgress>> {
    // 認証初期化完了を軽く待機（初回ロード時のチラつき防止）
    while (!this.authReady()) {
      await new Promise((r) => setTimeout(r, 20));
    }

    const u = this.user();
    const key = this.cacheKey(mode, level);

    if (!u) {
      const guestMap = this.readGuestMap(mode, level);
      this.progressCache.set(key, guestMap);
      return guestMap;
    }

    if (!forceRefresh && this.progressCache.has(key)) {
      return this.progressCache.get(key)!;
    }

    const colRef = collection(this.db, 'users', u.uid, 'progress');
    const q = query(
      colRef,
      where('mode', '==', mode),
      where('level', '==', level),
    );
    const snap = await getDocs(q);

    const map = new Map<string, WordProgress>();
    snap.forEach((d) => {
      const data = d.data() as WordProgress;
      map.set(data.wordId, data);
    });

    this.progressCache.set(key, map);
    return map;
  }

  /**
   * 学習進捗を保存する（ログイン時は Firestore、ゲスト時は localStorage）。
   */
  async saveProgress(progress: WordProgress): Promise<void> {
    const key = this.cacheKey(progress.mode, progress.level);
    let cached = this.progressCache.get(key);
    if (!cached) {
      cached = new Map<string, WordProgress>();
      this.progressCache.set(key, cached);
    }
    cached.set(progress.wordId, progress);

    const u = this.user();
    if (!u) {
      this.writeGuestMap(progress.mode, progress.level, cached);
      await this.recordDailySnapshot(progress.mode, progress.level, cached);
      return;
    }

    const ref = doc(
      this.db,
      'users',
      u.uid,
      'progress',
      this.docId(progress.mode, progress.wordId),
    );
    await setDoc(ref, progress);
    await this.recordDailySnapshot(progress.mode, progress.level, cached);
  }

  /**
   * アーカイブ済み等の単語進捗をリセット（削除して未学習に戻す）
   */
  async resetWordProgress(
    mode: StudyMode,
    level: HskLevel,
    wordId: string,
  ): Promise<void> {
    const key = this.cacheKey(mode, level);
    const cached = this.progressCache.get(key);
    if (cached) {
      cached.delete(wordId);
    }

    const u = this.user();
    if (!u) {
      if (cached) {
        this.writeGuestMap(mode, level, cached);
        await this.recordDailySnapshot(mode, level, cached);
      }
      return;
    }

    const ref = doc(
      this.db,
      'users',
      u.uid,
      'progress',
      this.docId(mode, wordId),
    );
    await deleteDoc(ref);
    if (cached) {
      await this.recordDailySnapshot(mode, level, cached);
    }
  }

  /**
   * 当日の累積ステータス内訳をスナップショット保存する（学習した日のみ記録）
   */
  private async recordDailySnapshot(
    mode: StudyMode,
    level: HskLevel,
    progressMap: Map<string, WordProgress>,
  ): Promise<void> {
    let madamada = 0;
    let nantonaku = 0;
    let oboeta = 0;
    let daijobu = 0;

    for (const prog of progressMap.values()) {
      if (prog.status === 'archived') {
        daijobu++;
      } else {
        const norm = normalizeScore(prog.lastResult);
        if (norm === 'madamada') madamada++;
        else if (norm === 'nantonaku') nantonaku++;
        else if (norm === 'oboeta') oboeta++;
      }
    }

    const dateKey = this.todayDateKey();
    const entry = { madamada, nantonaku, oboeta, daijobu };

    const u = this.user();
    if (!u) {
      if (typeof localStorage === 'undefined') return;
      try {
        const raw = localStorage.getItem(this.guestStatsStorageKey(mode, level));
        const days: Record<string, Omit<DailyStatSnapshot, 'date'>> = raw
          ? JSON.parse(raw)
          : {};
        days[dateKey] = entry;
        localStorage.setItem(
          this.guestStatsStorageKey(mode, level),
          JSON.stringify(days),
        );
      } catch {
        // ignore storage errors
      }
      return;
    }

    const ref = doc(this.db, 'users', u.uid, 'dailyStats', `${mode}_${level}`);
    await setDoc(ref, { days: { [dateKey]: entry } }, { merge: true });
  }

  /**
   * 学習した日の日次累積統計を日付昇順で取得する（未学習日は含まれない）
   */
  async loadDailyStats(
    mode: StudyMode,
    level: HskLevel,
  ): Promise<DailyStatSnapshot[]> {
    while (!this.authReady()) {
      await new Promise((r) => setTimeout(r, 20));
    }

    const u = this.user();
    let days: Record<string, Omit<DailyStatSnapshot, 'date'>> = {};

    if (!u) {
      if (typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem(this.guestStatsStorageKey(mode, level));
          if (raw) days = JSON.parse(raw);
        } catch {
          days = {};
        }
      }
    } else {
      const ref = doc(this.db, 'users', u.uid, 'dailyStats', `${mode}_${level}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as {
          days?: Record<string, Omit<DailyStatSnapshot, 'date'>>;
        };
        days = data.days ?? {};
      }
    }

    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({
        date,
        madamada: val.madamada ?? 0,
        nantonaku: val.nantonaku ?? 0,
        oboeta: val.oboeta ?? 0,
        daijobu: val.daijobu ?? 0,
      }));
  }

  /**
   * 指定モード・級のブックマーク済み wordId セットを取得する
   */
  async loadBookmarks(mode: StudyMode, level: HskLevel): Promise<Set<string>> {
    while (!this.authReady()) {
      await new Promise((r) => setTimeout(r, 20));
    }

    const key = this.cacheKey(mode, level);
    const cached = this.bookmarkCache.get(key);
    if (cached) return cached;

    const u = this.user();
    let ids: string[] = [];

    if (!u) {
      if (typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem(
            this.guestBookmarksStorageKey(mode, level),
          );
          if (raw) ids = JSON.parse(raw) as string[];
        } catch {
          ids = [];
        }
      }
    } else {
      const ref = doc(this.db, 'users', u.uid, 'bookmarks', `${mode}_${level}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as { wordIds?: string[] };
        ids = data.wordIds ?? [];
      }
    }

    const set = new Set(ids);
    this.bookmarkCache.set(key, set);
    return set;
  }

  /**
   * ブックマークの ON / OFF を保存する（モード・級ごとに独立管理）
   */
  async setBookmark(
    mode: StudyMode,
    level: HskLevel,
    wordId: string,
    bookmarked: boolean,
  ): Promise<Set<string>> {
    const key = this.cacheKey(mode, level);
    const set = new Set(await this.loadBookmarks(mode, level));
    if (bookmarked) {
      set.add(wordId);
    } else {
      set.delete(wordId);
    }
    this.bookmarkCache.set(key, set);

    const arr = Array.from(set);
    const u = this.user();
    if (!u) {
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(
            this.guestBookmarksStorageKey(mode, level),
            JSON.stringify(arr),
          );
        } catch {
          // ignore
        }
      }
      return set;
    }

    const ref = doc(this.db, 'users', u.uid, 'bookmarks', `${mode}_${level}`);
    await setDoc(ref, { wordIds: arr });
    return set;
  }
}

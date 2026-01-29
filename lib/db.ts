import Dexie, { type Table } from 'dexie';

export interface NovelEntry {
  id?: number;
  content: string;
  wordCount: number;
  currentStep: number;
  analysis: string;
  outline: string;
  outlineDirection: string;
  breakdown: string;
  chapters: string[];
  updatedAt: number;
}

export interface SettingsEntry {
  id?: string; // 'global'
  apiKey: string;
  selectedModel: string;
  recentModels: string[];
  customPrompts: Record<string, string>;
  updatedAt: number;
}

export class NovelDatabase extends Dexie {
  novels!: Table<NovelEntry>;
  settings!: Table<SettingsEntry>;

  constructor() {
    super('NovelContinuationDB');
    this.version(1).stores({
      novels: '++id, updatedAt'
    });
    // Version 2 adds settings
    this.version(2).stores({
      settings: 'id, updatedAt'
    });
  }
}

export const db = new NovelDatabase();

export async function saveNovel(entry: Omit<NovelEntry, 'updatedAt'>, forceNew = false) {
  const updatedAt = Date.now();
  const latest = await db.novels.toCollection().last();
  if (latest && latest.id && !forceNew) {
    return await db.novels.update(latest.id, { ...entry, updatedAt });
  } else {
    return await db.novels.add({ ...entry, updatedAt });
  }
}

export async function getLatestNovel(): Promise<NovelEntry | undefined> {
  return await db.novels.toCollection().last();
}

export async function getNovelHistory(): Promise<NovelEntry[]> {
  return await db.novels.orderBy('updatedAt').reverse().toArray();
}

export async function saveSettings(settings: Omit<SettingsEntry, 'id' | 'updatedAt'>) {
  const updatedAt = Date.now();
  return await db.settings.put({ ...settings, id: 'global', updatedAt });
}

export async function getSettings(): Promise<SettingsEntry | undefined> {
  return await db.settings.get('global');
}
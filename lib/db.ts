import Dexie, { type Table } from 'dexie';

export interface NovelEntry {
  id?: number;
  content: string;
  wordCount: number;
  currentStep: number;
  analysis: string;
  outline: string;
  outlineDirection: string;
  chapters: string[];
  updatedAt: number;
}

export class NovelDatabase extends Dexie {
  novels!: Table<NovelEntry>;

  constructor() {
    super('NovelContinuationDB');
    this.version(1).stores({
      novels: '++id, updatedAt' // id is primary key, updatedAt is indexed
    });
  }
}

export const db = new NovelDatabase();

export async function saveNovel(entry: Omit<NovelEntry, 'updatedAt'>) {
  const updatedAt = Date.now();
  // We only keep one main novel state for now (or a list if needed)
  // For this app, we'll use a single entry or identified by a specific key if multi-novel
  // Let's assume a singleton novel for the simple workflow
  const latest = await db.novels.toCollection().last();
  if (latest && latest.id) {
    return await db.novels.update(latest.id, { ...entry, updatedAt });
  } else {
    return await db.novels.add({ ...entry, updatedAt });
  }
}

export async function getLatestNovel(): Promise<NovelEntry | undefined> {
  return await db.novels.toCollection().last();
}

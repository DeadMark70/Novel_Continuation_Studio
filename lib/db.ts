import Dexie, { type Table } from 'dexie';

export interface NovelEntry {
  id?: number;
  sessionId: string; // Unique session identifier
  sessionName?: string; // User-friendly name (auto-generated or custom)
  content: string;
  wordCount: number;
  currentStep: number;
  analysis: string;
  outline: string;
  outlineDirection: string;
  breakdown: string;
  chapters: string[];
  targetStoryWordCount?: number;
  targetChapterCount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface SettingsEntry {
  id?: string; // 'global'
  apiKey: string;
  selectedModel: string;
  recentModels: string[];
  customPrompts: Record<string, string>;
  truncationThreshold?: number;
  dualEndBuffer?: number;
  thinkingEnabled?: boolean;
  modelCapabilities?: Record<string, {
    chatSupported: boolean;
    thinkingSupported: 'supported' | 'unsupported' | 'unknown';
    reason?: string;
    checkedAt: number;
    source: 'probe' | 'override';
  }>;
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
    this.version(2).stores({
      settings: 'id, updatedAt'
    });
    // Version 3: Add sessionId for session-based history
    this.version(3).stores({
      novels: '++id, sessionId, updatedAt, createdAt',
      settings: 'id, updatedAt'
    });
    this.version(4).stores({
      novels: '++id, sessionId, updatedAt, createdAt',
      settings: 'id, updatedAt'
    }).upgrade(async (tx) => {
      await tx.table('novels').toCollection().modify((entry: NovelEntry) => {
        if (entry.targetStoryWordCount === undefined) {
          entry.targetStoryWordCount = 20000;
        }
        if (entry.targetChapterCount === undefined) {
          entry.targetChapterCount = 5;
        }
      });

      await tx.table('settings').toCollection().modify((entry: SettingsEntry) => {
        if (entry.thinkingEnabled === undefined) {
          entry.thinkingEnabled = false;
        }
        if (!entry.modelCapabilities) {
          entry.modelCapabilities = {};
        }
      });
    });
  }
}

export const db = new NovelDatabase();

/**
 * Save or update a novel entry within a session.
 * If sessionId exists, update that session. Otherwise create new.
 */
export async function saveNovel(entry: Omit<NovelEntry, 'id' | 'updatedAt' | 'createdAt'>) {
  const now = Date.now();
  const normalizedEntry: Omit<NovelEntry, 'id' | 'updatedAt' | 'createdAt'> = {
    ...entry,
    targetStoryWordCount: entry.targetStoryWordCount ?? 20000,
    targetChapterCount: entry.targetChapterCount ?? 5,
  };
  
  // Check if this session already exists
  const existing = await db.novels.where('sessionId').equals(entry.sessionId).first();
  
  if (existing && existing.id) {
    // Update existing session
    return await db.novels.update(existing.id, { 
      ...normalizedEntry,
      updatedAt: now,
      createdAt: existing.createdAt // Keep original creation time
    });
  } else {
    // Create new session
    return await db.novels.add({ 
      ...normalizedEntry, 
      createdAt: now,
      updatedAt: now 
    });
  }
}

/**
 * Get the most recently updated novel entry
 */
export async function getLatestNovel(): Promise<NovelEntry | undefined> {
  return await db.novels.orderBy('updatedAt').last();
}

/**
 * Get all unique sessions (one entry per session, most recent state)
 * Filters out legacy records without sessionId
 */
export async function getAllSessions(): Promise<NovelEntry[]> {
  const all = await db.novels.orderBy('updatedAt').reverse().toArray();
  // Filter out legacy entries without sessionId
  return all.filter(entry => entry.sessionId && typeof entry.sessionId === 'string');
}

/**
 * Get a specific session by sessionId
 */
export async function getSession(sessionId: string): Promise<NovelEntry | undefined> {
  if (!sessionId || typeof sessionId !== 'string') {
    console.warn('[DB] Invalid sessionId provided:', sessionId);
    return undefined;
  }
  return await db.novels.where('sessionId').equals(sessionId).first();
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await db.novels.where('sessionId').equals(sessionId).delete();
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Legacy function for backwards compatibility (returns same as getAllSessions)
export async function getNovelHistory(): Promise<NovelEntry[]> {
  return getAllSessions();
}

export async function saveSettings(settings: Omit<SettingsEntry, 'id' | 'updatedAt'>) {
  const updatedAt = Date.now();
  return await db.settings.put({ ...settings, id: 'global', updatedAt });
}

export async function getSettings(): Promise<SettingsEntry | undefined> {
  return await db.settings.get('global');
}

import 'fake-indexeddb/auto';
import { db, saveNovel, getLatestNovel } from '../lib/db';
import Dexie from 'dexie';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

// Ensure Dexie uses the mocked IndexedDB
Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

describe('NovelDatabase', () => {
  beforeEach(async () => {
    // We might need to recreate or reset the DB instance if it failed to open
    await db.novels.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  it('should save and retrieve a novel', async () => {
    await saveNovel({
      content: 'Test content',
      wordCount: 12,
      currentStep: 1,
      analysis: '',
      outline: '',
      outlineDirection: '',
      chapters: []
    });

    const latest = await getLatestNovel();
    expect(latest?.content).toBe('Test content');
    expect(latest?.wordCount).toBe(12);
  });

  it('should update the existing novel entry', async () => {
    await saveNovel({
      content: 'Initial',
      wordCount: 7,
      currentStep: 1,
      analysis: '',
      outline: '',
      outlineDirection: '',
      chapters: []
    });

    await saveNovel({
      content: 'Updated',
      wordCount: 7,
      currentStep: 2,
      analysis: 'Some analysis',
      outline: '',
      outlineDirection: '',
      chapters: []
    });

    const count = await db.novels.count();
    expect(count).toBe(1);

    const latest = await getLatestNovel();
    expect(latest?.content).toBe('Updated');
    expect(latest?.currentStep).toBe(2);
    expect(latest?.analysis).toBe('Some analysis');
  });
});
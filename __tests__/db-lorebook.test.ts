import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db } from '@/lib/db';
import 'fake-indexeddb/auto';
import { LoreCard } from '@/lib/lorebook-types';

describe('NovelDB Lorebook CRUD', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.open();
    // For V11 schema, standard tables + lorebook
    await db.tables.forEach(table => table.clear());
  });

  afterEach(async () => {
    await db.close();
  });

  it('should create and retrieve a LoreCard successfully', async () => {
    const newCard: LoreCard = {
      id: 'test-card-1',
      novelId: 'novel-id-1',
      type: 'character',
      name: 'Test Character',
      coreData: {
        description: 'Desc',
        personality: 'Trait',
        scenario: 'Scene',
        first_mes: 'Hello',
        mes_example: 'Ex'
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Assuming we added 'lorebook' to the Dexie store
    await db.lorebook.add(newCard);

    const retrievedCard = await db.lorebook.get('test-card-1');
    expect(retrievedCard).toBeDefined();
    expect(retrievedCard?.name).toBe('Test Character');
    expect(retrievedCard?.novelId).toBe('novel-id-1');
  });

  it('should update an existing LoreCard', async () => {
    const newCard: LoreCard = {
      id: 'test-card-2',
      novelId: 'novel-id-1',
      type: 'world',
      name: 'Old World',
      coreData: {
        description: 'Old Desc',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: ''
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.lorebook.add(newCard);
    
    await db.lorebook.update('test-card-2', { name: 'New World' });
    
    const updatedCard = await db.lorebook.get('test-card-2');
    expect(updatedCard?.name).toBe('New World');
  });

  it('should delete a LoreCard', async () => {
    const newCard: LoreCard = {
      id: 'test-card-3',
      novelId: 'novel-id-1',
      type: 'character',
      name: 'Delete Me',
      coreData: { description: '', personality: '', scenario: '', first_mes: '', mes_example: '' },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.lorebook.add(newCard);
    await db.lorebook.delete('test-card-3');
    
    const retrievedCard = await db.lorebook.get('test-card-3');
    expect(retrievedCard).toBeUndefined();
  });

  it('should bulk find cards by novelId', async () => {
    const card1: LoreCard = {
      id: 'c1', novelId: 'novel-A', type: 'character', name: 'Char A',
      coreData: { description: '', personality: '', scenario: '', first_mes: '', mes_example: '' },
      createdAt: Date.now(), updatedAt: Date.now()
    };
    const card2: LoreCard = {
      id: 'c2', novelId: 'novel-A', type: 'world', name: 'World A',
      coreData: { description: '', personality: '', scenario: '', first_mes: '', mes_example: '' },
      createdAt: Date.now(), updatedAt: Date.now()
    };
    const card3: LoreCard = {
      id: 'c3', novelId: 'novel-B', type: 'character', name: 'Char B',
      coreData: { description: '', personality: '', scenario: '', first_mes: '', mes_example: '' },
      createdAt: Date.now(), updatedAt: Date.now()
    };

    await db.lorebook.bulkAdd([card1, card2, card3]);

    const itemsForNovelA = await db.lorebook.where('novelId').equals('novel-A').toArray();
    expect(itemsForNovelA).toHaveLength(2);
    expect(itemsForNovelA.map(c => c.name)).toContain('Char A');
    expect(itemsForNovelA.map(c => c.name)).toContain('World A');
  });
});

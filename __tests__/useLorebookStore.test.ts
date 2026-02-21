import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLorebookStore } from '@/store/useLorebookStore';
import { db } from '@/lib/db';
import { LoreCard } from '@/lib/lorebook-types';

// Mock the dexie db
vi.mock('../lib/db', () => ({
  db: {
    lorebook: {
      where: vi.fn(),
      add: vi.fn(),
      bulkAdd: vi.fn(),
      put: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}));

describe('useLorebookStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const store = useLorebookStore.getState();
    store.clearStore(); // custom action we will need to reset state between tests
  });

  it('should start with an empty array of cards and not loading', () => {
    const state = useLorebookStore.getState();
    expect(state.cards).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should load cards from dexie for a given novelId', async () => {
    const mockCards: LoreCard[] = [{
      id: '123', novelId: 'novel-1', type: 'character', name: 'Test', coreData: { description: '', personality: '', scenario: '', first_mes: '', mes_example: '' }, createdAt: 0, updatedAt: 0
    }];

    const toArrayMock = vi.fn().mockResolvedValue(mockCards);
    (db.lorebook.where as any).mockReturnValue({ equals: () => ({ toArray: toArrayMock }) });

    await useLorebookStore.getState().loadCards('novel-1');

    const state = useLorebookStore.getState();
    expect(state.cards).toEqual(mockCards);
    expect(state.isLoading).toBe(false);
  });

  it('should add a new card to dexie and state', async () => {
    const newCardData = {
      novelId: 'novel-1', type: 'character' as const, name: 'New Character',
      coreData: { description: 'Desc', personality: 'Pers', scenario: '', first_mes: '', mes_example: '' }
    };

    (db.lorebook.add as any).mockResolvedValue('new-id');

    await useLorebookStore.getState().addCard(newCardData);

    const state = useLorebookStore.getState();
    expect(state.cards.length).toBe(1);
    expect(state.cards[0].name).toBe('New Character');
    expect(db.lorebook.add).toHaveBeenCalled();
  });

  it('should update an existing card in dexie and state', async () => {
    const initialCard: LoreCard = {
      id: '123', novelId: 'novel-1', type: 'character', name: 'Old', coreData: { description: '', personality: '', scenario: '', first_mes: '', mes_example: '' }, createdAt: 0, updatedAt: 0
    };
    
    // Set initial state manually
    useLorebookStore.setState({ cards: [initialCard] });

    (db.lorebook.update as any).mockResolvedValue(1); // update usually returns count

    await useLorebookStore.getState().updateCard('123', { name: 'Updated' });

    const state = useLorebookStore.getState();
    expect(state.cards[0].name).toBe('Updated');
    expect(db.lorebook.update).toHaveBeenCalled();
  });

  it('should add multiple new cards to dexie and state in one call', async () => {
    const cardsData = [
      {
        novelId: 'novel-1',
        type: 'character' as const,
        name: 'Alpha',
        coreData: { description: 'A', personality: '', scenario: '', first_mes: '', mes_example: '' }
      },
      {
        novelId: 'novel-1',
        type: 'character' as const,
        name: 'Beta',
        coreData: { description: 'B', personality: '', scenario: '', first_mes: '', mes_example: '' }
      }
    ];

    (db.lorebook.bulkAdd as any).mockResolvedValue(undefined);

    const ids = await useLorebookStore.getState().addCards(cardsData);

    const state = useLorebookStore.getState();
    expect(ids).toHaveLength(2);
    expect(state.cards).toHaveLength(2);
    expect(state.cards.map(card => card.name)).toEqual(['Alpha', 'Beta']);
    expect(db.lorebook.bulkAdd).toHaveBeenCalledTimes(1);
  });

  it('should delete a card from dexie and state', async () => {
    const initialCard: LoreCard = {
      id: '123', novelId: 'novel-1', type: 'character', name: 'Old', coreData: { description: '', personality: '', scenario: '', first_mes: '', mes_example: '' }, createdAt: 0, updatedAt: 0
    };
    
    // Set initial state manually
    useLorebookStore.setState({ cards: [initialCard] });

    (db.lorebook.delete as any).mockResolvedValue(undefined);

    await useLorebookStore.getState().deleteCard('123');

    const state = useLorebookStore.getState();
    expect(state.cards.length).toBe(0);
    expect(db.lorebook.delete).toHaveBeenCalledWith('123');
  });
});

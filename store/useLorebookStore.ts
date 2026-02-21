import { create } from 'zustand';
import { db } from '../lib/db';
import { GLOBAL_LOREBOOK_NOVEL_ID, LoreCard } from '../lib/lorebook-types';
import { v4 as uuidv4 } from 'uuid';

interface LorebookState {
  cards: LoreCard[];
  isLoading: boolean;
  error: string | null;
  loadCards: () => Promise<void>;
  addCard: (cardData: Omit<LoreCard, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  addCards: (cardDataList: Array<Omit<LoreCard, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<string[]>;
  updateCard: (id: string, updates: Partial<Omit<LoreCard, 'id' | 'novelId' | 'createdAt'>>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  clearStore: () => void;
}

export const useLorebookStore = create<LorebookState>((set, get) => ({
  cards: [],
  isLoading: false,
  error: null,

  loadCards: async () => {
    set({ isLoading: true, error: null });
    try {
      const loadedCards = await db.lorebook.toArray();
      set({ cards: loadedCards, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load lorebook cards.', isLoading: false });
      console.error(err);
    }
  },

  addCard: async (cardData) => {
    set({ isLoading: true, error: null });
    try {
      const now = Date.now();
      const newCard: LoreCard = {
        ...cardData,
        novelId: GLOBAL_LOREBOOK_NOVEL_ID,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      };

      await db.lorebook.add(newCard);
      
      const currentCards = get().cards;
      set({ cards: [...currentCards, newCard], isLoading: false });
      return newCard.id;
    } catch (err: any) {
      set({ error: err.message || 'Failed to add lore card.', isLoading: false });
      console.error(err);
      throw err;
    }
  },

  addCards: async (cardDataList) => {
    set({ isLoading: true, error: null });
    try {
      if (cardDataList.length === 0) {
        set({ isLoading: false });
        return [];
      }

      const now = Date.now();
      const newCards: LoreCard[] = cardDataList.map((cardData, index) => ({
        ...cardData,
        novelId: GLOBAL_LOREBOOK_NOVEL_ID,
        id: uuidv4(),
        createdAt: now + index,
        updatedAt: now + index,
      }));

      await db.lorebook.bulkAdd(newCards);

      const currentCards = get().cards;
      set({ cards: [...currentCards, ...newCards], isLoading: false });
      return newCards.map((card) => card.id);
    } catch (err: any) {
      set({ error: err.message || 'Failed to add lore cards.', isLoading: false });
      console.error(err);
      throw err;
    }
  },

  updateCard: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const now = Date.now();
      
      const updateData = {
        ...updates,
        updatedAt: now
      };
      
      await db.lorebook.update(id, updateData);

      const currentCards = get().cards;
      const updatedCards = currentCards.map(c => 
        c.id === id ? { ...c, ...updateData } : c
      );
      
      set({ cards: updatedCards, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to update lore card.', isLoading: false });
      console.error(err);
      throw err;
    }
  },

  deleteCard: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await db.lorebook.delete(id);
      
      const currentCards = get().cards;
      set({ cards: currentCards.filter(c => c.id !== id), isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete lore card.', isLoading: false });
      console.error(err);
      throw err;
    }
  },

  clearStore: () => {
    set({ cards: [], isLoading: false, error: null });
  }
}));

import { useNovelStore } from '../store/useNovelStore';
import { act } from '@testing-library/react';
import { db } from '../lib/db';

describe('useNovelStore Integration', () => {
  beforeEach(async () => {
    if (!db.isOpen()) {
      await db.open();
    }
    await db.novels.clear();
    act(() => {
      useNovelStore.setState({
        originalNovel: '',
        wordCount: 0,
        currentStep: 1,
        analysis: '',
        outline: '',
        outlineDirection: '',
        chapters: [],
      });
    });
  });

  afterAll(async () => {
    await db.close();
  });

  it('should save to database when setting novel', async () => {
    await act(async () => {
      await useNovelStore.getState().setNovel('Integration Test');
    });
    
    const count = await db.novels.count();
    expect(count).toBe(1);
    
    const latest = await db.novels.toCollection().last();
    expect(latest?.content).toBe('Integration Test');
  });

  it('should initialize state from database', async () => {
    // Manually put something in DB
    await db.novels.add({
      content: 'Stored Novel',
      wordCount: 12,
      currentStep: 2,
      analysis: '',
      outline: '',
      outlineDirection: '',
      chapters: [],
      updatedAt: Date.now()
    });

    await act(async () => {
      await useNovelStore.getState().initialize();
    });

    const state = useNovelStore.getState();
    expect(state.originalNovel).toBe('Stored Novel');
    expect(state.currentStep).toBe(2);
  });
});

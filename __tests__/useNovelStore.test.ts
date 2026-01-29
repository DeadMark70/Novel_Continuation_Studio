import { useNovelStore } from '../store/useNovelStore';
import { act } from '@testing-library/react';
import { db, saveNovel } from '../lib/db';

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
        history: [],
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

  it('should load history from database', async () => {
    await saveNovel({
      content: 'V1',
      wordCount: 2,
      currentStep: 1,
      analysis: '',
      outline: '',
      outlineDirection: '',
      chapters: []
    }, true);

    await saveNovel({
      content: 'V2',
      wordCount: 2,
      currentStep: 1,
      analysis: '',
      outline: '',
      outlineDirection: '',
      chapters: []
    }, true);

    await act(async () => {
      await useNovelStore.getState().loadHistory();
    });

    const state = useNovelStore.getState();
    expect(state.history.length).toBe(2);
    expect(state.history[0].content).toBe('V2');
  });

  it('should rollback to a version after saving current state', async () => {
    // 1. Setup initial state and save it
    await act(async () => {
      await useNovelStore.getState().setNovel('V1');
    });

    // 2. Save V1 as a fixed version and then move to V2
    await act(async () => {
      await useNovelStore.getState().persist(true); // Now we have two entries, both V1 for now
      await useNovelStore.getState().setNovel('V2'); // Updates the latest entry to V2
    });

    const allVersions = await db.novels.orderBy('updatedAt').toArray();
    const v1 = allVersions[0]; // The first one we saved
    expect(v1.content).toBe('V1');

    // 3. Rollback to V1
    await act(async () => {
      await useNovelStore.getState().rollbackToVersion(v1);
    });

    // 4. Verify current state is V1
    expect(useNovelStore.getState().originalNovel).toBe('V1');

    // 5. Verify current state is V1 and previous is V2
    const count = await db.novels.count();
    expect(count).toBe(3); 
    
    const all = await db.novels.orderBy('updatedAt').reverse().toArray();
    expect(all[0].content).toBe('V1'); // current (rolled back)
    expect(all[1].content).toBe('V2'); // saved before rollback
    expect(all[2].content).toBe('V1'); // original version 1
  });
});

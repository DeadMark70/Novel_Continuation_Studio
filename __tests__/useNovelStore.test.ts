import { useNovelStore } from '../store/useNovelStore';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { act } from '@testing-library/react';
import { db, saveNovel, generateSessionId } from '../lib/db';

describe('useNovelStore Integration', () => {
  beforeEach(async () => {
    if (!db.isOpen()) {
      await db.open();
    }
    await db.novels.clear();
    act(() => {
        // Reset store state
        useNovelStore.getState().startNewSession();
        useWorkflowStore.getState().resetAllSteps();
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
    expect(latest?.sessionId).toBeDefined();
  });

  it('should normalize novel content when setting', async () => {
    const rawContent = '  Line 1  \n\n\n\n你好！  ';
    const expectedContent = 'Line 1\n\n你好!';
    
    await act(async () => {
      await useNovelStore.getState().setNovel(rawContent);
    });
    
    expect(useNovelStore.getState().originalNovel).toBe(expectedContent);
    
    const latest = await db.novels.toCollection().last();
    expect(latest?.content).toBe(expectedContent);
  });

  it('should load sessions from database', async () => {
    const session1 = generateSessionId();
    await saveNovel({
      sessionId: session1,
      content: 'V1',
      wordCount: 2,
      currentStep: 1,
      analysis: '',
      outline: '',
      outlineDirection: '',
      breakdown: '',
      chapters: [],
      targetStoryWordCount: 20000,
      targetChapterCount: 5
    });

    // Delay to ensure timestamp difference
    await new Promise(r => setTimeout(r, 10));

    const session2 = generateSessionId();
    await saveNovel({
      sessionId: session2,
      content: 'V2',
      wordCount: 2,
      currentStep: 1,
      analysis: '',
      outline: '',
      outlineDirection: '',
      breakdown: '',
      chapters: [],
      targetStoryWordCount: 25000,
      targetChapterCount: 6
    });

    await act(async () => {
      await useNovelStore.getState().loadSessions();
    });

    const state = useNovelStore.getState();
    expect(state.sessions.length).toBe(2);
    // ordered by updatedAt desc
    expect(state.sessions[0].content).toBe('V2');
  });

  it('should switch sessions', async () => {
    // 1. Create Session A in DB
    const sessionA = generateSessionId();
    await saveNovel({
        sessionId: sessionA,
        content: 'Content A',
        wordCount: 10,
        currentStep: 1,
        analysis: 'Analysis A',
        outline: '',
        outlineDirection: '',
        breakdown: '',
        chapters: [],
        targetStoryWordCount: 18000,
        targetChapterCount: 4
    });

    // 2. Start new session (B) in Store
    act(() => {
        useNovelStore.getState().startNewSession();
    });
    // Need to set content to trigger persist or manually call persist? 
    // setNovel calls persist.
    await act(async () => {
        await useNovelStore.getState().setNovel('Content B');
    });

    expect(useNovelStore.getState().originalNovel).toBe('Content B');

    // 3. Load Session A
    await act(async () => {
        await useNovelStore.getState().loadSession(sessionA);
    });

    expect(useNovelStore.getState().currentSessionId).toBe(sessionA);
    expect(useNovelStore.getState().originalNovel).toBe('Content A');
    expect(useNovelStore.getState().analysis).toBe('Analysis A');
    expect(useNovelStore.getState().targetStoryWordCount).toBe(18000);
    expect(useNovelStore.getState().targetChapterCount).toBe(4);
    expect(useWorkflowStore.getState().steps.analysis.content).toBe('Analysis A');
  });

  it('should clear workflow steps when starting a new session', async () => {
    act(() => {
      useWorkflowStore.getState().updateStepContent('analysis', 'Old analysis');
      useWorkflowStore.getState().setStepError('analysis', 'Old error');
      useNovelStore.getState().startNewSession();
    });

    const workflow = useWorkflowStore.getState();
    const novel = useNovelStore.getState();
    expect(workflow.steps.analysis.status).toBe('idle');
    expect(workflow.steps.analysis.content).toBe('');
    expect(workflow.currentStepId).toBe('analysis');
    expect(novel.originalNovel).toBe('');
    expect(novel.outlineDirection).toBe('');
    expect(novel.targetStoryWordCount).toBe(20000);
    expect(novel.targetChapterCount).toBe(5);
  });

  it('should persist outline direction to database', async () => {
    await act(async () => {
      await useNovelStore.getState().setOutlineDirection('Add political intrigue');
    });

    const session = await db.novels.where('sessionId').equals(useNovelStore.getState().currentSessionId).first();
    expect(session?.outlineDirection).toBe('Add political intrigue');
  });

  it('should persist target story and chapter settings', async () => {
    await act(async () => {
      await useNovelStore.getState().setTargetStoryWordCount(30000);
      await useNovelStore.getState().setTargetChapterCount(8);
    });

    const session = await db.novels.where('sessionId').equals(useNovelStore.getState().currentSessionId).first();
    expect(session?.targetStoryWordCount).toBe(30000);
    expect(session?.targetChapterCount).toBe(8);
  });
});

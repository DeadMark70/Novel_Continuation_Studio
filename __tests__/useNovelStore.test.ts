import { useNovelStore } from '../store/useNovelStore';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { act } from '@testing-library/react';
import { db, getLatestNovel, getSession, saveNovel, generateSessionId } from '../lib/db';

describe('useNovelStore Integration', () => {
  beforeEach(async () => {
    if (!db.isOpen()) {
      await db.open();
    }
    await db.novels.clear();
    await db.novelBlobs.clear();
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
    
    const latest = await getLatestNovel();
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
    
    const latest = await getLatestNovel();
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
    expect(workflow.currentStepId).toBe('compression');
    expect(novel.originalNovel).toBe('');
    expect(novel.outlineDirection).toBe('');
    expect(novel.targetStoryWordCount).toBe(20000);
    expect(novel.targetChapterCount).toBe(5);
    expect(novel.pacingMode).toBe('fixed');
    expect(novel.plotPercent).toBe(60);
    expect(novel.curvePlotPercentStart).toBe(80);
    expect(novel.curvePlotPercentEnd).toBe(40);
    expect(novel.eroticSceneLimitPerChapter).toBe(2);
    expect(novel.consistencyReports).toEqual([]);
    expect(novel.characterTimeline).toEqual([]);
    expect(novel.foreshadowLedger).toEqual([]);
  });

  it('should persist outline direction to database', async () => {
    await act(async () => {
      await useNovelStore.getState().setOutlineDirection('Add political intrigue');
    });

    const session = await getSession(useNovelStore.getState().currentSessionId);
    expect(session?.outlineDirection).toBe('Add political intrigue');
  });

  it('should persist target story and chapter settings', async () => {
    await act(async () => {
      await useNovelStore.getState().setTargetStoryWordCount(30000);
      await useNovelStore.getState().setTargetChapterCount(8);
    });

    const session = await getSession(useNovelStore.getState().currentSessionId);
    expect(session?.targetStoryWordCount).toBe(30000);
    expect(session?.targetChapterCount).toBe(8);
  });

  it('should persist pacing settings', async () => {
    await act(async () => {
      await useNovelStore.getState().setPacingSettings({
        pacingMode: 'curve',
        plotPercent: 55,
        curvePlotPercentStart: 85,
        curvePlotPercentEnd: 45,
        eroticSceneLimitPerChapter: 3,
      });
    });

    const session = await getSession(useNovelStore.getState().currentSessionId);
    expect(session?.pacingMode).toBe('curve');
    expect(session?.plotPercent).toBe(55);
    expect(session?.curvePlotPercentStart).toBe(85);
    expect(session?.curvePlotPercentEnd).toBe(45);
    expect(session?.eroticSceneLimitPerChapter).toBe(3);
  });

  it('should append and persist consistency state', async () => {
    await act(async () => {
      await useNovelStore.getState().setNovel('Consistency Test');
    });

    const now = Date.now();
    await act(async () => {
      await useNovelStore.getState().appendConsistencyReport({
        report: {
          id: 'report_1',
          chapterNumber: 1,
          generatedAt: now,
          summary: 'ok',
          issues: [],
          regenPromptDraft: 'rewrite',
        },
        characterTimelineUpdates: [
          {
            id: 'timeline_1',
            chapterNumber: 1,
            character: '阿明',
            change: '建立信任',
            evidence: '證據',
            updatedAt: now,
          },
        ],
        foreshadowLedger: [
          {
            id: 'foreshadow_1',
            title: '戒指來源',
            status: 'open',
            evidence: '尚未揭曉',
            introducedAtChapter: 1,
            lastUpdatedChapter: 1,
          },
        ],
        summary: {
          latestChapter: 1,
          totalIssues: 0,
          highRiskCount: 0,
          openForeshadowCount: 1,
          lastCheckedAt: now,
        },
      });
    });

    const state = useNovelStore.getState();
    expect(state.consistencyReports.length).toBe(1);
    expect(state.characterTimeline.length).toBe(1);
    expect(state.foreshadowLedger.length).toBe(1);
    expect(state.getLatestConsistencyReport()?.chapterNumber).toBe(1);

    const session = await getSession(state.currentSessionId);
    expect(session?.consistencyReports?.length).toBe(1);
    expect(session?.characterTimeline?.length).toBe(1);
    expect(session?.foreshadowLedger?.[0].title).toBe('戒指來源');
  });

  it('should hydrate workflow store from database on initialize', async () => {
    // 1. Create a session in DB with progress
    const sessionId = generateSessionId();
    await saveNovel({
      sessionId,
      content: 'Hydrate Test',
      wordCount: 12,
      currentStep: 2, // Outline step
      analysis: 'Test Analysis',
      outline: 'Test Outline',
      outlineDirection: 'More tension',
      breakdown: '',
      chapters: [],
      compressedContext: 'Compressed text',
      targetStoryWordCount: 15000,
      targetChapterCount: 3
    });

    // 2. Initialize store
    await act(async () => {
      useNovelStore.setState({ isInitialized: false }); // Force re-initialization
      await useNovelStore.getState().initialize();
    });

    // 3. Verify state
    const novelState = useNovelStore.getState();
    const workflowState = useWorkflowStore.getState();

    expect(novelState.currentSessionId).toBe(sessionId);
    expect(novelState.originalNovel).toBe('Hydrate Test');
    expect(novelState.outlineDirection).toBe('More tension');
    expect(novelState.compressedContext).toBe('Compressed text');

    expect(workflowState.currentStepId).toBe('outline');
    expect(workflowState.steps.analysis.content).toBe('Test Analysis');
    expect(workflowState.steps.outline.content).toBe('Test Outline');
    expect(workflowState.steps.compression.content).toBe('Compressed text');
  });

  it('should hydrate workflow store on loadSession', async () => {
    // 1. Create a session in DB with progress
    const sessionId = generateSessionId();
    await saveNovel({
      sessionId,
      content: 'LoadSession Test',
      wordCount: 15,
      currentStep: 3, // Breakdown step
      analysis: 'Analysis content',
      outline: 'Outline content',
      outlineDirection: '',
      breakdown: 'Breakdown content',
      chapters: ['Chapter 1'],
      compressedContext: 'Compressed content',
      targetStoryWordCount: 20000,
      targetChapterCount: 5
    });

    // 2. Load the session
    await act(async () => {
      await useNovelStore.getState().loadSession(sessionId);
    });

    // 3. Verify workflow hydration
    const workflowState = useWorkflowStore.getState();
    expect(workflowState.currentStepId).toBe('breakdown');
    expect(workflowState.steps.compression.content).toBe('Compressed content');
    expect(workflowState.steps.analysis.content).toBe('Analysis content');
    expect(workflowState.steps.outline.content).toBe('Outline content');
    expect(workflowState.steps.breakdown.content).toBe('Breakdown content');
    expect(workflowState.steps.chapter1.content).toBe('Chapter 1');
  });
});

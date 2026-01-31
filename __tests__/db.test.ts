import { db, saveNovel, getLatestNovel, getNovelHistory, generateSessionId } from '../lib/db';

describe('NovelDatabase', () => {
  beforeEach(async () => {
    if (!db.isOpen()) {
      await db.open();
    }
    await db.novels.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  it('should save and retrieve a novel', async () => {
    const sessionId = generateSessionId();
    await saveNovel({
      sessionId,
      content: 'Test content',
      wordCount: 12,
      currentStep: 1,
      analysis: '',
      outline: '',
      outlineDirection: '',
      breakdown: '',
      chapters: []
    });

    const latest = await getLatestNovel();
    expect(latest?.content).toBe('Test content');
    expect(latest?.wordCount).toBe(12);
  });

  it('should update the existing novel entry by default', async () => {
    const sessionId = generateSessionId();
    await saveNovel({
      sessionId,
      content: 'Initial',
      wordCount: 7,
      currentStep: 1,
      analysis: '',
      outline: '',
      outlineDirection: '',
      breakdown: '',
      chapters: []
    });

    await saveNovel({
      sessionId,
      content: 'Updated',
      wordCount: 7,
      currentStep: 2,
      analysis: 'Some analysis',
      outline: '',
      outlineDirection: '',
      breakdown: '',
      chapters: []
    });

    const count = await db.novels.count();
    expect(count).toBe(1);

    const latest = await getLatestNovel();
    expect(latest?.content).toBe('Updated');
    expect(latest?.currentStep).toBe(2);
    expect(latest?.analysis).toBe('Some analysis');
  });

  it('should create separate entries for different sessions', async () => {
    const session1 = generateSessionId();
    await saveNovel({
      sessionId: session1,
      content: 'Session 1',
      wordCount: 9,
      currentStep: 1,
      analysis: '',
      outline: '',
      outlineDirection: '',
      breakdown: '',
      chapters: []
    });

    // Small delay to ensure timestamp difference
    await new Promise(r => setTimeout(r, 10));

    const session2 = generateSessionId();
    await saveNovel({
      sessionId: session2,
      content: 'Session 2',
      wordCount: 9,
      currentStep: 1,
      analysis: '',
      outline: '',
      outlineDirection: '',
      breakdown: '',
      chapters: []
    });

    const count = await db.novels.count();
    expect(count).toBe(2);

    const history = await getNovelHistory();
    expect(history.length).toBe(2);
    // getNovelHistory returns reverse chronological order (latest updated first)
    expect(history[0].content).toBe('Session 2'); 
    expect(history[1].content).toBe('Session 1');
  });
});

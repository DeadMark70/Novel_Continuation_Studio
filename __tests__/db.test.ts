import { db, saveNovel, getLatestNovel, getNovelHistory } from '../lib/db';

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

  it('should update the existing novel entry by default', async () => {
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

  it('should create new versions when forceNew is true', async () => {
    await saveNovel({
      content: 'Version 1',
      wordCount: 9,
      currentStep: 1,
      analysis: '',
      outline: '',
      outlineDirection: '',
      chapters: []
    });

    await saveNovel({
      content: 'Version 2',
      wordCount: 9,
      currentStep: 1,
      analysis: '',
      outline: '',
      outlineDirection: '',
      chapters: []
    }, true);

    const count = await db.novels.count();
    expect(count).toBe(2);

    const history = await getNovelHistory();
    expect(history.length).toBe(2);
    expect(history[0].content).toBe('Version 2'); // Descending order
    expect(history[1].content).toBe('Version 1');
  });
});

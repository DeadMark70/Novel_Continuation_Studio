import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHarvestStore } from '../store/useHarvestStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { generateStreamByProvider } from '../lib/nim-client';
import { parseHarvestCandidates } from '../lib/sensory-template-harvest';

vi.mock('../lib/nim-client', () => ({
  generateStreamByProvider: vi.fn(),
}));

vi.mock('../lib/sensory-template-harvest', () => ({
  buildSensoryTemplateHarvestPrompt: vi.fn(() => 'prompt'),
  parseHarvestCandidates: vi.fn(),
}));

const mockedGenerateStreamByProvider = vi.mocked(generateStreamByProvider);
const mockedParseHarvestCandidates = vi.mocked(parseHarvestCandidates);

describe('useHarvestStore', () => {
  beforeEach(() => {
    useHarvestStore.setState(useHarvestStore.getInitialState());
    useSettingsStore.setState(useSettingsStore.getInitialState());
    useSettingsStore.setState({
      phaseConfig: {
        ...useSettingsStore.getState().phaseConfig,
        sensoryHarvest: {
          provider: 'nim',
          model: 'meta/llama3-70b-instruct',
        },
      },
    });
    vi.clearAllMocks();
  });

  it('runs harvest and stores candidates when parsing succeeds', async () => {
    mockedGenerateStreamByProvider.mockImplementation(async function* () {
      yield '[{"text":"sensory sample"}]';
    });
    mockedParseHarvestCandidates.mockReturnValue([
      {
        id: 'h1',
        text: 'sample',
        psychologicalShift: '羞恥升高且抗拒鬆動',
        tags: ['觸覺'],
        povCharacter: '通用',
        sensoryScore: 0.9,
        controlLossScore: 0.8,
        source: 'uploaded_novel',
        createdAt: new Date().toISOString(),
      },
    ]);

    await act(async () => {
      await useHarvestStore.getState().startHarvest('novel text');
    });

    const state = useHarvestStore.getState();
    expect(state.status).toBe('success');
    expect(state.statusText).toBe('已完成');
    expect(state.candidates).toHaveLength(1);
    expect(state.showResultDialog).toBe(true);
  });

  it('sets error state when parsing fails', async () => {
    mockedGenerateStreamByProvider.mockImplementation(async function* () {
      yield 'invalid json';
    });
    mockedParseHarvestCandidates.mockImplementation(() => {
      throw new Error('Failed to parse harvest JSON output.');
    });

    await act(async () => {
      await useHarvestStore.getState().startHarvest('novel text');
    });

    const state = useHarvestStore.getState();
    expect(state.status).toBe('error');
    expect(state.showErrorDialog).toBe(true);
    expect(state.error).toContain('Failed to parse');
  });

  it('parses corrected JSON manually and moves back to success', () => {
    mockedParseHarvestCandidates.mockReturnValue([
      {
        id: 'h2',
        text: 'fixed',
        psychologicalShift: '依賴感上升並放棄抵抗',
        tags: ['聲音'],
        povCharacter: '主角',
        sensoryScore: 0.85,
        controlLossScore: 0.75,
        source: 'uploaded_novel',
        createdAt: new Date().toISOString(),
      },
    ]);

    act(() => {
      useHarvestStore.setState({
        status: 'error',
        showErrorDialog: true,
      });
      useHarvestStore.getState().applyManualJsonAndParse('[{}]');
    });

    const state = useHarvestStore.getState();
    expect(state.status).toBe('success');
    expect(state.showErrorDialog).toBe(false);
    expect(state.showResultDialog).toBe(true);
    expect(state.candidates).toHaveLength(1);
  });
});

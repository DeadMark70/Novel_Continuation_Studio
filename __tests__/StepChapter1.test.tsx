import { fireEvent, render, screen } from '@testing-library/react';
import { vi, beforeEach, describe, expect, it } from 'vitest';
import { StepChapter1 } from '../components/workflow/StepChapter1';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { useNovelStore } from '../store/useNovelStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useStepGenerator } from '../hooks/useStepGenerator';

vi.mock('../store/useWorkflowStore');
vi.mock('../store/useNovelStore');
vi.mock('../store/useSettingsStore');
vi.mock('../hooks/useStepGenerator');

type ChapterStepState = {
  content: string;
  status: 'idle' | 'streaming' | 'completed' | 'error';
  error?: string;
};

const useWorkflowStoreMock = useWorkflowStore as unknown as ReturnType<typeof vi.fn>;
const useNovelStoreMock = useNovelStore as unknown as ReturnType<typeof vi.fn>;
const useSettingsStoreMock = useSettingsStore as unknown as ReturnType<typeof vi.fn>;
const useStepGeneratorMock = useStepGenerator as unknown as ReturnType<typeof vi.fn>;

describe('StepChapter1', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const workflowState = {
      steps: {
        chapter1: { content: '', status: 'idle' } as ChapterStepState,
      },
      startStep: vi.fn(),
    };
    const novelState = {
      wordCount: 3000,
      compressedContext: '',
    };
    const settingsState = {
      compressionMode: 'off',
      compressionAutoThreshold: 20000,
      sensoryAnchorTemplates: [
        { id: 'sensory_default', name: 'Default', content: 'cold metal + rough friction' },
      ],
      sensoryAutoTemplateByPhase: {
        chapter1: 'sensory_default',
        continuation: 'sensory_default',
      },
    };
    const generatorState = {
      generate: vi.fn(),
      stop: vi.fn(),
    };

    useWorkflowStoreMock.mockImplementation((selector?: (state: typeof workflowState) => unknown) => (
      selector ? selector(workflowState) : workflowState
    ));
    useNovelStoreMock.mockImplementation((selector?: (state: typeof novelState) => unknown) => (
      selector ? selector(novelState) : novelState
    ));
    useSettingsStoreMock.mockImplementation((selector?: (state: typeof settingsState) => unknown) => (
      selector ? selector(settingsState) : settingsState
    ));
    useStepGeneratorMock.mockReturnValue(generatorState);
  });

  it('passes sensory anchors to generate action', () => {
    render(<StepChapter1 />);

    expect(screen.getByText('Sensory Anchors (Optional)')).toBeDefined();

    fireEvent.change(
      screen.getByPlaceholderText('Concrete sensations only: temperature, texture, breath, sound, involuntary reaction...'),
      { target: { value: 'cold steel on skin, shallow breathing' } }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Generate Chapter 1' }));

    const { generate } = useStepGeneratorMock.mock.results[0].value as { generate: ReturnType<typeof vi.fn> };
    expect(generate).toHaveBeenCalledWith('chapter1', {
      sensoryAnchors: 'cold steel on skin, shallow breathing',
    });
  });
});

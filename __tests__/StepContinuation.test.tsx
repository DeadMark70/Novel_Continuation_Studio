import { render, screen } from '@testing-library/react';
import { StepContinuation } from '../components/workflow/StepContinuation';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { useNovelStore } from '../store/useNovelStore';
import { useStepGenerator } from '../hooks/useStepGenerator';
import { vi, beforeEach, describe, expect, it } from 'vitest';

// Mocks
vi.mock('../components/workflow/AutoModeControl', () => ({
  AutoModeControl: () => <div data-testid="auto-mode-control" />
}));
vi.mock('../components/workflow/ProgressIndicator', () => ({
  ProgressIndicator: ({ total }: { total: number }) => (
    <div data-testid="progress-indicator">progress-total-{total}</div>
  )
}));
vi.mock('../components/workflow/ConsistencyPanel', () => ({
  ConsistencyPanel: () => <div data-testid="consistency-panel" />
}));
vi.mock('../store/useWorkflowStore');
vi.mock('../store/useNovelStore');
vi.mock('../hooks/useStepGenerator');

type ContinuationStepState = {
  content: string;
  status: 'idle' | 'streaming' | 'completed' | 'error';
};

type StepContinuationWorkflowState = {
  steps: { continuation: ContinuationStepState };
  isGenerating: boolean;
  isPaused: boolean;
};

type StepContinuationNovelState = {
  chapters: string[];
  targetChapterCount: number;
};

type StepGeneratorState = {
  generate: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

const useWorkflowStoreMock = useWorkflowStore as unknown as ReturnType<typeof vi.fn>;
const useNovelStoreMock = useNovelStore as unknown as ReturnType<typeof vi.fn>;
const useStepGeneratorMock = useStepGenerator as unknown as ReturnType<typeof vi.fn>;

describe('StepContinuation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const workflowState: StepContinuationWorkflowState = {
      steps: { continuation: { content: '', status: 'idle' } },
      isGenerating: false,
      isPaused: false
    };
    const novelState: StepContinuationNovelState = {
      chapters: ['Ch1'],
      targetChapterCount: 7
    };
    const stepGeneratorState: StepGeneratorState = {
      generate: vi.fn(),
      stop: vi.fn()
    };

    useWorkflowStoreMock.mockImplementation(
      (selector?: (value: StepContinuationWorkflowState) => unknown) => {
        return selector ? selector(workflowState) : workflowState;
      }
    );
    useNovelStoreMock.mockImplementation((selector?: (value: StepContinuationNovelState) => unknown) => {
      return selector ? selector(novelState) : novelState;
    });
    useStepGeneratorMock.mockReturnValue(stepGeneratorState);
  });

  it('renders AutoModeControl when not generating', () => {
    render(<StepContinuation />);
    expect(screen.getByTestId('auto-mode-control')).toBeDefined();
    expect(screen.getByTestId('consistency-panel')).toBeDefined();
    expect(screen.queryByTestId('progress-indicator')).toBeNull();
  });

  it('renders ProgressIndicator when generating', () => {
    const workflowState: StepContinuationWorkflowState = {
      steps: { continuation: { content: 'generating...', status: 'streaming' } },
      isGenerating: true,
      isPaused: false
    };
    useWorkflowStoreMock.mockImplementation(
      (selector?: (value: StepContinuationWorkflowState) => unknown) => {
        return selector ? selector(workflowState) : workflowState;
      }
    );

    render(<StepContinuation />);
    expect(screen.getByTestId('progress-indicator')).toBeDefined();
    expect(screen.getByText('progress-total-7')).toBeDefined();
    expect(screen.queryByTestId('auto-mode-control')).toBeNull();
  });
});

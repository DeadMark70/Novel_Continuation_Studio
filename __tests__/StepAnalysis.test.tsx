import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StepAnalysis } from '../components/workflow/StepAnalysis';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useNovelStore } from '../store/useNovelStore';
import { useStepGenerator } from '../hooks/useStepGenerator';

vi.mock('../store/useWorkflowStore');
vi.mock('../store/useSettingsStore');
vi.mock('../store/useNovelStore');
vi.mock('../hooks/useStepGenerator');

const useWorkflowStoreMock = useWorkflowStore as unknown as ReturnType<typeof vi.fn>;
const useSettingsStoreMock = useSettingsStore as unknown as ReturnType<typeof vi.fn>;
const useNovelStoreMock = useNovelStore as unknown as ReturnType<typeof vi.fn>;
const useStepGeneratorMock = useStepGenerator as unknown as ReturnType<typeof vi.fn>;

describe('StepAnalysis', () => {
  const generate = vi.fn();
  const stop = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useStepGeneratorMock.mockReturnValue({ generate, stop });
    useSettingsStoreMock.mockImplementation(
      (selector?: (value: unknown) => unknown) => {
        const state = {
          compressionMode: 'auto',
          compressionAutoThreshold: 20000,
        };
        return selector ? selector(state) : state;
      }
    );
    useNovelStoreMock.mockImplementation(
      (selector?: (value: unknown) => unknown) => {
        const state = {
          wordCount: 12000,
          compressedContext: 'compressed',
        };
        return selector ? selector(state) : state;
      }
    );
  });

  it('resumes immediately when truncation is detected', () => {
    const workflowState = {
      steps: {
        analysis: {
          id: 'analysis',
          status: 'completed',
          content: 'partial output',
          truncation: {
            isTruncated: true,
            lastFinishReason: 'length',
            autoResumeRoundsUsed: 2,
            lastTruncatedOutlineTask: undefined,
          },
        },
      },
    };
    useWorkflowStoreMock.mockImplementation(
      (selector?: (value: typeof workflowState) => unknown) =>
        selector ? selector(workflowState) : workflowState
    );
    render(<StepAnalysis />);

    fireEvent.click(screen.getByRole('button', { name: /resume missing/i }));
    expect(generate).toHaveBeenCalledWith('analysis', '[[RESUME_LAST_OUTPUT]]');
  });

  it('shows dialog confirmation when truncation was not detected', () => {
    const workflowState = {
      steps: {
        analysis: {
          id: 'analysis',
          status: 'completed',
          content: 'complete output',
          truncation: {
            isTruncated: false,
            lastFinishReason: 'stop',
            autoResumeRoundsUsed: 0,
            lastTruncatedOutlineTask: undefined,
          },
        },
      },
    };
    useWorkflowStoreMock.mockImplementation(
      (selector?: (value: typeof workflowState) => unknown) =>
        selector ? selector(workflowState) : workflowState
    );
    render(<StepAnalysis />);

    fireEvent.click(screen.getByRole('button', { name: /resume missing/i }));
    expect(screen.getByText(/continue without truncation/i)).toBeDefined();
    expect(generate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    expect(generate).toHaveBeenCalledWith('analysis', '[[RESUME_LAST_OUTPUT]]');
  });

  it('does not continue when dialog cancel is clicked', () => {
    const workflowState = {
      steps: {
        analysis: {
          id: 'analysis',
          status: 'completed',
          content: 'complete output',
          truncation: {
            isTruncated: false,
            lastFinishReason: 'stop',
            autoResumeRoundsUsed: 0,
            lastTruncatedOutlineTask: undefined,
          },
        },
      },
    };
    useWorkflowStoreMock.mockImplementation(
      (selector?: (value: typeof workflowState) => unknown) =>
        selector ? selector(workflowState) : workflowState
    );
    render(<StepAnalysis />);

    fireEvent.click(screen.getByRole('button', { name: /resume missing/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(generate).not.toHaveBeenCalled();
  });
});

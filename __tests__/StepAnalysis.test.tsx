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
    useWorkflowStoreMock.mockReturnValue({
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
    });

    const confirmSpy = vi.spyOn(window, 'confirm');
    render(<StepAnalysis />);

    fireEvent.click(screen.getByRole('button', { name: /resume missing/i }));
    expect(generate).toHaveBeenCalledWith('analysis', '[[RESUME_LAST_OUTPUT]]');
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('asks for confirmation when truncation was not detected', () => {
    useWorkflowStoreMock.mockReturnValue({
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
    });

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<StepAnalysis />);

    fireEvent.click(screen.getByRole('button', { name: /resume missing/i }));
    expect(generate).not.toHaveBeenCalled();
  });
});

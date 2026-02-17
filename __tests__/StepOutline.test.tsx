import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StepOutline } from '../components/workflow/StepOutline';
import { serializeOutlinePhase2Content } from '../lib/outline-phase2';
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

const OUTLINE_WITH_2A_2B = serializeOutlinePhase2Content({
  part2A: 'Phase 2A content',
  part2B: 'Phase 2B content',
  missing2A: [],
  missing2B: [],
});

const OUTLINE_WITH_2A_ONLY = serializeOutlinePhase2Content({
  part2A: 'Phase 2A content',
  part2B: '',
  missing2A: [],
  missing2B: [],
});

describe('StepOutline', () => {
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
          outlineDirection: 'keep pacing',
          setOutlineDirection: vi.fn(),
          targetStoryWordCount: 12000,
          setTargetStoryWordCount: vi.fn().mockResolvedValue(undefined),
          targetChapterCount: 10,
          setTargetChapterCount: vi.fn().mockResolvedValue(undefined),
          pacingMode: 'fixed',
          plotPercent: 70,
          curvePlotPercentStart: 85,
          curvePlotPercentEnd: 35,
          eroticSceneLimitPerChapter: 2,
          setPacingSettings: vi.fn().mockResolvedValue(undefined),
          wordCount: 12000,
          compressedContext: '',
        };
        return selector ? selector(state) : state;
      }
    );
  });

  const mockWorkflowState = (workflowState: {
    steps: {
      outline: {
        id: 'outline';
        status: 'idle' | 'streaming' | 'completed' | 'error';
        content: string;
        error?: string;
        truncation: {
          isTruncated: boolean;
          lastFinishReason: 'length' | 'stop' | 'unknown';
          autoResumeRoundsUsed: number;
          lastTruncatedOutlineTask?: '2A' | '2B';
        };
      };
    };
    currentStepId: 'outline';
  }) => {
    useWorkflowStoreMock.mockImplementation(
      (selector?: (value: typeof workflowState) => unknown) =>
        selector ? selector(workflowState) : workflowState
    );
  };

  it('resumes selected subtask immediately when truncation was detected', () => {
    mockWorkflowState({
      steps: {
        outline: {
          id: 'outline',
          status: 'completed',
          content: OUTLINE_WITH_2A_2B,
          error: undefined,
          truncation: {
            isTruncated: true,
            lastFinishReason: 'length',
            autoResumeRoundsUsed: 2,
            lastTruncatedOutlineTask: '2B',
          },
        },
      },
      currentStepId: 'outline',
    });
    render(<StepOutline />);

    fireEvent.click(screen.getByRole('button', { name: /resume 2b/i }));

    expect(generate).toHaveBeenCalledWith(
      'outline',
      'keep pacing\n[[OUTLINE_TASK:2B]]\n[[RESUME_LAST_OUTPUT]]'
    );
  });

  it('shows dialog confirmation when no truncation was detected', () => {
    mockWorkflowState({
      steps: {
        outline: {
          id: 'outline',
          status: 'completed',
          content: OUTLINE_WITH_2A_2B,
          error: undefined,
          truncation: {
            isTruncated: false,
            lastFinishReason: 'stop',
            autoResumeRoundsUsed: 0,
            lastTruncatedOutlineTask: undefined,
          },
        },
      },
      currentStepId: 'outline',
    });
    render(<StepOutline />);

    fireEvent.click(screen.getByRole('button', { name: /resume 2a/i }));
    expect(screen.getByText(/continue without truncation/i)).toBeDefined();
    expect(generate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    expect(generate).toHaveBeenCalledWith(
      'outline',
      'keep pacing\n[[OUTLINE_TASK:2A]]\n[[RESUME_LAST_OUTPUT]]'
    );
  });

  it('enables task-specific resume only when that task has output', () => {
    mockWorkflowState({
      steps: {
        outline: {
          id: 'outline',
          status: 'completed',
          content: OUTLINE_WITH_2A_ONLY,
          error: undefined,
          truncation: {
            isTruncated: true,
            lastFinishReason: 'length',
            autoResumeRoundsUsed: 1,
            lastTruncatedOutlineTask: undefined,
          },
        },
      },
      currentStepId: 'outline',
    });

    render(<StepOutline />);

    expect((screen.getByRole('button', { name: /resume 2b/i }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /resume 2a/i }));
    expect(generate).toHaveBeenCalledWith(
      'outline',
      'keep pacing\n[[OUTLINE_TASK:2A]]\n[[RESUME_LAST_OUTPUT]]'
    );
  });

  it('does not resume when dialog cancel is clicked', () => {
    mockWorkflowState({
      steps: {
        outline: {
          id: 'outline',
          status: 'completed',
          content: OUTLINE_WITH_2A_2B,
          error: undefined,
          truncation: {
            isTruncated: false,
            lastFinishReason: 'stop',
            autoResumeRoundsUsed: 0,
            lastTruncatedOutlineTask: undefined,
          },
        },
      },
      currentStepId: 'outline',
    });

    render(<StepOutline />);
    fireEvent.click(screen.getByRole('button', { name: /resume 2a/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(generate).not.toHaveBeenCalled();
  });
});

import { render, screen } from '@testing-library/react';
import { StepContinuation } from '../components/workflow/StepContinuation';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { useNovelStore } from '../store/useNovelStore';
import { useStepGenerator } from '../hooks/useStepGenerator';
import { vi } from 'vitest';

// Mocks
vi.mock('../components/workflow/AutoModeControl', () => ({
  AutoModeControl: () => <div data-testid="auto-mode-control" />
}));
vi.mock('../components/workflow/ProgressIndicator', () => ({
  ProgressIndicator: ({ total }: { total: number }) => (
    <div data-testid="progress-indicator">progress-total-{total}</div>
  )
}));
vi.mock('../store/useWorkflowStore');
vi.mock('../store/useNovelStore');
vi.mock('../hooks/useStepGenerator');

describe('StepContinuation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockReturnValue({
      steps: { continuation: { content: '', status: 'idle' } },
      isGenerating: false,
      isPaused: false
    });
    (useNovelStore as any).mockReturnValue({
      chapters: ['Ch1'],
      targetChapterCount: 7
    });
    (useStepGenerator as any).mockReturnValue({
      generate: vi.fn(),
      stop: vi.fn()
    });
  });

  it('renders AutoModeControl when not generating', () => {
    render(<StepContinuation />);
    expect(screen.getByTestId('auto-mode-control')).toBeDefined();
    expect(screen.queryByTestId('progress-indicator')).toBeNull();
  });

  it('renders ProgressIndicator when generating', () => {
    (useWorkflowStore as any).mockReturnValue({
      steps: { continuation: { content: 'generating...', status: 'streaming' } },
      isGenerating: true,
      isPaused: false
    });
    render(<StepContinuation />);
    expect(screen.getByTestId('progress-indicator')).toBeDefined();
    expect(screen.getByText('progress-total-7')).toBeDefined();
    expect(screen.queryByTestId('auto-mode-control')).toBeNull();
  });
});

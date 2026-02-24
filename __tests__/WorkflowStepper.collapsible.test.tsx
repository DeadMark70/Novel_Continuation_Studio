import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { useWorkflowStore } from '../store/useWorkflowStore';

vi.mock('../hooks/useStepGenerator', () => ({
  useStepGenerator: () => ({
    generate: vi.fn(),
    stop: vi.fn(),
  }),
}));

vi.mock('../components/workflow/StepCompression', () => ({
  StepCompression: () => <div>StepCompression</div>,
}));
vi.mock('../components/workflow/StepAnalysis', () => ({
  StepAnalysis: () => <div>StepAnalysis</div>,
}));
vi.mock('../components/workflow/StepOutline', () => ({
  StepOutline: () => <div>StepOutline</div>,
}));
vi.mock('../components/workflow/StepBreakdown', () => ({
  StepBreakdown: () => <div>StepBreakdown</div>,
}));
vi.mock('../components/workflow/StepChapter1', () => ({
  StepChapter1: () => <div>StepChapter1</div>,
}));
vi.mock('../components/workflow/StepContinuation', () => ({
  StepContinuation: () => <div>StepContinuation</div>,
}));

describe('WorkflowStepper collapsible behavior', () => {
  beforeEach(() => {
    useWorkflowStore.setState(useWorkflowStore.getInitialState());
  });

  it('allows closing active step by clicking the same trigger', () => {
    render(<WorkflowStepper />);
    const compressionTrigger = screen.getByText('Phase 0: Compression');
    fireEvent.click(compressionTrigger);
    expect(useWorkflowStore.getState().openStepId).toBeNull();
  });

  it('opens another step and tracks open state independently', () => {
    render(<WorkflowStepper />);
    const analysisTrigger = screen.getByText('Phase I: Analysis');
    fireEvent.click(analysisTrigger);
    const state = useWorkflowStore.getState();
    expect(state.openStepId).toBe('analysis');
    expect(state.currentStepId).toBe('analysis');
  });
});

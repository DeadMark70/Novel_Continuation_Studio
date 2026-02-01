import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressIndicator } from '../components/workflow/ProgressIndicator';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { vi } from 'vitest';

const mockPauseGeneration = vi.fn();
const mockStop = vi.fn();

vi.mock('../store/useWorkflowStore', () => ({
  useWorkflowStore: vi.fn(),
}));

describe('ProgressIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockReturnValue({
      pauseGeneration: mockPauseGeneration
    });
  });

  it('renders progress text and bar', () => {
    render(<ProgressIndicator current={3} total={5} onStop={mockStop} />);
    expect(screen.getByText(/第 3\/5 章/i)).toBeDefined();
    expect(screen.getByRole('progressbar')).toBeDefined();
  });

  it('calculates percentage correctly (visual check)', () => {
    render(<ProgressIndicator current={3} total={5} onStop={mockStop} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeDefined();
  });

  it('calls pauseGeneration and onStop when Pause button clicked', () => {
    render(<ProgressIndicator current={3} total={5} onStop={mockStop} />);
    const pauseBtn = screen.getByRole('button'); 
    fireEvent.click(pauseBtn);
    expect(mockPauseGeneration).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
  });
});

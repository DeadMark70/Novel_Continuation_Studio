import { render, screen, fireEvent } from '@testing-library/react';
import { AutoModeControl } from '../components/workflow/AutoModeControl';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { useNovelStore } from '../store/useNovelStore';
import { vi } from 'vitest';

// Mock store
const mockSetAutoMode = vi.fn();
const mockSetAutoRange = vi.fn();
const mockStartStep = vi.fn();

vi.mock('../store/useWorkflowStore', () => ({
  useWorkflowStore: vi.fn(),
}));
vi.mock('../store/useNovelStore', () => ({
  useNovelStore: vi.fn(),
}));

// Mock Select component because Radix Select is hard to test in JSDOM sometimes without setup
// But if it works in browser, we can try to rely on basic structure.
// However, since we are using shadcn components which use Radix, simpler to mock them if needed.
// But let's try real components first with getByTestId.

describe('AutoModeControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNovelStore as any).mockReturnValue({
      targetChapterCount: 7,
    });
    (useWorkflowStore as any).mockImplementation((selector: any) => {
      const state = {
        autoMode: 'manual',
        autoRangeStart: 2,
        autoRangeEnd: 7,
        setAutoMode: mockSetAutoMode,
        setAutoRange: mockSetAutoRange,
        startStep: mockStartStep,
      };
      return selector ? selector(state) : state;
    });
  });

  it('renders mode selection radio group', () => {
    render(<AutoModeControl onStart={mockStartStep} />);
    expect(screen.getByTestId('mode-manual')).toBeDefined();
    expect(screen.getByTestId('mode-full_auto')).toBeDefined();
    expect(screen.getByTestId('mode-range')).toBeDefined();
  });

  it('calls setAutoMode when mode changes', () => {
    render(<AutoModeControl onStart={mockStartStep} />);
    fireEvent.click(screen.getByTestId('mode-full_auto'));
    expect(mockSetAutoMode).toHaveBeenCalledWith('full_auto');
  });

  it('shows range selectors only in range mode', () => {
    // Override mock for this test
    (useWorkflowStore as any).mockImplementation((selector: any) => {
        const state = {
          autoMode: 'range',
          autoRangeStart: 2,
          autoRangeEnd: 7,
          setAutoMode: mockSetAutoMode,
          setAutoRange: mockSetAutoRange,
          startStep: mockStartStep,
        };
        return selector ? selector(state) : state;
      });

    render(<AutoModeControl onStart={mockStartStep} />);
    expect(screen.getByTestId('range-selector')).toBeDefined();
  });

  it('calls startStep when Start button clicked', () => {
    render(<AutoModeControl onStart={mockStartStep} />);
    const button = screen.getByRole('button', { name: /開始生成/i }); // Regex matching might still be flaky if encoding bad
    // fallback to getByText if role fails? Or add testid to button
    // Let's try getByText
    // fireEvent.click(screen.getByText(/開始生成/i)); 
    // Wait, let's just use getByRole which is better practice, but text matching relies on string.
    
    // I will use querySelector or assume text match works if file is utf8
    fireEvent.click(button);
    expect(mockStartStep).toHaveBeenCalled(); // Should call onStart prop
  });

  it('renders dynamic full auto chapter description', () => {
    render(<AutoModeControl onStart={mockStartStep} />);
    expect(screen.getByText('自動完成第 2-7 章')).toBeDefined();
  });
});

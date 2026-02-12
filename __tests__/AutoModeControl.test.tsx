import { render, screen, fireEvent } from '@testing-library/react';
import { AutoModeControl } from '../components/workflow/AutoModeControl';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { useNovelStore } from '../store/useNovelStore';
import { vi, beforeEach, describe, expect, it } from 'vitest';

// Mock store
const mockSetAutoMode = vi.fn();
const mockSetAutoRange = vi.fn();
const mockSetMaxAutoChapter = vi.fn();
const mockStartStep = vi.fn();

vi.mock('../store/useWorkflowStore', () => ({
  useWorkflowStore: vi.fn(),
}));
vi.mock('../store/useNovelStore', () => ({
  useNovelStore: vi.fn(),
}));

type AutoModeState = {
  autoMode: 'manual' | 'full_auto' | 'range';
  autoRangeStart: number;
  autoRangeEnd: number;
  setAutoMode: typeof mockSetAutoMode;
  setAutoRange: typeof mockSetAutoRange;
  setMaxAutoChapter: typeof mockSetMaxAutoChapter;
  startStep: typeof mockStartStep;
};

type NovelState = {
  targetChapterCount: number;
};

const useNovelStoreMock = useNovelStore as unknown as ReturnType<typeof vi.fn>;
const useWorkflowStoreMock = useWorkflowStore as unknown as ReturnType<typeof vi.fn>;

function mockNovelStoreState(state: NovelState): void {
  useNovelStoreMock.mockImplementation((selector?: (value: NovelState) => unknown) => {
    return selector ? selector(state) : state;
  });
}

function mockWorkflowStoreState(state: AutoModeState): void {
  useWorkflowStoreMock.mockImplementation((selector?: (value: AutoModeState) => unknown) => {
    return selector ? selector(state) : state;
  });
}

describe('AutoModeControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNovelStoreState({
      targetChapterCount: 7,
    });
    mockWorkflowStoreState({
      autoMode: 'manual',
      autoRangeStart: 2,
      autoRangeEnd: 7,
      setAutoMode: mockSetAutoMode,
      setAutoRange: mockSetAutoRange,
      setMaxAutoChapter: mockSetMaxAutoChapter,
      startStep: mockStartStep,
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
    mockWorkflowStoreState({
      autoMode: 'range',
      autoRangeStart: 2,
      autoRangeEnd: 7,
      setAutoMode: mockSetAutoMode,
      setAutoRange: mockSetAutoRange,
      setMaxAutoChapter: mockSetMaxAutoChapter,
      startStep: mockStartStep,
    });

    render(<AutoModeControl onStart={mockStartStep} />);
    expect(screen.getByTestId('range-selector')).toBeDefined();
  });

  it('calls startStep when Start button clicked', () => {
    render(<AutoModeControl onStart={mockStartStep} />);
    const button = screen.getByRole('button', { name: /開始生成/i });
    fireEvent.click(button);
    expect(mockStartStep).toHaveBeenCalled();
  });

  it('renders dynamic full auto chapter description', () => {
    render(<AutoModeControl onStart={mockStartStep} />);
    expect(screen.getByText('自動完成第 2-7 章')).toBeDefined();
  });
});

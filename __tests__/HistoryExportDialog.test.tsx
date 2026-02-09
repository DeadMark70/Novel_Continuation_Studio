import { render, screen, fireEvent } from '@testing-library/react';
import { type ChangeEvent, type ReactNode } from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { HistoryExportDialog } from '../components/workflow/HistoryExportDialog';
import { useNovelStore } from '../store/useNovelStore';

vi.mock('../store/useNovelStore', () => ({
  useNovelStore: vi.fn(),
}));

vi.mock('../lib/utils', () => ({
  downloadAsTxt: vi.fn(),
  cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
}));

type WithChildren = { children?: ReactNode };
type DialogProps = WithChildren & { open?: boolean; onOpenChange?: (open: boolean) => void };
type ButtonProps = WithChildren & { onClick?: () => void; className?: string };
type TabsContentProps = WithChildren & { value?: string };
type SelectProps = WithChildren & {
  value?: string;
  onValueChange?: (value: string) => void;
};
type SelectItemProps = WithChildren & { value: string };

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: DialogProps) => <div data-testid="dialog-root">{children}</div>,
  DialogTrigger: ({ children }: WithChildren) => <div data-testid="dialog-trigger">{children}</div>,
  DialogContent: ({ children }: WithChildren) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: WithChildren) => <div>{children}</div>,
  DialogTitle: ({ children }: WithChildren) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: ButtonProps) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: WithChildren) => <div>{children}</div>,
  TabsList: ({ children }: WithChildren) => <div>{children}</div>,
  TabsTrigger: ({ children }: WithChildren) => <button>{children}</button>,
  TabsContent: ({ children, value }: TabsContentProps) => (value === 'export' ? <div>{children}</div> : null),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: SelectProps) => (
    <select
      data-testid="select-root"
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: WithChildren) => <>{children}</>,
  SelectItem: ({ children, value }: SelectItemProps) => <option value={value}>{children}</option>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: WithChildren) => <div>{children}</div>,
  CardHeader: ({ children }: WithChildren) => <div>{children}</div>,
  CardTitle: ({ children }: WithChildren) => <div>{children}</div>,
  CardDescription: ({ children }: WithChildren) => <div>{children}</div>,
  CardContent: ({ children }: WithChildren) => <div>{children}</div>,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: WithChildren) => <label>{children}</label>,
}));

vi.mock('../components/workflow/VersionList', () => ({
  VersionList: () => <div>VersionList</div>,
}));

vi.mock('../components/workflow/ReadingRoom', () => ({
  ReadingRoom: () => <div>ReadingRoom</div>,
}));

type Session = {
  sessionId: string;
  sessionName: string;
  content: string;
  chapters: string[];
  wordCount: number;
  currentStep: number;
};

type NovelStoreSlice = {
  sessions: Session[];
  currentSessionId: string;
  originalNovel: string;
  chapters: string[];
};

const useNovelStoreMock = useNovelStore as unknown as ReturnType<typeof vi.fn>;

describe('HistoryExportDialog', () => {
  const mockSessions: Session[] = [
    {
      sessionId: 'session-1',
      sessionName: 'Session 1',
      content: 'Original 1',
      chapters: ['C1-1', 'C1-2'],
      wordCount: 100,
      currentStep: 5,
    },
    {
      sessionId: 'session-2',
      sessionName: 'Session 2',
      content: 'Original 2',
      chapters: ['C2-1'],
      wordCount: 50,
      currentStep: 5,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    const state: NovelStoreSlice = {
      sessions: mockSessions,
      currentSessionId: 'session-1',
      originalNovel: 'Original 1',
      chapters: ['C1-1', 'C1-2'],
    };

    useNovelStoreMock.mockImplementation((selector?: (value: NovelStoreSlice) => unknown) => {
      return selector ? selector(state) : state;
    });
  });

  it('renders correctly and allows session selection', () => {
    render(<HistoryExportDialog />);

    expect(screen.getByText(/Export Protocol/i)).toBeDefined();
    expect(screen.getByText(/Select Session to Export/i)).toBeDefined();
    expect(screen.getByTestId('select-root')).toBeDefined();
  });

  it('displays the correct stats for the default session', () => {
    render(<HistoryExportDialog />);

    expect(screen.getByText(/Original Novel \(100 chars\)/i)).toBeDefined();
    expect(screen.getByText(/All Generated Chapters \(2\)/i)).toBeDefined();
  });

  it('updates stats when a different session is selected', () => {
    render(<HistoryExportDialog />);

    fireEvent.change(screen.getByTestId('select-root'), { target: { value: 'session-2' } });

    expect(screen.getByText(/Original Novel \(50 chars\)/i)).toBeDefined();
    expect(screen.getByText(/All Generated Chapters \(1\)/i)).toBeDefined();
  });
});

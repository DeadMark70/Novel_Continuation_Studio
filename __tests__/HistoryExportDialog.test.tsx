import { render, screen, fireEvent } from '@testing-library/react';
import { HistoryExportDialog } from '../components/workflow/HistoryExportDialog';
import { useNovelStore } from '../store/useNovelStore';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the store
vi.mock('../store/useNovelStore', () => ({
  useNovelStore: vi.fn(),
}));

// Mock utils
vi.mock('../lib/utils', () => ({
  downloadAsTxt: vi.fn(),
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Mock UI components directly
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div data-testid="dialog-root">{children}</div>,
  DialogTrigger: ({ children }: any) => <div data-testid="dialog-trigger">{children}</div>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <button>{children}</button>,
  TabsContent: ({ children, value }: any) => value === 'export' ? <div>{children}</div> : null,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select data-testid="select-root" value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

// Mock sub-components
vi.mock('./VersionList', () => ({ VersionList: () => <div>VersionList</div> }));
vi.mock('./ReadingRoom', () => ({ ReadingRoom: () => <div>ReadingRoom</div> }));

describe('HistoryExportDialog', () => {
  const mockSessions = [
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
    (useNovelStore as any).mockReturnValue({
      sessions: mockSessions,
      currentSessionId: 'session-1',
      originalNovel: 'Original 1',
      chapters: ['C1-1', 'C1-2'],
    });
  });

  it('renders correctly and allows session selection', () => {
    render(<HistoryExportDialog />);
    
    // In our simplified mock, children are always rendered but might be hidden by CSS in real app
    // For testing the logic, we check if the content is there
    expect(screen.getByText(/Export Protocol/i)).toBeDefined();
    expect(screen.getByText(/Select Session to Export/i)).toBeDefined();
    
    const select = screen.getByTestId('select-root');
    expect(select).toBeDefined();
  });

  it('displays the correct stats for the default session', () => {
    render(<HistoryExportDialog />);

    expect(screen.getByText(/Original Novel \(100 chars\)/i)).toBeDefined();
    expect(screen.getByText(/All Generated Chapters \(2\)/i)).toBeDefined();
  });

  it('updates stats when a different session is selected', () => {
    render(<HistoryExportDialog />);

    const select = screen.getByTestId('select-root');
    fireEvent.change(select, { target: { value: 'session-2' } });

    expect(screen.getByText(/Original Novel \(50 chars\)/i)).toBeDefined();
    expect(screen.getByText(/All Generated Chapters \(1\)/i)).toBeDefined();
  });
});

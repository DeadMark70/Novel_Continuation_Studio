import { render, screen, fireEvent } from '@testing-library/react';
import { VersionList } from '../components/workflow/VersionList';
import { useNovelStore } from '../store/useNovelStore';
import { vi } from 'vitest';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Clock: () => <div data-testid="clock-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  CheckCircle: () => <div data-testid="check-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  XIcon: () => <div data-testid="x-icon" />,
}));

describe('VersionList', () => {
  const mockSessions = [
    {
      id: 2,
      sessionId: 'session_2',
      sessionName: 'Novel 2',
      content: 'Content 2',
      wordCount: 1000,
      currentStep: 2,
      analysis: '',
      outline: '',
      outlineDirection: '',
      breakdown: '',
      chapters: ['Chapter 1'],
      updatedAt: 1700000000000,
      createdAt: 1700000000000
    },
    {
      id: 1,
      sessionId: 'session_1',
      sessionName: 'Novel 1',
      content: 'Content 1',
      wordCount: 500,
      currentStep: 1,
      analysis: '',
      outline: '',
      outlineDirection: '',
      breakdown: '',
      chapters: [],
      updatedAt: 1600000000000,
      createdAt: 1600000000000
    }
  ];

  const mockLoadSession = vi.fn();
  const mockDeleteSessionById = vi.fn();

  beforeEach(() => {
    mockLoadSession.mockClear();
    mockDeleteSessionById.mockClear();
    
    // Setup store mock
    useNovelStore.setState({
      sessions: mockSessions,
      currentSessionId: 'session_1',
      loadSession: mockLoadSession,
      deleteSessionById: mockDeleteSessionById
    });
  });

  it('renders a list of sessions', () => {
    render(<VersionList />);
    
    expect(screen.getByText('Novel 2')).toBeDefined();
    expect(screen.getByText('Novel 1')).toBeDefined();
    expect(screen.getByText('1 章')).toBeDefined(); // For session 2
    expect(screen.getByText('0 章')).toBeDefined(); // For session 1
  });

  it('highlights the current session', () => {
    render(<VersionList />);
    // Session 1 is active, should show check icon
    expect(screen.getAllByTestId('check-icon')).toHaveLength(1);
    // Session 2 is inactive, should show file text icon
    expect(screen.getAllByTestId('file-text-icon')).toHaveLength(1);
  });

  it('calls loadSession when clicking an inactive session', () => {
    render(<VersionList />);

    fireEvent.click(screen.getByRole('button', { name: /載入創作：Novel 2/i }));
    
    expect(mockLoadSession).toHaveBeenCalledWith('session_2');
  });

  it('calls deleteSessionById when clicking delete button', () => {
    render(<VersionList />);
    
    const deleteButtons = screen.getAllByTestId('trash-icon');
    fireEvent.click(deleteButtons[0].closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: /確認刪除/i }));

    expect(mockDeleteSessionById).toHaveBeenCalledWith('session_2');
  });
});

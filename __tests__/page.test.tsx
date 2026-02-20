import { render, screen } from '@testing-library/react';
import Home from '../app/page';
import { vi } from 'vitest';

// Mock child components to focus on page assembly
vi.mock('@/components/StoryUpload', () => ({
  StoryUpload: () => <div data-testid="story-upload" />
}));

vi.mock('@/components/NovelStats', () => ({
  NovelStats: () => <div data-testid="novel-stats" />
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Terminal: () => <div />,
  ShieldAlert: () => <div />,
  Settings: () => <div data-testid="settings-icon" />,
  History: () => <div />,
  BookOpen: () => <div />,
  Download: () => <div />,
  FileText: () => <div />,
  Clock: () => <div />,
  Hash: () => <div />,
  Save: () => <div />,
  RotateCcw: () => <div />,
  X: () => <div />, // Used by Dialog
  XIcon: () => <div />, // Legacy alias
  Circle: () => <div />,
  CheckCircle2: () => <div />,
  AlertCircle: () => <div />,
  Loader2: () => <div />,
  ChevronDown: () => <div />, // Used by Accordion
  ChevronDownIcon: () => <div />,
  Play: () => <div />,
  StopCircle: () => <div />,
  RefreshCw: () => <div />,
  Repeat: () => <div />,
  FastForward: () => <div />,
  Plus: () => <div />,
  Library: () => <div />,
}));

describe('Home Page', () => {
  it('renders components and layout', () => {
    render(<Home />);
    expect(screen.getByText(/Novel Continuation/i)).toBeDefined();
    expect(screen.getByTestId('story-upload')).toBeDefined();
    expect(screen.getByTestId('novel-stats')).toBeDefined();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { VersionList } from '../components/workflow/VersionList';
import { useNovelStore } from '../store/useNovelStore';
import { vi } from 'vitest';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  History: () => <div data-testid="history-icon" />,
  RotateCcw: () => <div data-testid="rotate-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Hash: () => <div data-testid="hash-icon" />,
}));

describe('VersionList', () => {
  const mockHistory = [
    {
      id: 2,
      content: 'Version 2 content',
      wordCount: 17,
      currentStep: 2,
      analysis: 'Analysis 2',
      outline: 'Outline 2',
      outlineDirection: '',
      breakdown: '',
      chapters: [],
      updatedAt: 1700000000000,
    },
    {
      id: 1,
      content: 'Version 1 content',
      wordCount: 17,
      currentStep: 1,
      analysis: 'Analysis 1',
      outline: '',
      outlineDirection: '',
      breakdown: '',
      chapters: [],
      updatedAt: 1600000000000,
    }
  ];

  it('renders a list of versions from the store', () => {
    useNovelStore.setState({ history: mockHistory });
    render(<VersionList />);
    
    expect(screen.getByText(/Version 2/i)).toBeDefined();
    expect(screen.getByText(/Version 1/i)).toBeDefined();
    expect(screen.getByText(/Step 2/i)).toBeDefined();
    expect(screen.getByText(/Step 1/i)).toBeDefined();
  });

  it('calls rollbackToVersion when rollback button is clicked', () => {
    const rollbackSpy = vi.fn();
    useNovelStore.setState({ 
      history: mockHistory,
      rollbackToVersion: rollbackSpy 
    });
    
    render(<VersionList />);
    
    const rollbackButtons = screen.getAllByRole('button', { name: /rollback/i });
    fireEvent.click(rollbackButtons[0]);
    
    expect(rollbackSpy).toHaveBeenCalledWith(mockHistory[0]);
  });
});

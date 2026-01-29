import { render, screen } from '@testing-library/react';
import { NovelStats } from '../components/NovelStats';
import { useNovelStore } from '../store/useNovelStore';
import { vi } from 'vitest';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Hash: () => <div data-testid="hash-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
}));

describe('NovelStats', () => {
  it('displays correct word count', () => {
    useNovelStore.setState({ wordCount: 1500 });
    render(<NovelStats />);
    expect(screen.getByText('1,500')).toBeDefined();
    // 1500 / 500 = 3 mins
    expect(screen.getByText(/3/)).toBeDefined();
    expect(screen.getByText('READY')).toBeDefined();
  });

  it('displays WAITING status when word count is 0', () => {
    useNovelStore.setState({ wordCount: 0 });
    render(<NovelStats />);
    expect(screen.getByText('WAITING')).toBeDefined();
    // Multiple 0s expected (count and time)
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });
});
import { render, screen } from '@testing-library/react';
import { ReadingRoom } from '../components/workflow/ReadingRoom';
import { useNovelStore } from '../store/useNovelStore';

describe('ReadingRoom', () => {
  it('renders original novel and chapters', () => {
    useNovelStore.setState({
      originalNovel: 'Original content',
      chapters: ['Chapter 1 content', 'Chapter 2 content']
    });

    render(<ReadingRoom />);
    
    expect(screen.getByText('Original Novel')).toBeDefined();
    expect(screen.getByText('Original content')).toBeDefined();
    expect(screen.getByText('Generated Chapters')).toBeDefined();
    expect(screen.getByText('Chapter 1 content')).toBeDefined();
    expect(screen.getByText('Chapter 2 content')).toBeDefined();
    expect(screen.getAllByText(/Chapter 1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Chapter 2/i).length).toBeGreaterThan(0);
  });

  it('displays empty state when no content', () => {
    useNovelStore.setState({
      originalNovel: '',
      chapters: []
    });

    render(<ReadingRoom />);
    
    expect(screen.getByText(/No original content uploaded/i)).toBeDefined();
    expect(screen.getByText(/No chapters generated yet/i)).toBeDefined();
  });
});

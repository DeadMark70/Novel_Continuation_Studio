import { fireEvent, render, screen } from '@testing-library/react';
import { ReadingRoom } from '../components/workflow/ReadingRoom';
import { useNovelStore } from '../store/useNovelStore';

describe('ReadingRoom', () => {
  it('renders reading index and lets user switch chapters', () => {
    useNovelStore.setState({
      originalNovel: 'Original content',
      chapters: ['Chapter 1 content', 'Chapter 2 content']
    });

    render(<ReadingRoom />);

    expect(screen.getByText('Reading Index')).toBeDefined();
    expect(screen.getByText('Original content')).toBeDefined();
    fireEvent.click(screen.getAllByText(/Chapter 2/i)[0]);
    expect(screen.getByText('Chapter 2 content')).toBeDefined();
  });

  it('displays empty state when no content', () => {
    useNovelStore.setState({
      originalNovel: '',
      chapters: []
    });

    render(<ReadingRoom />);

    expect(screen.getByText(/No original content uploaded/i)).toBeDefined();
  });
});

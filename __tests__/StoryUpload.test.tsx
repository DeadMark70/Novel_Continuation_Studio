import { render, screen, fireEvent } from '@testing-library/react';
import { StoryUpload } from '../components/StoryUpload';
import { useNovelStore } from '../store/useNovelStore';
import { vi } from 'vitest';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Upload: () => <div data-testid="upload-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Eraser: () => <div data-testid="eraser-icon" />,
  XIcon: () => <div data-testid="x-icon" />,
}));

describe('StoryUpload', () => {
  it('renders correctly', () => {
    render(<StoryUpload />);
    expect(screen.getByPlaceholderText(/Paste your story here/i)).toBeDefined();
    expect(screen.getByText(/Upload TXT/i)).toBeDefined();
  });

  it('updates store on text change', () => {
    render(<StoryUpload />);
    const textarea = screen.getByPlaceholderText(/Paste your story here/i);
    fireEvent.change(textarea, { target: { value: 'New story content' } });
    
    expect(useNovelStore.getState().originalNovel).toBe('New story content');
  });

  it('triggers reset on clear button click', () => {
    useNovelStore.setState({ originalNovel: 'some text' });
    render(<StoryUpload />);
    const clearButton = screen.getByText(/Clear/i);
    fireEvent.click(clearButton);
    const confirmButton = screen.getByRole('button', { name: /^clear$/i });
    fireEvent.click(confirmButton);
    
    expect(useNovelStore.getState().originalNovel).toBe('');
  });

  it('shows invalid file type dialog for non-txt file', () => {
    render(<StoryUpload />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['abc'], 'invalid.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/invalid file type/i)).toBeDefined();
  });
});

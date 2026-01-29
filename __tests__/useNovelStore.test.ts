import { useNovelStore } from '../store/useNovelStore';
import { act } from '@testing-library/react';

describe('useNovelStore', () => {
  beforeEach(() => {
    act(() => {
      useNovelStore.getState().reset();
    });
  });

  it('should initialize with default values', () => {
    const state = useNovelStore.getState();
    expect(state.originalNovel).toBe('');
    expect(state.wordCount).toBe(0);
    expect(state.currentStep).toBe(1);
  });

  it('should set novel and update word count', () => {
    act(() => {
      useNovelStore.getState().setNovel('Hello World');
    });
    const state = useNovelStore.getState();
    expect(state.originalNovel).toBe('Hello World');
    expect(state.wordCount).toBe(11);
  });

  it('should reset state', () => {
    act(() => {
      useNovelStore.getState().setNovel('Test');
      useNovelStore.getState().setStep(3);
      useNovelStore.getState().reset();
    });
    const state = useNovelStore.getState();
    expect(state.originalNovel).toBe('');
    expect(state.currentStep).toBe(1);
  });
});

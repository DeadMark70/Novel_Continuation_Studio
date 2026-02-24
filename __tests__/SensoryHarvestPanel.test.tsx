import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SensoryHarvestPanel } from '../components/sensory/SensoryHarvestPanel';
import { useNovelStore } from '../store/useNovelStore';
import { useHarvestStore } from '../store/useHarvestStore';
import { useUiStore } from '../store/useUiStore';

describe('SensoryHarvestPanel', () => {
  beforeEach(() => {
    useNovelStore.setState({
      ...useNovelStore.getInitialState(),
      originalNovel: '',
    });
    useHarvestStore.setState(useHarvestStore.getInitialState());
    useUiStore.setState({
      isSensoryVaultOpen: false,
      activeSettingsPhase: 'compression',
    });
  });

  it('disables start harvest when novel text is empty', () => {
    render(<SensoryHarvestPanel />);
    const button = screen.getByRole('button', { name: /start harvest/i });
    expect(button.getAttribute('disabled')).not.toBeNull();
  });

  it('enables start harvest when novel text exists', () => {
    useNovelStore.setState({ originalNovel: 'novel text exists' });
    render(<SensoryHarvestPanel />);
    const button = screen.getByRole('button', { name: /start harvest/i });
    expect(button.getAttribute('disabled')).toBeNull();
  });

  it('toggles sensory vault from panel action', () => {
    render(<SensoryHarvestPanel />);
    const openButton = screen.getByRole('button', { name: /open vault/i });
    fireEvent.click(openButton);
    expect(useUiStore.getState().isSensoryVaultOpen).toBe(true);
  });
});

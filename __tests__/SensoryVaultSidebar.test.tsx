import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SensoryVaultSidebar } from '../components/sensory/SensoryVaultSidebar';
import { useUiStore } from '../store/useUiStore';
import { useSettingsStore } from '../store/useSettingsStore';

describe('SensoryVaultSidebar', () => {
  beforeEach(() => {
    useUiStore.setState({
      isSensoryVaultOpen: false,
      activeSettingsPhase: 'compression',
    });
    useSettingsStore.setState({
      ...useSettingsStore.getInitialState(),
    });
  });

  it('opens and closes via explicit controls', () => {
    render(<SensoryVaultSidebar />);
    fireEvent.click(screen.getByRole('button', { name: /sensory vault/i }));
    expect(useUiStore.getState().isSensoryVaultOpen).toBe(true);
    expect(screen.getByText(/Core sensory template library/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /close sensory vault/i }));
    expect(useUiStore.getState().isSensoryVaultOpen).toBe(false);
  });
});

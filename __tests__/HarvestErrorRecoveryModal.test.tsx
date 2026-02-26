import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HarvestErrorRecoveryModal } from '../components/sensory/HarvestErrorRecoveryModal';

const pushMock = vi.fn();
const setShowErrorDialogMock = vi.fn();
const applyManualJsonAndParseMock = vi.fn();

const harvestState = {
  showErrorDialog: true,
  error: 'JSON parse failed: unexpected token',
  rawOutput: '{"broken": true',
  setShowErrorDialog: setShowErrorDialogMock,
  applyManualJsonAndParse: applyManualJsonAndParseMock,
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('../store/useHarvestStore', () => {
  const useHarvestStore = ((selector?: (state: typeof harvestState) => unknown) => (
    selector ? selector(harvestState) : harvestState
  )) as typeof harvestState & ((selector?: (state: typeof harvestState) => unknown) => unknown);
  return { useHarvestStore };
});

describe('HarvestErrorRecoveryModal', () => {
  beforeEach(() => {
    pushMock.mockReset();
    setShowErrorDialogMock.mockReset();
    applyManualJsonAndParseMock.mockReset();
    harvestState.showErrorDialog = true;
    harvestState.error = 'JSON parse failed: unexpected token';
    harvestState.rawOutput = '{"broken": true';
  });

  it('renders with bounded dialog height and sticky footer actions', () => {
    render(<HarvestErrorRecoveryModal />);

    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('max-h-[85vh]');

    expect(screen.getByRole('button', { name: 'Go To Settings' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Parse Corrected JSON' })).toBeTruthy();
    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    expect(closeButtons.length).toBeGreaterThan(0);
  });

  it('passes edited JSON text to manual parser', () => {
    render(<HarvestErrorRecoveryModal />);

    const textarea = screen.getByPlaceholderText('Paste and fix harvest JSON output here...');
    fireEvent.change(textarea, { target: { value: '{"fixed": true}' } });

    fireEvent.click(screen.getByRole('button', { name: 'Parse Corrected JSON' }));
    expect(applyManualJsonAndParseMock).toHaveBeenCalledWith('{"fixed": true}');
  });

  it('routes to settings and closes dialog via actions', () => {
    render(<HarvestErrorRecoveryModal />);

    fireEvent.click(screen.getByRole('button', { name: 'Go To Settings' }));
    expect(pushMock).toHaveBeenCalledWith('/settings');

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    const footerClose = closeButtons.find((button) => button.getAttribute('data-slot') === 'button');
    expect(footerClose).toBeTruthy();
    fireEvent.click(footerClose!);
    expect(setShowErrorDialogMock).toHaveBeenCalledWith(false);
  });
});

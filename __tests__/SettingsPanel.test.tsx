import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsPanel } from '../components/SettingsPanel';
import { useSettingsStore } from '../store/useSettingsStore';

// Mock the store
vi.mock('../store/useSettingsStore', () => ({
  useSettingsStore: vi.fn(),
}));

describe('SettingsPanel', () => {
  const mockStore = {
    apiKey: 'test-key',
    selectedModel: 'test-model',
    recentModels: [],
    customPrompts: {},
    truncationThreshold: 799,
    dualEndBuffer: 500,
    compressionMode: 'auto' as const,
    compressionAutoThreshold: 20000,
    compressionChunkSize: 6000,
    compressionChunkOverlap: 400,
    compressionEvidenceSegments: 10,
    thinkingEnabled: false,
    modelCapabilities: {},
    setApiKey: vi.fn(),
    setSelectedModel: vi.fn(),
    setCustomPrompt: vi.fn(),
    setThinkingEnabled: vi.fn(),
    upsertModelCapability: vi.fn(),
    probeModelCapability: vi.fn().mockResolvedValue({
      chatSupported: true,
      thinkingSupported: 'supported',
      checkedAt: Date.now(),
      source: 'probe'
    }),
    resetPrompt: vi.fn(),
    initialize: vi.fn(),
    updateContextSettings: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.mocked(useSettingsStore).mockReturnValue(mockStore);
    vi.clearAllMocks();
  });

  it('renders correctly and shows the Context tab', async () => {
    render(<SettingsPanel />);
    
    // Open dialog
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    
    expect(screen.getByText('Context')).toBeDefined();
  });

  it('updates context settings locally and saves on Save', async () => {
    render(<SettingsPanel />);
    
    // Open dialog
    fireEvent.click(screen.getByRole('button'));
    
    // Click Context tab
    fireEvent.click(screen.getByText('Context'));
    
    const thresholdInput = await screen.findByTestId('threshold-input');
    const bufferInput = await screen.findByTestId('buffer-input');
    
    fireEvent.change(thresholdInput, { target: { value: '1200' } });
    fireEvent.change(bufferInput, { target: { value: '600' } });
    
    // Click Save
    fireEvent.click(screen.getByText(/Save Configuration/i));
    
    await waitFor(() => {
      expect(mockStore.updateContextSettings).toHaveBeenCalledWith({
        truncationThreshold: 1200,
        dualEndBuffer: 600,
        compressionMode: 'auto',
        compressionAutoThreshold: 20000,
        compressionChunkSize: 6000,
        compressionChunkOverlap: 400,
        compressionEvidenceSegments: 10,
      });
    });
  });
});

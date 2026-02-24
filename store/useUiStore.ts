import { create } from 'zustand';
import type { GenerationPhaseId } from '@/lib/llm-types';

interface UiState {
  isSensoryVaultOpen: boolean;
  activeSettingsPhase: GenerationPhaseId;
  openSensoryVault: () => void;
  closeSensoryVault: () => void;
  toggleSensoryVault: () => void;
  setActiveSettingsPhase: (phase: GenerationPhaseId) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSensoryVaultOpen: false,
  activeSettingsPhase: 'compression',
  openSensoryVault: () => set({ isSensoryVaultOpen: true }),
  closeSensoryVault: () => set({ isSensoryVaultOpen: false }),
  toggleSensoryVault: () => set((state) => ({ isSensoryVaultOpen: !state.isSensoryVaultOpen })),
  setActiveSettingsPhase: (phase) => set({ activeSettingsPhase: phase }),
}));

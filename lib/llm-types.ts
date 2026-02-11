import type { WorkflowStepId } from '@/store/useWorkflowStore';

export type LLMProvider = 'nim' | 'openrouter';

export interface LLMModel {
  id: string;
  object?: 'model';
  created?: number;
  owned_by?: string;
  name?: string;
  supportedParameters?: string[];
}

export interface ModelCapability {
  chatSupported: boolean;
  thinkingSupported: 'supported' | 'unsupported' | 'unknown';
  reason?: string;
  checkedAt: number;
  source: 'probe' | 'override';
}

export interface GenerationParams {
  maxTokens: number;
  temperature: number;
  topP: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  seed?: number;
  thinkingEnabled: boolean;
  thinkingBudget?: number;
}

export interface GenerateOptions extends Partial<GenerationParams> {
  enableThinking?: boolean;
  thinkingSupported?: boolean;
  timeout?: number;
  inactivityTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  retryableErrors?: number[];
  onRetry?: (attempt: number, maxRetries: number, delay: number, error: unknown) => void;
  onError?: (error: unknown, context?: string) => void;
}

export interface ProviderScopedSettings {
  apiKey: string;
  selectedModel: string;
  recentModels: string[];
  modelCapabilities: Record<string, ModelCapability>;
  modelParameterSupport: Record<string, string[]>;
}

export interface PhaseModelSelection {
  provider: LLMProvider;
  model?: string;
}

export type PhaseConfigMap = Record<WorkflowStepId, PhaseModelSelection>;

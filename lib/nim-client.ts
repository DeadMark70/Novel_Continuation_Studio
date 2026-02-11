import {
  fetchModelCapability as fetchProviderModelCapability,
  fetchModels as fetchProviderModels,
  generateStream as generateProviderStream,
} from '@/lib/llm-client';
import type { GenerateOptions, LLMModel, LLMProvider, ModelCapability } from '@/lib/llm-types';

export type NimModel = LLMModel;
export type { ModelCapability, GenerateOptions };
export type { LLMProvider } from '@/lib/llm-types';

export async function fetchModels(apiKey?: string): Promise<NimModel[]> {
  return fetchProviderModels('nim', apiKey);
}

export async function fetchModelsByProvider(
  provider: LLMProvider,
  apiKey?: string
): Promise<NimModel[]> {
  return fetchProviderModels(provider, apiKey);
}

export async function fetchModelCapability(
  model: string,
  apiKey?: string
): Promise<ModelCapability> {
  return fetchProviderModelCapability('nim', model, apiKey);
}

export async function fetchModelCapabilityByProvider(
  provider: LLMProvider,
  model: string,
  apiKey?: string
): Promise<ModelCapability> {
  return fetchProviderModelCapability(provider, model, apiKey);
}

export async function* generateStream(
  prompt: string,
  model: string,
  apiKey: string,
  systemPrompt?: string,
  options?: GenerateOptions,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  yield* generateProviderStream('nim', prompt, model, apiKey, systemPrompt, options, signal);
}

export async function* generateStreamByProvider(
  provider: LLMProvider,
  prompt: string,
  model: string,
  apiKey: string,
  systemPrompt?: string,
  options?: GenerateOptions,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  yield* generateProviderStream(provider, prompt, model, apiKey, systemPrompt, options, signal);
}

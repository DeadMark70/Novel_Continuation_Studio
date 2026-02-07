import { type ModelCapability } from '@/lib/nim-client';

type CapabilityOverride = Omit<ModelCapability, 'checkedAt' | 'source'>;

const MODEL_CAPABILITY_OVERRIDES: Record<string, CapabilityOverride> = {};

export function getModelCapabilityOverride(model: string): ModelCapability | null {
  const override = MODEL_CAPABILITY_OVERRIDES[model];
  if (!override) {
    return null;
  }

  return {
    ...override,
    checkedAt: Date.now(),
    source: 'override',
  };
}

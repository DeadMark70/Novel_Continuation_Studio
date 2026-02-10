import type { CompressionMode } from './compression';
import { shouldRunCompression } from './compression';

export type WorkflowStepModeId =
  | 'compression'
  | 'analysis'
  | 'outline'
  | 'breakdown'
  | 'chapter1'
  | 'continuation';

export interface WorkflowModeInputs {
  stepId: WorkflowStepModeId;
  compressionMode: CompressionMode;
  compressionAutoThreshold: number;
  sourceChars: number;
  compressedContext: string;
}

export interface WorkflowModeResult {
  badge: string;
  detail: string;
  isCompressed: boolean;
}

export function resolveWorkflowMode(inputs: WorkflowModeInputs): WorkflowModeResult {
  const compressionPlanned = shouldRunCompression(
    inputs.compressionMode,
    inputs.sourceChars,
    inputs.compressionAutoThreshold
  );
  const hasCompressedContext = Boolean((inputs.compressedContext || '').trim());

  if (inputs.stepId === 'compression') {
    if (inputs.compressionMode === 'on') {
      return {
        badge: 'ON',
        detail: 'Compression forced on',
        isCompressed: true,
      };
    }
    if (inputs.compressionMode === 'off') {
      return {
        badge: 'OFF',
        detail: 'Compression disabled',
        isCompressed: false,
      };
    }
    return compressionPlanned
      ? {
          badge: 'AUTO-RUN',
          detail: `Auto mode: ${inputs.sourceChars} > ${inputs.compressionAutoThreshold}`,
          isCompressed: true,
        }
      : {
          badge: 'AUTO-SKIP',
          detail: `Auto mode: ${inputs.sourceChars} <= ${inputs.compressionAutoThreshold}`,
          isCompressed: false,
        };
  }

  const usesCompressedContext = compressionPlanned && hasCompressedContext;
  return usesCompressedContext
    ? {
        badge: 'COMPRESSED',
        detail: 'Prompt routes to compressed context',
        isCompressed: true,
      }
    : {
        badge: 'RAW',
        detail: 'Prompt routes to original novel',
        isCompressed: false,
      };
}

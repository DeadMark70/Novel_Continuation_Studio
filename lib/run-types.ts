export type RunStatus = 'idle' | 'queued' | 'running' | 'error' | 'interrupted';

export type RunStepId =
  | 'compression'
  | 'analysis'
  | 'outline'
  | 'breakdown'
  | 'chapter1'
  | 'continuation';

export interface PersistedRunMeta {
  runStatus?: RunStatus;
  recoverableStepId?: RunStepId;
  lastRunAt?: number;
  lastRunError?: string;
  lastRunId?: string;
}

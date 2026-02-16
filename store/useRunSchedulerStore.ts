import { create } from 'zustand';
import type { AutoContinuationPolicy, RunStatus, RunStepId } from '@/lib/run-types';

type RunSource = 'manual' | 'auto';

export interface SessionRunState {
  sessionId: string;
  status: RunStatus;
  activeStepId?: RunStepId;
  queuedAt?: number;
  startedAt?: number;
  progressPreview?: string;
  lastError?: string;
  runId?: string;
}

interface RunTask {
  runId: string;
  sessionId: string;
  stepId: RunStepId;
  userNotes?: string;
  source: RunSource;
  continuationPolicy?: AutoContinuationPolicy;
  queuedAt: number;
}

interface ActiveRun {
  runId: string;
  sessionId: string;
  stepId: RunStepId;
  startedAt: number;
  abortController: AbortController;
}

interface RunExecutorContext {
  runId: string;
  sessionId: string;
  stepId: RunStepId;
  userNotes?: string;
  source: RunSource;
  continuationPolicy?: AutoContinuationPolicy;
  signal: AbortSignal;
  onProgress: (preview: string) => void;
}

type RunExecutor = (context: RunExecutorContext) => Promise<void>;

interface RunSchedulerState {
  maxConcurrentRuns: number;
  queue: RunTask[];
  activeRuns: Record<string, ActiveRun>;
  sessionStates: Record<string, SessionRunState>;
  isDispatching: boolean;
  runExecutor: RunExecutor | null;

  setRunExecutor: (executor: RunExecutor) => void;
  setMaxConcurrentRuns: (value: number) => void;
  enqueueRun: (input: {
    sessionId: string;
    stepId: RunStepId;
    userNotes?: string;
    source?: RunSource;
    continuationPolicy?: AutoContinuationPolicy;
    allowWhileRunning?: boolean;
  }) => string | null;
  cancelSession: (sessionId: string) => void;
  cancelAll: () => void;
  markInterrupted: (sessionId: string, message: string) => void;
  getSessionRunState: (sessionId: string) => SessionRunState | undefined;
  drainQueue: () => Promise<void>;
  clearSessionState: (sessionId: string) => void;
}

function createRunId(sessionId: string): string {
  return `run_${sessionId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useRunSchedulerStore = create<RunSchedulerState>((set, get) => ({
  maxConcurrentRuns: 4,
  queue: [],
  activeRuns: {},
  sessionStates: {},
  isDispatching: false,
  runExecutor: null,

  setRunExecutor: (executor) => {
    set({ runExecutor: executor });
  },

  setMaxConcurrentRuns: (value) => {
    set({ maxConcurrentRuns: Math.max(1, Math.floor(value)) });
    void get().drainQueue();
  },

  enqueueRun: ({
    sessionId,
    stepId,
    userNotes,
    source = 'manual',
    continuationPolicy,
    allowWhileRunning = false,
  }) => {
    if (!sessionId) {
      return null;
    }
    const state = get();
    if (!state.runExecutor) {
      return null;
    }
    if (state.activeRuns[sessionId] && !allowWhileRunning) {
      return null;
    }
    const queuedForSession = state.queue.some((task) => task.sessionId === sessionId);
    if (queuedForSession) {
      return null;
    }

    const runId = createRunId(sessionId);
    const queuedAt = Date.now();
    const task: RunTask = {
      runId,
      sessionId,
      stepId,
      userNotes,
      source,
      continuationPolicy,
      queuedAt,
    };

    set((prev) => ({
      queue: [...prev.queue, task],
      sessionStates: {
        ...prev.sessionStates,
        [sessionId]: {
          sessionId,
          status: 'queued',
          activeStepId: stepId,
          queuedAt,
          runId,
        },
      },
    }));

    void get().drainQueue();
    return runId;
  },

  cancelSession: (sessionId) => {
    const active = get().activeRuns[sessionId];
    if (active) {
      active.abortController.abort();
    }
    set((state) => ({
      queue: state.queue.filter((task) => task.sessionId !== sessionId),
      sessionStates: {
        ...state.sessionStates,
        [sessionId]: {
          sessionId,
          status: 'interrupted',
          activeStepId: state.sessionStates[sessionId]?.activeStepId,
          runId: state.sessionStates[sessionId]?.runId,
          lastError: 'Cancelled by user.',
        },
      },
    }));
  },

  cancelAll: () => {
    const activeRuns = get().activeRuns;
    for (const active of Object.values(activeRuns)) {
      active.abortController.abort();
    }
    set((state) => ({
      queue: [],
      sessionStates: Object.fromEntries(
        Object.keys(state.sessionStates).map((sessionId) => [
          sessionId,
          {
            sessionId,
            status: 'interrupted' as RunStatus,
            activeStepId: state.sessionStates[sessionId]?.activeStepId,
            runId: state.sessionStates[sessionId]?.runId,
            lastError: 'Cancelled by user.',
          },
        ])
      ),
    }));
  },

  markInterrupted: (sessionId, message) => {
    set((state) => ({
      sessionStates: {
        ...state.sessionStates,
        [sessionId]: {
          ...state.sessionStates[sessionId],
          sessionId,
          status: 'interrupted',
          lastError: message,
        },
      },
    }));
  },

  getSessionRunState: (sessionId) => get().sessionStates[sessionId],

  clearSessionState: (sessionId) => {
    set((state) => {
      const nextStates = { ...state.sessionStates };
      delete nextStates[sessionId];
      return { sessionStates: nextStates };
    });
  },

  drainQueue: async () => {
    if (get().isDispatching) {
      return;
    }
    set({ isDispatching: true });

    const launchTask = (task: RunTask) => {
      const abortController = new AbortController();
      set((state) => ({
        activeRuns: {
          ...state.activeRuns,
          [task.sessionId]: {
            runId: task.runId,
            sessionId: task.sessionId,
            stepId: task.stepId,
            startedAt: Date.now(),
            abortController,
          },
        },
        sessionStates: {
          ...state.sessionStates,
          [task.sessionId]: {
            sessionId: task.sessionId,
            status: 'running',
            activeStepId: task.stepId,
            startedAt: Date.now(),
            queuedAt: task.queuedAt,
            runId: task.runId,
            lastError: undefined,
          },
        },
      }));

      void (async () => {
        const executor = get().runExecutor;
        if (!executor) {
          return;
        }
        try {
          await executor({
            runId: task.runId,
            sessionId: task.sessionId,
            stepId: task.stepId,
            userNotes: task.userNotes,
            source: task.source,
            continuationPolicy: task.continuationPolicy,
            signal: abortController.signal,
            onProgress: (preview) => {
              // High-frequency preview updates are intentionally ignored to
              // keep route transitions responsive during concurrent runs.
              void preview;
            },
          });
          set((state) => {
            const current = state.sessionStates[task.sessionId];
            if (!current || current.runId !== task.runId) {
              return {
                activeRuns: Object.fromEntries(
                  Object.entries(state.activeRuns).filter(([sessionId]) => sessionId !== task.sessionId)
                ),
              };
            }
            return {
              activeRuns: Object.fromEntries(
                Object.entries(state.activeRuns).filter(([sessionId]) => sessionId !== task.sessionId)
              ),
              sessionStates: {
                ...state.sessionStates,
                [task.sessionId]: {
                  ...current,
                  status: 'idle',
                  progressPreview: undefined,
                  queuedAt: undefined,
                  startedAt: undefined,
                },
              },
            };
          });
        } catch (error) {
          const interrupted =
            error instanceof Error &&
            (error.name === 'AbortError' || error.message === 'Request cancelled');
          set((state) => {
            const current = state.sessionStates[task.sessionId];
            return {
              activeRuns: Object.fromEntries(
                Object.entries(state.activeRuns).filter(([sessionId]) => sessionId !== task.sessionId)
              ),
              sessionStates: {
                ...state.sessionStates,
                [task.sessionId]: {
                  ...current,
                  sessionId: task.sessionId,
                  runId: task.runId,
                  activeStepId: task.stepId,
                  status: interrupted ? 'interrupted' : 'error',
                  lastError: error instanceof Error ? error.message : 'Unknown error',
                },
              },
            };
          });
        } finally {
          void get().drainQueue();
        }
      })();
    };

    try {
      const initial = get();
      let availableSlots = Math.max(
        0,
        initial.maxConcurrentRuns - Object.keys(initial.activeRuns).length
      );
      while (true) {
        const state = get();
        if (!state.runExecutor) {
          break;
        }
        if (availableSlots <= 0) {
          break;
        }
        const nextIndex = state.queue.findIndex((task) => !state.activeRuns[task.sessionId]);
        if (nextIndex === -1) {
          break;
        }
        const nextTask = state.queue[nextIndex];
        set((prev) => ({
          queue: prev.queue.filter((task) => task.runId !== nextTask.runId),
        }));
        launchTask(nextTask);
        availableSlots -= 1;
      }
    } finally {
      set({ isDispatching: false });
    }
  },
}));

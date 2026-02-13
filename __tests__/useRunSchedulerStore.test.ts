import { beforeEach, describe, expect, it } from 'vitest';
import { useRunSchedulerStore } from '../store/useRunSchedulerStore';

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('useRunSchedulerStore', () => {
  beforeEach(() => {
    useRunSchedulerStore.setState({
      maxConcurrentRuns: 4,
      queue: [],
      activeRuns: {},
      sessionStates: {},
      isDispatching: false,
      runExecutor: null,
    });
  });

  it('enforces single active run per session', async () => {
    useRunSchedulerStore.getState().setRunExecutor(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    const runA = useRunSchedulerStore.getState().enqueueRun({
      sessionId: 's1',
      stepId: 'analysis',
    });
    const runB = useRunSchedulerStore.getState().enqueueRun({
      sessionId: 's1',
      stepId: 'outline',
    });

    expect(runA).toBeTruthy();
    expect(runB).toBeNull();
    await flush();
  });

  it('queues overflow and starts next run after active completes', async () => {
    useRunSchedulerStore.getState().setMaxConcurrentRuns(1);

    let releaseFirst: (() => void) | undefined;
    const firstDone = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    useRunSchedulerStore.getState().setRunExecutor(async ({ sessionId }) => {
      if (sessionId === 's1') {
        await firstDone;
      }
    });

    useRunSchedulerStore.getState().enqueueRun({
      sessionId: 's1',
      stepId: 'analysis',
    });
    useRunSchedulerStore.getState().enqueueRun({
      sessionId: 's2',
      stepId: 'compression',
    });

    await flush();
    let state = useRunSchedulerStore.getState();
    expect(state.sessionStates.s1 || state.sessionStates.s2).toBeTruthy();

    if (releaseFirst) {
      releaseFirst();
    }
    await flush();
    await flush();

    state = useRunSchedulerStore.getState();
    expect(state.activeRuns.s1).toBeUndefined();
    expect(state.activeRuns.s2).toBeUndefined();
    expect(state.queue.length).toBe(0);
  });

  it('cancels queued/running session and marks interrupted', async () => {
    useRunSchedulerStore.getState().setRunExecutor(async ({ signal }) => {
      await new Promise<void>((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('Request cancelled')), { once: true });
      });
    });

    useRunSchedulerStore.getState().enqueueRun({
      sessionId: 's1',
      stepId: 'continuation',
    });

    await flush();
    useRunSchedulerStore.getState().cancelSession('s1');
    await flush();

    const state = useRunSchedulerStore.getState();
    expect(state.sessionStates.s1?.status).toBe('interrupted');
  });
});

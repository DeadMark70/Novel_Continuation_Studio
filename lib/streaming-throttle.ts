type ThrottledUpdaterOptions = {
  intervalMs: number;
  onUpdate: (value: string) => void;
};

export type ThrottledUpdater = {
  push: (value: string) => void;
  flush: () => void;
  cancel: () => void;
};

export function createThrottledUpdater(options: ThrottledUpdaterOptions): ThrottledUpdater {
  const intervalMs = Math.max(0, Math.floor(options.intervalMs));
  let lastSentAt = 0;
  let queuedValue: string | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const emit = (value: string) => {
    lastSentAt = Date.now();
    options.onUpdate(value);
  };

  const flush = () => {
    clearTimer();
    if (queuedValue !== null) {
      emit(queuedValue);
      queuedValue = null;
    }
  };

  const scheduleFlush = (delayMs: number) => {
    clearTimer();
    timeoutId = setTimeout(() => {
      flush();
    }, Math.max(0, delayMs));
  };

  const push = (value: string) => {
    if (intervalMs === 0) {
      emit(value);
      return;
    }

    queuedValue = value;
    const elapsed = Date.now() - lastSentAt;
    if (elapsed >= intervalMs) {
      flush();
      return;
    }

    scheduleFlush(intervalMs - elapsed);
  };

  const cancel = () => {
    queuedValue = null;
    clearTimer();
  };

  return {
    push,
    flush,
    cancel,
  };
}

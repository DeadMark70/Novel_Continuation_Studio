type TokenizeResponse = {
  id: number;
  tokenCount: number;
  fallback: boolean;
};

type PendingRequest = {
  resolve: (value: number) => void;
  reject: (error: Error) => void;
};

const responseTimeoutMs = 5000;
const cache = new Map<string, number>();
let sequence = 0;
let worker: Worker | null = null;
const pending = new Map<number, PendingRequest>();

export function estimateTokenCountHeuristic(text: string): number {
  if (!text) {
    return 0;
  }
  const asciiCount = (text.match(/[\x00-\x7F]/g) || []).length;
  const nonAsciiCount = text.length - asciiCount;
  return Math.max(1, Math.ceil(asciiCount / 4 + nonAsciiCount / 1.5));
}

function ensureWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker(new URL('../workers/tokenizer.worker.ts', import.meta.url), {
    type: 'module',
  });

  worker.onmessage = (event: MessageEvent<TokenizeResponse>) => {
    const payload = event.data;
    const request = pending.get(payload.id);
    if (!request) {
      return;
    }
    pending.delete(payload.id);
    request.resolve(Math.max(0, Math.floor(payload.tokenCount)));
  };

  worker.onerror = (event) => {
    for (const request of pending.values()) {
      request.reject(new Error(event.message || 'Tokenizer worker crashed'));
    }
    pending.clear();
  };

  return worker;
}

function requestWorkerTokenCount(text: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const requestId = sequence++;
    const activeWorker = ensureWorker();
    const timeoutId = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error('Tokenizer worker timed out'));
    }, responseTimeoutMs);

    pending.set(requestId, {
      resolve: (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    });

    activeWorker.postMessage({
      id: requestId,
      text,
    });
  });
}

export async function estimateTokenCount(text: string): Promise<number> {
  if (!text) {
    return 0;
  }

  const cached = cache.get(text);
  if (cached !== undefined) {
    return cached;
  }

  if (
    typeof window === 'undefined' ||
    typeof Worker === 'undefined' ||
    Boolean(process.env.VITEST)
  ) {
    const heuristic = estimateTokenCountHeuristic(text);
    cache.set(text, heuristic);
    return heuristic;
  }

  try {
    const value = await requestWorkerTokenCount(text);
    cache.set(text, value);
    return value;
  } catch {
    const heuristic = estimateTokenCountHeuristic(text);
    cache.set(text, heuristic);
    return heuristic;
  }
}

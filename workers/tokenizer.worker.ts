type TokenizeRequest = {
  id: number;
  text: string;
};

type TokenizeResponse = {
  id: number;
  tokenCount: number;
  fallback: boolean;
};

let tokenizerFn: ((text: string) => number) | null = null;
let tokenizerLoadAttempted = false;

function estimateHeuristicTokenCount(text: string): number {
  if (!text) {
    return 0;
  }
  const asciiCount = (text.match(/[\x00-\x7F]/g) || []).length;
  const nonAsciiCount = text.length - asciiCount;
  return Math.max(1, Math.ceil(asciiCount / 4 + nonAsciiCount / 1.5));
}

async function loadTokenizer(): Promise<void> {
  if (tokenizerFn || tokenizerLoadAttempted) {
    return;
  }

  tokenizerLoadAttempted = true;
  try {
    const dynamicImport = new Function('m', 'return import(m)') as (
      moduleId: string
    ) => Promise<Record<string, unknown>>;
    const mod = await dynamicImport('gpt-tokenizer');

    if (typeof mod.countTokens === 'function') {
      tokenizerFn = (text: string) => {
        return Number((mod.countTokens as (input: string) => number)(text));
      };
      return;
    }

    if (typeof mod.encode === 'function') {
      tokenizerFn = (text: string) => {
        const encoded = (mod.encode as (input: string) => unknown[])(text);
        return Array.isArray(encoded) ? encoded.length : estimateHeuristicTokenCount(text);
      };
      return;
    }
  } catch {
    tokenizerFn = null;
  }
}

self.onmessage = async (event: MessageEvent<TokenizeRequest>) => {
  const { id, text } = event.data;
  await loadTokenizer();

  const tokenCount = tokenizerFn ? tokenizerFn(text) : estimateHeuristicTokenCount(text);
  const response: TokenizeResponse = {
    id,
    tokenCount,
    fallback: !tokenizerFn,
  };
  self.postMessage(response);
};

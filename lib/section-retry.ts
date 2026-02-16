import type { PromptTemplateKey } from '@/lib/prompt-section-contracts';
import {
  appendMissingSectionsRetryInstruction,
  shouldEnforcePromptSections,
  validatePromptSections,
} from '@/lib/prompt-section-contracts';

export interface SectionRetryResult {
  content: string;
  attempts: number;
}

interface GenerateWithSectionRetryOptions {
  prompt: string;
  promptKey: PromptTemplateKey;
  generate: (
    prompt: string,
    attempt: number,
    missingSections: string[]
  ) => Promise<string>;
  maxAttempts?: number;
}

export async function generateWithSectionRetry({
  prompt,
  promptKey,
  generate,
  maxAttempts = 2,
}: GenerateWithSectionRetryOptions): Promise<SectionRetryResult> {
  if (!shouldEnforcePromptSections(promptKey)) {
    const content = await generate(prompt, 1, []);
    return { content, attempts: 1 };
  }

  let currentPrompt = prompt;
  let previousMissing: string[] = [];
  const totalAttempts = Math.max(1, Math.floor(maxAttempts));

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    const content = await generate(currentPrompt, attempt, previousMissing);
    const validation = validatePromptSections(promptKey, content);
    if (validation.ok) {
      return { content, attempts: attempt };
    }

    previousMissing = validation.missing;
    if (attempt >= totalAttempts) {
      throw new Error(
        `Missing required sections for ${promptKey}: ${previousMissing
          .map((section) => `【${section}】`)
          .join('、')}`
      );
    }

    currentPrompt = appendMissingSectionsRetryInstruction(
      prompt,
      promptKey,
      previousMissing
    );
  }

  throw new Error(`Section retry failed for ${promptKey}`);
}

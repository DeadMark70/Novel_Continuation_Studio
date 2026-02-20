import { streamToAsyncIterable } from './llm-client';
import { LORE_EXTRACTION_PROMPT } from './prompts';
import { LoreCard } from './lorebook-types';
import { v4 as uuidv4 } from 'uuid';

export async function extractLoreFromText(
  contextText: string,
  provider: 'nim' | 'openrouter',
  model: string,
  apiKey: string
): Promise<LoreCard[]> {
  const systemPrompt = LORE_EXTRACTION_PROMPT;
  const userPrompt = `Context Text to Analyze:\n${contextText}`;

  // Simple token/budget params for extraction
  const params = {
    maxTokens: 1500,
    temperature: 0.2, // Low temperature for extraction fidelity
    topP: 0.9,
    topK: 40,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    thinkingEnabled: false
  };

  const stream = await streamToAsyncIterable(
    provider,
    model,
    apiKey,
    systemPrompt,
    userPrompt,
    params
  );

  let rawResponse = '';
  for await (const chunk of stream) {
    if (chunk) rawResponse += chunk;
  }

  // Robustly extract JSON block if wrapped in markdown
  const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonString = jsonMatch ? jsonMatch[1].trim() : rawResponse.trim();

  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !Array.isArray(parsed.cards)) {
      throw new Error('Parsed extraction does not contain a "cards" array.');
    }

    const cards: LoreCard[] = parsed.cards.map((data: any) => ({
      id: uuidv4(),
      novelId: '', // To be filled by caller
      type: data.type === 'world' ? 'world' : 'character',
      name: data.name,
      coreData: {
        description: data.description || '',
        personality: data.personality || '',
        scenario: data.scenario || '',
        first_mes: data.first_mes || '',
        mes_example: data.mes_example || ''
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
    
    return cards;
  } catch (err: any) {
    throw new Error(`Failed to parse extracted JSON: ${err.message}\nRaw Output: ${rawResponse}`);
  }
}

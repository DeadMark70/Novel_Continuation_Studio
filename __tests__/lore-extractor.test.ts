import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractLoreFromText } from '@/lib/lore-extractor';
import { LORE_EXTRACTION_PROMPT } from '@/lib/prompts';
import { streamToAsyncIterable } from '@/lib/llm-client';

// Mock the llm-client module to simulate API calling
vi.mock('../lib/llm-client', () => ({
  streamToAsyncIterable: vi.fn(),
  triggerLLM: vi.fn()
}));

describe('Lore Extraction Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('LORE_EXTRACTION_PROMPT should be defined', () => {
    expect(LORE_EXTRACTION_PROMPT).toBeDefined();
    expect(LORE_EXTRACTION_PROMPT).toContain('JSON'); // Ensure prompt asks for JSON
  });

  it('should successfully parse a valid markdown-embedded JSON response', async () => {
    // Mock the streaming response yielding chunks
    const mockJson = JSON.stringify({
      cards: [{
        name: 'Elara',
        type: 'character',
        description: 'A swift rogue.',
        personality: 'Cynical but loyal',
        scenario: 'Stealth mission',
        first_mes: 'Did you hear that?',
        mes_example: '<START>\n{{user}}: Freeze!\n{{char}}: Did you hear that?'
      }]
    });
    
    // Simulate LLM wrapping response in markdown code blocks
    const mockedChunks = ['```json\n', mockJson, '\n```'];
    
    (streamToAsyncIterable as any).mockImplementation(async function* () {
      for (const chunk of mockedChunks) {
        yield chunk;
      }
    });

    const result = await extractLoreFromText('Some context text', 'nim', 'meta/llama3-70b-instruct', 'mock-key');
    
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Elara');
    expect(result[0].coreData.first_mes).toBe('Did you hear that?');
  });

  it('should handle invalid JSON smoothly', async () => {
    // Return broken JSON
    const mockedChunks = ['{ "cards": [ { "name": "Broken", ']; 
    
    (streamToAsyncIterable as any).mockImplementation(async function* () {
      for (const chunk of mockedChunks) {
        yield chunk;
      }
    });

    // Should return empty array or throw graceful error rather than crashing
    try {
      const result = await extractLoreFromText('Bad text', 'nim', 'meta/llama3-70b-instruct', 'mock-key');
      expect(result).toEqual([]);
    } catch (e: any) {
      expect(e.message).toContain('Failed to parse');
    }
  });
});

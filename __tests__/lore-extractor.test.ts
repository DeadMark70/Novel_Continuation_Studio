import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractLoreFromText,
  LoreExtractionParseError,
  parseLoreCardsFromRawJson,
  parseLoreCardsFromRawJsonWithLlmRepair,
} from '@/lib/lore-extractor';
import { LORE_EXTRACTION_PROMPT } from '@/lib/prompts';
import { streamToAsyncIterable } from '@/lib/llm-client';

// Mock the llm-client module to simulate API calling
vi.mock('../lib/llm-client', () => ({
  streamToAsyncIterable: vi.fn(),
  triggerLLM: vi.fn()
}));

function mockStreamedResponse(chunks: string[]) {
  vi.mocked(streamToAsyncIterable).mockImplementation(async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  });
}

describe('Lore Extraction Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('LORE_EXTRACTION_PROMPT should be defined', () => {
    expect(LORE_EXTRACTION_PROMPT).toBeDefined();
    expect(LORE_EXTRACTION_PROMPT).toContain('JSON'); // Ensure prompt asks for JSON
  });

  it('should parse multiple character array payload for the multipleCharacters target', async () => {
    const mockJson = JSON.stringify([
      {
        name: 'Elara',
        type: 'character',
        description: 'A swift rogue.',
        personality: 'Cynical but loyal',
        scenario: 'Stealth mission',
        first_mes: 'Did you hear that?',
        mes_example: '<START>\n{{user}}: Freeze!\n{{char}}: Did you hear that?'
      },
      {
        name: 'Bran',
        type: 'character',
        description: 'A seasoned knight.',
        personality: 'Stoic and disciplined',
        scenario: 'Royal guard patrol',
        first_mes: 'Stay behind me.',
        mes_example: '<START>\n{{user}}: Is it safe?\n{{char}}: Stay behind me.'
      }
    ]);
    mockStreamedResponse(['```json\n', mockJson, '\n```']);

    const result = await extractLoreFromText(
      'Some context text',
      'nim',
      'meta/llama3-70b-instruct',
      'mock-key',
      'multipleCharacters'
    );

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Elara');
    expect(result[1].name).toBe('Bran');
  });

  it('should pass world/lore schema when target is worldLore', async () => {
    const mockJson = JSON.stringify({
      name: 'Iron Dominion',
      type: 'world',
      description: 'A military empire built on floating citadels.',
      personality: '',
      scenario: 'A fragile truce between sky-fleets.',
      first_mes: '',
      mes_example: '<START>\n{{user}}: What is the Dominion?\n{{char}}: A fortress among storms.'
    });

    mockStreamedResponse([mockJson]);

    const result = await extractLoreFromText(
      'World setting context',
      'nim',
      'meta/llama3-70b-instruct',
      'mock-key',
      'worldLore'
    );

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('world');
    expect(result[0].name).toBe('Iron Dominion');
  });

  it('should coerce a single object into an array for multipleCharacters target', async () => {
    const mockJson = JSON.stringify({
      name: 'Lina',
      type: 'character',
      description: 'Arcane tactician.',
      personality: 'Focused',
      scenario: 'Siege planning room',
      first_mes: 'Map the eastern gate.',
      mes_example: '<START>\n{{user}}: What now?\n{{char}}: Map the eastern gate.'
    });
    mockStreamedResponse([mockJson]);

    const result = await extractLoreFromText(
      'Character context',
      'nim',
      'meta/llama3-70b-instruct',
      'mock-key',
      'multipleCharacters'
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Lina');
  });

  it('should keep only first item when singleCharacter receives an array', async () => {
    const mockJson = JSON.stringify([
      {
        name: 'First',
        type: 'character',
        description: 'First entry',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '<START>\n{{user}}: hi\n{{char}}: hi'
      },
      {
        name: 'Second',
        type: 'character',
        description: 'Second entry',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '<START>\n{{user}}: hi\n{{char}}: hi'
      }
    ]);
    mockStreamedResponse([mockJson]);

    const result = await extractLoreFromText(
      'Character context',
      'nim',
      'meta/llama3-70b-instruct',
      'mock-key',
      'singleCharacter'
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('First');
  });

  it('should reject legacy {cards: [...]} payload format', async () => {
    const legacyJson = JSON.stringify({
      cards: [
        {
          name: 'Legacy',
          type: 'character',
          description: 'Legacy payload'
        }
      ]
    });
    mockStreamedResponse([legacyJson]);

    await expect(
      extractLoreFromText('Legacy context', 'nim', 'meta/llama3-70b-instruct', 'mock-key', 'singleCharacter')
    ).rejects.toThrow('Failed to parse extracted JSON');
  });

  it('should throw a parse error for invalid JSON', async () => {
    mockStreamedResponse(['{ "broken": ']);

    await expect(
      extractLoreFromText('Bad text', 'nim', 'meta/llama3-70b-instruct', 'mock-key', 'singleCharacter')
    ).rejects.toThrow('Failed to parse');
  });

  it('should auto-repair invalid chunk JSON using the loreJsonRepair config', async () => {
    const streamMock = vi.mocked(streamToAsyncIterable);
    streamMock
      .mockImplementationOnce(async function* () {
        yield '{ "type": "character", "name": "Broken" "description": "oops" }';
      })
      .mockImplementationOnce(async function* () {
        yield JSON.stringify({
          type: 'character',
          name: 'Recovered by Repair',
          description: 'Recovered',
          personality: '',
          scenario: '',
          first_mes: '',
          mes_example: '<START>\n{{user}}: hi\n{{char}}: hi',
        });
      });

    const result = await extractLoreFromText(
      'Needs repair',
      'nim',
      'meta/llama3-70b-instruct',
      'mock-key',
      'singleCharacter',
      {
        repairConfig: {
          provider: 'nim',
          model: 'repair-model',
          apiKey: 'repair-key',
          params: {
            maxTokens: 1024,
            temperature: 0.1,
          },
        },
      }
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Recovered by Repair');
    expect(streamMock).toHaveBeenCalledTimes(2);
    expect(streamMock.mock.calls[1][1]).toBe('repair-model');
  });

  it('should use extraction params from settings instead of fixed maxTokens', async () => {
    const mockJson = JSON.stringify({
      name: 'TokenSynced',
      type: 'character',
      description: 'Token sync test',
      personality: '',
      scenario: '',
      first_mes: '',
      mes_example: '<START>\n{{user}}: hi\n{{char}}: hi'
    });
    mockStreamedResponse([mockJson]);

    await extractLoreFromText(
      'Token config context',
      'nim',
      'meta/llama3-70b-instruct',
      'mock-key',
      'singleCharacter',
      {
        params: {
          maxTokens: 4096,
          temperature: 0.3,
        },
      }
    );

    const lastCall = vi.mocked(streamToAsyncIterable).mock.calls[0];
    expect(lastCall[5]).toMatchObject({ maxTokens: 4096, temperature: 0.3 });
  });

  it('should forward model limits metadata and respect autoMaxTokens behavior', async () => {
    const mockJson = JSON.stringify({
      name: 'MetaBounded',
      type: 'character',
      description: 'metadata forwarding',
      personality: '',
      scenario: '',
      first_mes: '',
      mes_example: '<START>\n{{user}}: hi\n{{char}}: hi'
    });
    mockStreamedResponse([mockJson]);

    await extractLoreFromText(
      'Metadata context',
      'nim',
      'meta/llama3-70b-instruct',
      'mock-key',
      'singleCharacter',
      {
        params: {
          maxTokens: 256000,
          autoMaxTokens: true,
          temperature: 0.25,
        },
        supportedParameters: ['top_k'],
        maxContextTokens: 262144,
        maxCompletionTokens: 8192,
      }
    );

    const lastCall = vi.mocked(streamToAsyncIterable).mock.calls[0];
    expect(lastCall[5]).toMatchObject({
      autoMaxTokens: true,
      maxTokens: undefined,
      supportedParameters: ['top_k'],
      maxContextTokens: 262144,
      maxCompletionTokens: 8192,
    });
  });

  it('should split long context into chunks and merge deduped multiple characters', async () => {
    const streamMock = vi.mocked(streamToAsyncIterable);
    streamMock
      .mockImplementationOnce(async function* () {
        yield JSON.stringify([
          {
            name: 'Elara',
            type: 'character',
            description: 'Chunk1',
            mes_example: '<START>\n{{user}}: hi\n{{char}}: hi'
          }
        ]);
      })
      .mockImplementationOnce(async function* () {
        yield JSON.stringify([
          {
            name: 'Elara',
            type: 'character',
            description: 'Chunk2 richer description',
            mes_example: '<START>\n{{user}}: hi\n{{char}}: hello there'
          },
          {
            name: 'Bran',
            type: 'character',
            description: 'Second character',
            mes_example: '<START>\n{{user}}: hi\n{{char}}: move'
          }
        ]);
      });

    const longContext = 'A'.repeat(2500);
    const result = await extractLoreFromText(
      longContext,
      'nim',
      'meta/llama3-70b-instruct',
      'mock-key',
      'multipleCharacters',
      { params: { maxTokens: 256 } }
    );

    expect(streamMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result.map((card) => card.name).sort()).toEqual(['Bran', 'Elara']);
  });

  it('should filter extracted cards by manual character list in manual mode', async () => {
    mockStreamedResponse([
      JSON.stringify([
        {
          name: 'Elara',
          type: 'character',
          description: 'Keep me',
          mes_example: '<START>\n{{user}}: hi\n{{char}}: hi'
        },
        {
          name: 'Bran',
          type: 'character',
          description: 'Filter me out',
          mes_example: '<START>\n{{user}}: hi\n{{char}}: hi'
        }
      ])
    ]);

    const result = await extractLoreFromText(
      'Manual name context',
      'nim',
      'meta/llama3-70b-instruct',
      'mock-key',
      'multipleCharacters',
      {
        sourceMode: 'manualList',
        manualNames: ['Elara'],
      }
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Elara');
  });

  it('should keep manual-list output order and drop non-requested names', async () => {
    mockStreamedResponse([
      JSON.stringify([
        {
          name: '旁白',
          type: 'character',
          description: 'not requested',
          mes_example: '<START>\n{{user}}: hi\n{{char}}: hi'
        },
        {
          name: 'Bran',
          type: 'character',
          description: 'requested second',
          mes_example: '<START>\n{{user}}: hi\n{{char}}: hi'
        },
        {
          name: 'Elara',
          type: 'character',
          description: 'requested first',
          mes_example: '<START>\n{{user}}: hi\n{{char}}: hi'
        }
      ])
    ]);

    const result = await extractLoreFromText(
      'Manual ordered context',
      'nim',
      'meta/llama3-70b-instruct',
      'mock-key',
      'multipleCharacters',
      {
        sourceMode: 'manualList',
        manualNames: ['Elara', 'Bran'],
      }
    );

    expect(result).toHaveLength(2);
    expect(result.map((entry) => entry.name)).toEqual(['Elara', 'Bran']);
  });

  it('should cap auto-detected multiple character results to top 3 by completeness', async () => {
    mockStreamedResponse([
      JSON.stringify([
        { name: 'A', type: 'character', description: '1', mes_example: '<START>\n{{user}}: hi\n{{char}}: hi' },
        { name: 'B', type: 'character', description: '1234567890', mes_example: '<START>\n{{user}}: hi\n{{char}}: hi' },
        { name: 'C', type: 'character', description: '12345', mes_example: '<START>\n{{user}}: hi\n{{char}}: hi' },
        { name: 'D', type: 'character', description: '1234567', mes_example: '<START>\n{{user}}: hi\n{{char}}: hi' },
      ])
    ]);

    const result = await extractLoreFromText(
      'Auto-detect with many names',
      'nim',
      'meta/llama3-70b-instruct',
      'mock-key',
      'multipleCharacters',
      {
        sourceMode: 'autoDetect',
      }
    );

    expect(result).toHaveLength(3);
    expect(result.map((entry) => entry.name)).toEqual(['B', 'D', 'C']);
  });

  it('should match manual list names with parenthetical aliases', async () => {
    mockStreamedResponse([
      JSON.stringify([
        {
          name: '克莉絲（接待員）',
          type: 'character',
          description: 'alias match',
          mes_example: '<START>\n{{user}}: hi\n{{char}}: hi'
        }
      ])
    ]);

    const result = await extractLoreFromText(
      'Alias context',
      'nim',
      'meta/llama3-70b-instruct',
      'mock-key',
      'multipleCharacters',
      {
        sourceMode: 'manualList',
        manualNames: ['克莉絲'],
      }
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('克莉絲（接待員）');
  });

  it('should keep all matched manual-list results even when count exceeds auto cap', async () => {
    mockStreamedResponse([
      JSON.stringify([
        { name: 'A', type: 'character', description: 'a', mes_example: '<START>\n{{user}}: hi\n{{char}}: hi' },
        { name: 'B', type: 'character', description: 'b', mes_example: '<START>\n{{user}}: hi\n{{char}}: hi' },
        { name: 'C', type: 'character', description: 'c', mes_example: '<START>\n{{user}}: hi\n{{char}}: hi' },
        { name: 'D', type: 'character', description: 'd', mes_example: '<START>\n{{user}}: hi\n{{char}}: hi' },
      ])
    ]);

    const result = await extractLoreFromText(
      'Manual list with 4 names',
      'nim',
      'meta/llama3-70b-instruct',
      'mock-key',
      'multipleCharacters',
      {
        sourceMode: 'manualList',
        manualNames: ['A', 'B', 'C', 'D'],
      }
    );

    expect(result).toHaveLength(4);
    expect(result.map((entry) => entry.name)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('should expose parse diagnostics and allow reparsing edited output', async () => {
    mockStreamedResponse(['{ "broken": ']);

    await expect(
      extractLoreFromText(
        'Bad context',
        'nim',
        'meta/llama3-70b-instruct',
        'mock-key',
        'singleCharacter'
      )
    ).rejects.toBeInstanceOf(LoreExtractionParseError);

    const reparsed = parseLoreCardsFromRawJson(
      JSON.stringify({
        name: 'Recovered',
        type: 'character',
        description: 'Recovered via edit',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '<START>\n{{user}}: hi\n{{char}}: hi'
      }),
      'singleCharacter'
    );

    expect(reparsed).toHaveLength(1);
    expect(reparsed[0].name).toBe('Recovered');
  });

  it('should allow retry-parse with LLM repair when local parse fails', async () => {
    mockStreamedResponse([
      JSON.stringify({
        type: 'character',
        name: 'RetryRecovered',
        description: 'Recovered on retry',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '<START>\n{{user}}: hi\n{{char}}: hi',
      }),
    ]);

    const parsed = await parseLoreCardsFromRawJsonWithLlmRepair(
      '{ "type": "character", "name": "Broken" "description": "oops" }',
      'singleCharacter',
      {
        repairConfig: {
          provider: 'nim',
          model: 'repair-model',
          apiKey: 'repair-key',
          params: { maxTokens: 512 },
        },
      }
    );

    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('RetryRecovered');
  });

  it('should repair CJK punctuation and alias fields in JSON-like output', () => {
    const raw = `[
      {
        "type": "character",
        "name": "安娜麗瑟",
        "description": "正常項目",
        "personality": "冷靜",
        "scenario": "工會大廳",
        "first_mes": "先別出聲。",
        "mes_example": "<START>\\\\n{{user}}: hi\\\\n{{char}}: ok"
      },
      {
        「type」: "character",
        "name": 「乳膠魔物」（未命名實體）,
        「description」: "寄生體",
        「personality」: "惡意",
        「scenario」: "干擾任務",
        "_mes": "腦內低語",
        "_example": "<START>\\\\n{{user}}: ...\\\\n{{char}}: ..."
      }
    ]`;

    const parsed = parseLoreCardsFromRawJson(raw, 'multipleCharacters');
    expect(parsed).toHaveLength(2);
    expect(parsed[1].name).toBe('乳膠魔物（未命名實體）');
    expect(parsed[1].coreData.first_mes).toBe('腦內低語');
    expect(parsed[1].coreData.mes_example).toContain('<START>');
  });

  it('should truncate oversized lore fields to configured limits', () => {
    const raw = JSON.stringify({
      type: 'character',
      name: 'N'.repeat(120),
      description: 'D'.repeat(700),
      personality: 'P'.repeat(350),
      scenario: 'S'.repeat(500),
      first_mes: 'F'.repeat(500),
      mes_example: 'M'.repeat(1200),
    });

    const parsed = parseLoreCardsFromRawJson(raw, 'singleCharacter');
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name.length).toBe(80);
    expect(parsed[0].coreData.description.length).toBe(600);
    expect(parsed[0].coreData.personality.length).toBe(300);
    expect(parsed[0].coreData.scenario.length).toBe(400);
    expect(parsed[0].coreData.first_mes.length).toBe(300);
    expect(parsed[0].coreData.mes_example.length).toBe(800);
  });

  it('should clamp invalid extraction params before dispatching to LLM', async () => {
    mockStreamedResponse([
      JSON.stringify({
        name: 'ClampCase',
        type: 'character',
        description: 'ok',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '<START>\n{{user}}: hi\n{{char}}: hi',
      }),
    ]);

    await extractLoreFromText(
      'Clamp context',
      'nim',
      'meta/llama3-70b-instruct',
      'mock-key',
      'singleCharacter',
      {
        params: {
          temperature: 9,
          topP: -2,
        },
      }
    );

    const lastCall = vi.mocked(streamToAsyncIterable).mock.calls[0];
    expect(lastCall[5]).toMatchObject({
      temperature: 2,
      topP: 0,
    });
  });

  it('should repair invalid escaped characters inside strings', () => {
    const raw = `{
      "type": "character",
      "name": "EscapeCase",
      "description": "A",
      "personality": "B",
      "scenario": "C",
      "first_mes": "D",
      "mes_example": "<START>\\ n {{user}}: hi"
    }`;

    const parsed = parseLoreCardsFromRawJson(raw, 'singleCharacter');
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('EscapeCase');
  });
});

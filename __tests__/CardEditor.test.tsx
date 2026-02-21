import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CardEditor } from '@/components/lorebook/CardEditor';
import { LoreExtractionParseError } from '@/lib/lore-extractor';

const mocked = vi.hoisted(() => ({
  extractLoreFromText: vi.fn(),
  parseLoreCardsFromRawJsonWithLlmRepair: vi.fn(),
  lorebookState: {
    cards: [] as Array<unknown>,
    addCard: vi.fn(),
    addCards: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
  },
}));

vi.mock('@/store/useLorebookStore', () => ({
  useLorebookStore: () => mocked.lorebookState,
}));

vi.mock('@/store/useNovelStore', () => ({
  useNovelStore: () => ({
    currentSessionId: 'session-1',
  }),
}));

vi.mock('@/store/useSettingsStore', () => ({
  useSettingsStore: () => ({
    getResolvedGenerationConfig: () => ({
      provider: 'nim',
      model: 'meta/llama3-70b-instruct',
      apiKey: 'mock-key',
      params: {
        maxTokens: 4096,
        temperature: 0.2,
        topP: 0.9,
        topK: 40,
        frequencyPenalty: 0,
        presencePenalty: 0,
        thinkingEnabled: false,
      },
    }),
  }),
}));

vi.mock('@/lib/lore-extractor', async () => {
  const actual = await vi.importActual<typeof import('@/lib/lore-extractor')>('@/lib/lore-extractor');
  return {
    ...actual,
    extractLoreFromText: mocked.extractLoreFromText,
    parseLoreCardsFromRawJsonWithLlmRepair: mocked.parseLoreCardsFromRawJsonWithLlmRepair,
  };
});

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    Save: () => <span />,
    Trash2: () => <span />,
    Image: () => <span />,
    Wand2: () => <span />,
    XIcon: () => <span />,
  };
});

describe('CardEditor extraction dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  it('uses autoDetect source mode by default when extracting', async () => {
    mocked.extractLoreFromText.mockResolvedValue([
      {
        id: 'tmp-1',
        novelId: '',
        type: 'character',
        name: 'Elara',
        coreData: {
          description: 'desc',
          personality: '',
          scenario: '',
          first_mes: '',
          mes_example: '',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    render(<CardEditor cardId="new" onClose={vi.fn()} onSelectCard={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /extract from text/i }));
    const input = await screen.findByPlaceholderText(/e\.g\. Elara is a thief/i);
    fireEvent.change(input, { target: { value: 'Some long novel context' } });
    fireEvent.click(screen.getByRole('button', { name: /extract & parse/i }));

    expect(mocked.extractLoreFromText).toHaveBeenCalledTimes(1);
    const call = mocked.extractLoreFromText.mock.calls[0];
    expect(call[5]).toMatchObject({
      sourceMode: 'autoDetect',
      params: expect.objectContaining({ maxTokens: 4096 }),
      repairConfig: expect.objectContaining({
        model: 'meta/llama3-70b-instruct',
      }),
    });
  });

  it('shows editable raw output fallback when parse fails', async () => {
    mocked.extractLoreFromText.mockRejectedValue(
      new LoreExtractionParseError('Unexpected end of JSON input', '{ "broken": ')
    );

    render(<CardEditor cardId="new" onClose={vi.fn()} onSelectCard={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /extract from text/i }));
    const input = await screen.findByPlaceholderText(/e\.g\. Elara is a thief/i);
    fireEvent.change(input, { target: { value: 'Some long novel context' } });
    fireEvent.click(screen.getByRole('button', { name: /extract & parse/i }));

    expect(await screen.findByText(/Raw LLM Output \(Editable\)/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /retry parse/i })).toBeDefined();
  });
});

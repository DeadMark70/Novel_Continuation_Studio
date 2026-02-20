import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildV2Payload, buildV3Payload, exportLorebookCardToPNG } from '../lib/sillytavern-export';
import { LoreCard } from '../lib/lorebook-types';

const mockCard: LoreCard = {
  id: 'test-uuid-1234',
  novelId: 'novel-5678',
  type: 'character',
  name: 'Eldrin',
  avatarDataUri: 'data:image/png;base64,iVBORw0KGgo...',
  coreData: {
    description: 'A wise old wizard.',
    personality: 'Mysterious, kind',
    scenario: 'In an ancient library.',
    first_mes: 'Ah, greetings traveler.',
    mes_example: '<START>\n{{user}}: Hello!\n{{char}}: Ah, greetings traveler.'
  },
  createdAt: 1700000000000,
  updatedAt: 1700000000000
};

describe('SillyTavern Export Payloads', () => {
  describe('buildV2Payload', () => {
    it('should correctly map a LoreCard to V2CardData format', () => {
      const v2Payload = buildV2Payload(mockCard);
      
      // Core dynamic data mappings
      expect(v2Payload.name).toBe('Eldrin');
      expect(v2Payload.description).toBe('A wise old wizard.');
      expect(v2Payload.personality).toBe('Mysterious, kind');
      expect(v2Payload.scenario).toBe('In an ancient library.');
      expect(v2Payload.first_mes).toBe('Ah, greetings traveler.');
      expect(v2Payload.mes_example).toBe('<START>\n{{user}}: Hello!\n{{char}}: Ah, greetings traveler.');
      
      // Check static/default fields required by V2 spec
      expect(v2Payload.creator_notes).toBe('Exported from Novel Continuation Studio');
      expect(v2Payload.system_prompt).toBe('');
      expect(v2Payload.post_history_instructions).toBe('');
      expect(v2Payload.tags).toEqual(['character']);
      expect(v2Payload.creator).toBe('Novel Continuation Studio');
      expect(v2Payload.character_version).toBe('1.0.0');
      expect(v2Payload.alternate_greetings).toEqual([]);
    });

    it('should correctly map "world" type to tags array', () => {
      const worldCard = { ...mockCard, type: 'world' as const };
      const v2Payload = buildV2Payload(worldCard);
      expect(v2Payload.tags).toEqual(['world']);
    });
  });

  describe('buildV3Payload', () => {
    it('should correctly map a LoreCard to V3CardData format, inheriting V2 fields', () => {
      const v3Payload = buildV3Payload(mockCard);
      
      // Inherits V2 fields
      expect(v3Payload.name).toBe('Eldrin');
      expect(v3Payload.description).toBe('A wise old wizard.');
      expect(v3Payload.personality).toBe('Mysterious, kind');
      expect(v3Payload.scenario).toBe('In an ancient library.');
      expect(v3Payload.first_mes).toBe('Ah, greetings traveler.');
      expect(v3Payload.mes_example).toBe('<START>\n{{user}}: Hello!\n{{char}}: Ah, greetings traveler.');
      
      // V3 Specific fields check
      expect(v3Payload.nickname).toBe('Eldrin'); // Uses name as nickname
      expect(v3Payload.source).toEqual([]);
      expect(v3Payload.group_only_greetings).toEqual([]);
      expect(v3Payload.creation_date).toBe(mockCard.createdAt);
      expect(v3Payload.modification_date).toBe(mockCard.updatedAt);
      expect(v3Payload.assets).toEqual([]);
    });
    
    it('should preserve world tag inheritance in V3 from V2 builder', () => {
       const worldCard = { ...mockCard, type: 'world' as const };
       const v3Payload = buildV3Payload(worldCard);
       expect(v3Payload.tags).toEqual(['world']);
    });
  });

  describe('exportLorebookCardToPNG', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should throw an error if avatarDataUri is missing', async () => {
      const cardWithoutAvatar = { ...mockCard, avatarDataUri: undefined };
      await expect(exportLorebookCardToPNG(cardWithoutAvatar)).rejects.toThrow('Avatar image is required for PNG export.');
    });

    it('should process a card with an avatar and return a Blob', async () => {
      // Mock the atob and btoa globally for the test environment if they are not present
      if (typeof global.atob === 'undefined') {
        global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
      }
      if (typeof global.btoa === 'undefined') {
        global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
      }

      // We use a valid very small base64 png for the avatarDataUri to prevent decode errors
      const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const cardWithValidAvatar = { ...mockCard, avatarDataUri: `data:image/png;base64,${validPngBase64}` };
      
      const blob = await exportLorebookCardToPNG(cardWithValidAvatar);
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
    });
  });
});

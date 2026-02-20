import { describe, it, expect } from 'vitest';
import { CoreLoreData, LoreCard, V2CardData, V3CardData } from '@/lib/lorebook-types';

describe('Lorebook Types Compliance', () => {
  it('should validate a complete V2CardData structure', () => {
    const v2Data: V2CardData = {
      name: 'Alice',
      description: 'A brave adventurer',
      personality: 'Bold and curious',
      scenario: 'In a dark dungeon',
      first_mes: 'Who goes there?',
      mes_example: '<START>\n{{user}}: Hello\n{{char}}: Who goes there?',
      // Optional fields
      creator_notes: 'Created for testing',
      system_prompt: 'Act as Alice',
      post_history_instructions: '',
      tags: ['fantasy', 'hero'],
      creator: 'User',
      character_version: '1.0',
      alternate_greetings: ['Hi!']
    };
    
    expect(v2Data.name).toBe('Alice');
    expect(v2Data.description).toBeDefined();
  });

  it('should validate a complete V3CardData structure', () => {
    const v3Data: V3CardData = {
      name: 'Bob',
      description: 'A wise wizard',
      personality: 'Calm and knowledgeable',
      scenario: 'In a magical tower',
      first_mes: 'Welcome, seeker of knowledge.',
      mes_example: '<START>\n{{user}}: Teach me magic\n{{char}}: Welcome, seeker of knowledge.',
      creator_notes: 'V3 card test',
      system_prompt: '',
      post_history_instructions: '',
      tags: ['magic', 'mentor'],
      creator: 'User',
      character_version: '1.1',
      alternate_greetings: [],
      // V3 specific fields
      nickname: 'Bobby',
      creator_notes_multilingual: {},
      source: ['Novel Continuation Studio'],
      group_only_greetings: [],
      creation_date: 1234567890,
      modification_date: 1234567890,
      assets: [
        { type: "icon", uri: "ccdefault:", name: "main", ext: "png" }
      ]
    };

    expect(v3Data.nickname).toBe('Bobby');
    expect(v3Data.assets.length).toBe(1);
  });

  it('should validate LoreCard structure (Database Entity)', () => {
    const card: LoreCard = {
      id: 'uuid-1234',
      novelId: 'novel-1',
      type: 'character',
      name: 'Charlie',
      avatarDataUri: 'data:image/png;base64,iVBORw0KGgo...',
      coreData: {
        description: 'Test description',
        personality: 'Test personality',
        scenario: 'Test scenario',
        first_mes: 'Test first message',
        mes_example: 'Test message example',
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    expect(card.type).toBe('character');
    expect(card.coreData.description).toBe('Test description');
  });
});

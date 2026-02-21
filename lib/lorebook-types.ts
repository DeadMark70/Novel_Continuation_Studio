// Shared AI Extracted Data
export interface CoreLoreData {
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
}

export type LoreExtractionTarget = 'singleCharacter' | 'multipleCharacters' | 'worldLore';
export type LoreCharacterSourceMode = 'autoDetect' | 'manualList';

export interface ExtractedLoreItem {
  type?: 'character' | 'world' | string;
  name: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
}

export interface LoreExtractionRequest {
  contextText: string;
  target: LoreExtractionTarget;
  sourceMode?: LoreCharacterSourceMode;
  manualNames?: string[];
}

export interface LoreExtractionDebugResult {
  rawOutput: string;
  parseError?: string;
}

export const GLOBAL_LOREBOOK_NOVEL_ID = '__global_lorebook__';

// Database Entity
export interface LoreCard {
  id: string;          // UUID
  novelId: string;     // Associated Novel ID
  type: 'character' | 'world';
  name: string;
  avatarDataUri?: string; // Base64 encoded PNG
  coreData: CoreLoreData;
  createdAt: number;
  updatedAt: number;
}

// SillyTavern V2 Spec (Chara Card V2)
export interface V2CardData {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  // Optional V2 Fields
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  tags?: string[];
  creator?: string;
  character_version?: string;
  alternate_greetings?: string[];
}

// SillyTavern V3 Spec (Chara Card V3)
export interface V3CardData {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  tags?: string[];
  creator?: string;
  character_version?: string;
  alternate_greetings?: string[];
  // V3 Specific Fields
  nickname: string;
  creator_notes_multilingual?: Record<string, string>;
  source: string[];
  group_only_greetings: string[];
  creation_date: number;
  modification_date: number;
  assets: Array<{
    type: string;
    uri: string;
    name: string;
    ext: string;
  }>;
}

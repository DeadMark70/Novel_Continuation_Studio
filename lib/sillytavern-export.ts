import extractChunks from 'png-chunks-extract';
import encodeChunks from 'png-chunks-encode';
import textChunk from 'png-chunk-text';
import { LoreCard, V2CardData, V3CardData } from './lorebook-types';

interface PngChunk {
  name: string;
  data: Uint8Array;
}

interface DecodedTextChunk {
  keyword: string;
  text: string;
}

const extractPngChunks = extractChunks as unknown as (data: Uint8Array) => PngChunk[];
const encodePngChunks = encodeChunks as unknown as (chunks: PngChunk[]) => Uint8Array;
const textChunkCodec = textChunk as unknown as {
  encode: (keyword: string, text: string) => PngChunk;
  decode: (chunk: PngChunk) => DecodedTextChunk;
};

export function buildV2Payload(card: LoreCard): V2CardData {
  return {
    name: card.name,
    description: card.coreData.description,
    personality: card.coreData.personality,
    scenario: card.coreData.scenario,
    first_mes: card.coreData.first_mes,
    mes_example: card.coreData.mes_example,
    creator_notes: 'Exported from Novel Continuation Studio',
    system_prompt: '',
    post_history_instructions: '',
    tags: [card.type === 'character' ? 'character' : 'world'],
    creator: 'Novel Continuation Studio',
    character_version: '1.0.0',
    alternate_greetings: []
  };
}

export function buildV3Payload(card: LoreCard): V3CardData {
  const v2 = buildV2Payload(card);
  return {
    ...v2,
    nickname: card.name,
    source: [],
    group_only_greetings: [],
    creation_date: card.createdAt,
    modification_date: card.updatedAt,
    assets: []
  };
}

export async function exportLorebookCardToPNG(card: LoreCard): Promise<Blob> {
  if (!card.avatarDataUri) {
    throw new Error('Avatar image is required for PNG export.');
  }

  // 1. Convert base64 DataURI to Uint8Array using browser APIs
  const base64Data = card.avatarDataUri.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
  const binaryString = atob(base64Data);
  const uint8Array = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }

  // 2. Extract specific metadata payloads
  const v2Data = buildV2Payload(card);
  const v3Data = {
    version: '3.0',
    data: buildV3Payload(card)
  };

  const v2String = JSON.stringify(v2Data);
  const v3String = JSON.stringify(v3Data);

  const encodeBase64 = (str: string) => btoa(unescape(encodeURIComponent(str)));
  const v2Base64 = encodeBase64(v2String);
  const v3Base64 = encodeBase64(v3String);

  // 3. Extract PNG chunks
  const chunks = extractPngChunks(uint8Array);

  // 4. Remove any existing chara / ccv3 text chunks to avoid duplication
  const cleanChunks = chunks.filter((chunk) => {
    if (chunk.name !== 'tEXt') return true;
    try {
      const text = textChunkCodec.decode(chunk);
      if (text.keyword === 'chara' || text.keyword === 'ccv3') return false;
    } catch {
      // Ignore invalid chunks
    }
    return true;
  });

  // 5. Append new metadata chunks
  const endChunkIndex = cleanChunks.findIndex((chunk) => chunk.name === 'IEND');
  const tailIndex = endChunkIndex > -1 ? endChunkIndex : cleanChunks.length;

  cleanChunks.splice(tailIndex, 0, textChunkCodec.encode('chara', v2Base64));
  cleanChunks.splice(tailIndex + 1, 0, textChunkCodec.encode('ccv3', v3Base64));

  // 6. Encode chunks back to PNG
  const finalBuffer = encodePngChunks(cleanChunks);
  const pngBytes = finalBuffer instanceof Uint8Array ? finalBuffer : new Uint8Array(finalBuffer);
  const blobSafeBytes = Uint8Array.from(pngBytes);

  // 7. Create Blob
  return new Blob([blobSafeBytes], { type: 'image/png' });
}

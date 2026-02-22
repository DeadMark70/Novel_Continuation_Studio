import { DEFAULT_PROMPTS } from '@/lib/prompts';
import {
  SectionRequirement,
  SectionValidationResult,
  validateRequiredSections,
} from '@/lib/section-validator';

export type PromptTemplateKey = keyof typeof DEFAULT_PROMPTS;

export interface PromptSectionContract {
  requirements: SectionRequirement[];
  example: string;
}

const ANALYSIS_REQUIREMENTS: SectionRequirement[] = [
  { name: '角色動機地圖' },
  { name: '權力與張力機制' },
  { name: '文風錨點（可執行規則）' },
  { name: '事件與伏筆 ledger' },
  { name: '續寫升級建議（穩定 + 大膽）' },
  { name: '禁止清單（避免重複與失真）' },
];

const PROMPT_SECTION_CONTRACTS: Partial<Record<PromptTemplateKey, PromptSectionContract>> = {
  analysisRaw: {
    requirements: ANALYSIS_REQUIREMENTS,
    example: [
      '<analysis_detail>',
      '【角色動機地圖】',
      '- 每位核心角色：慾望 / 底線 / 觸發點 / 同意邊界',
      '',
      '【權力與張力機制】',
      '- 說明控制/反控制、延宕/釋放的推進規則',
      '',
      '【文風錨點（可執行規則）】',
      '- 列出可直接執行的語氣與句法規則',
      '',
      '【事件與伏筆 ledger】',
      '- 已回收 / 未回收 / 可深化',
      '',
      '【續寫升級建議（穩定 + 大膽）】',
      '- 下一章優先推進 3 件事',
      '',
      '【禁止清單（避免重複與失真）】',
      '- 避免人設漂移與重覆橋段',
      '</analysis_detail>',
      '',
      '<executive_summary>',
      '- 8-12 條可執行 bullet，聚焦後續 Phase 2 決策',
      '</executive_summary>',
    ].join('\n'),
  },
  analysisCompressed: {
    requirements: ANALYSIS_REQUIREMENTS,
    example: [
      '<analysis_detail>',
      '【角色動機地圖】',
      '- 每位核心角色：慾望 / 底線 / 觸發點 / 同意邊界',
      '',
      '【權力與張力機制】',
      '- 說明控制/反控制、延宕/釋放的推進規則',
      '',
      '【文風錨點（可執行規則）】',
      '- 列出可直接執行的語氣與句法規則',
      '',
      '【事件與伏筆 ledger】',
      '- 已回收 / 未回收 / 可深化',
      '',
      '【續寫升級建議（穩定 + 大膽）】',
      '- 下一章優先推進 3 件事',
      '',
      '【禁止清單（避免重複與失真）】',
      '- 避免人設漂移與重覆橋段',
      '</analysis_detail>',
      '',
      '<executive_summary>',
      '- 8-12 條可執行 bullet，聚焦後續 Phase 2 決策',
      '</executive_summary>',
    ].join('\n'),
  },
  outlineRaw: {
    requirements: [
      { name: '續寫總目標與篇幅配置' },
      { name: '三至四段情節藍圖' },
      { name: '權力與張力機制' },
      { name: '伏筆回收與新埋規劃' },
    ],
    example: [
      '【續寫總目標與篇幅配置】',
      '- 標出總字數目標、核心主題、節奏原則',
      '',
      '【三至四段情節藍圖】',
      '- 每段：段落標題 / 推進目標 / 角色動機位移',
      '',
      '【權力與張力機制】',
      '- 每段升溫點、釋放點、關係位移',
      '',
      '【伏筆回收與新埋規劃】',
      '- 必回收伏筆與新增伏筆清單',
    ].join('\n'),
  },
  outlineCompressed: {
    requirements: [
      { name: '續寫總目標與篇幅配置' },
      { name: '三至四段情節藍圖' },
      { name: '權力與張力機制' },
      { name: '伏筆回收與新埋規劃' },
    ],
    example: [
      '【續寫總目標與篇幅配置】',
      '- 標出總字數目標、核心主題、節奏原則',
      '',
      '【三至四段情節藍圖】',
      '- 每段：段落標題 / 推進目標 / 角色動機位移',
      '',
      '【權力與張力機制】',
      '- 每段升溫點、釋放點、關係位移',
      '',
      '【伏筆回收與新埋規劃】',
      '- 必回收伏筆與新增伏筆清單',
    ].join('\n'),
  },
  outlinePhase2ACompressed: {
    requirements: [
      { name: '續寫總目標與篇幅配置' },
      { name: '三至四段情節藍圖' },
    ],
    example: [
      '【續寫總目標與篇幅配置】',
      '- 總字數目標、核心主題、整體節奏',
      '',
      '【三至四段情節藍圖】',
      '- 每段：標題 / 推進目標 / 角色動機位移',
    ].join('\n'),
  },
  outlinePhase2ARaw: {
    requirements: [
      { name: '續寫總目標與篇幅配置' },
      { name: '三至四段情節藍圖' },
    ],
    example: [
      '【續寫總目標與篇幅配置】',
      '- 總字數目標、核心主題、整體節奏',
      '',
      '【三至四段情節藍圖】',
      '- 每段：標題 / 推進目標 / 角色動機位移',
    ].join('\n'),
  },
  outlinePhase2BCompressed: {
    requirements: [
      { name: '權力與張力機制' },
      { name: '伏筆回收與新埋規劃' },
    ],
    example: [
      '【權力與張力機制】',
      '- 升溫點 / 釋放點 / 關係位移',
      '',
      '【伏筆回收與新埋規劃】',
      '- 必回收伏筆、可新埋伏筆、風險註記',
    ].join('\n'),
  },
  outlinePhase2BRaw: {
    requirements: [
      { name: '權力與張力機制' },
      { name: '伏筆回收與新埋規劃' },
    ],
    example: [
      '【權力與張力機制】',
      '- 升溫點 / 釋放點 / 關係位移',
      '',
      '【伏筆回收與新埋規劃】',
      '- 必回收伏筆、可新埋伏筆、風險註記',
    ].join('\n'),
  },
  breakdownMeta: {
    requirements: [
      { name: '章節框架總覽' },
      { name: '張力升級與去重守則' },
    ],
    example: [
      '【章節框架總覽】',
      '- 章節數、每章目標字數區間、整體節奏',
      '',
      '【張力升級與去重守則】',
      '- 跨章升級點與避免重複規則',
    ].join('\n'),
  },
  breakdownChunk: {
    requirements: [
      { name: '逐章章節表' },
    ],
    example: [
      '【逐章章節表】',
      '- 只列本次批次章節內容',
    ].join('\n'),
  },
  compressionRoleCards: {
    requirements: [
      { name: '角色卡', aliases: ['Character Cards'] },
    ],
    example: [
      '【角色卡】',
      '- 每位角色：姓名/別稱、身份、核心慾望、弱點、關係網、成長弧、不可改設定',
    ].join('\n'),
  },
  compressionStyleGuide: {
    requirements: [
      { name: '風格指南', aliases: ['Style Guide'] },
    ],
    example: [
      '【風格指南】',
      '- 視角、時態、句長、對話比例、張力節奏、禁忌風格',
    ].join('\n'),
  },
  compressionPlotLedger: {
    requirements: [
      { name: '壓縮大綱', aliases: ['Compression Outline'] },
    ],
    example: [
      '【壓縮大綱】',
      '- 主線/支線節點、伏筆回收狀態、可刪可併建議',
    ].join('\n'),
  },
  compressionEvidencePack: {
    requirements: [
      { name: '證據包', aliases: ['Evidence Pack'] },
    ],
    example: [
      '【證據包】',
      '- 關鍵場景摘錄 + 作用 + 可沿用元素',
    ].join('\n'),
  },
  compressionEroticPack: {
    requirements: [
      { name: '成人元素包', aliases: ['Erotic Pack', '情色元素包'] },
    ],
    example: [
      '【成人元素包】',
      '- 成人主題、權力互動、情境模板、語感錨點、證據片段',
    ].join('\n'),
  },
};

const CONTRACT_MARKER = '【輸出章節契約】';

export function getPromptSectionContract(promptKey: PromptTemplateKey): PromptSectionContract | null {
  return PROMPT_SECTION_CONTRACTS[promptKey] ?? null;
}

export function shouldEnforcePromptSections(promptKey: PromptTemplateKey): boolean {
  return Boolean(PROMPT_SECTION_CONTRACTS[promptKey]);
}

function formatRequirementList(requirements: SectionRequirement[]): string {
  return requirements.map((requirement) => `【${requirement.name}】`).join('、');
}

export function applyPromptSectionContract(
  template: string,
  promptKey: PromptTemplateKey
): string {
  const contract = getPromptSectionContract(promptKey);
  if (!contract) {
    return template;
  }
  if (template.includes(CONTRACT_MARKER)) {
    return template;
  }

  return [
    template.trimEnd(),
    '',
    CONTRACT_MARKER,
    `你必須輸出且僅輸出以下章節標題：${formatRequirementList(contract.requirements)}。`,
    '規則：',
    '- 標題名稱必須完全一致，不可改名或省略。',
    '- 每個章節都必須有實質內容，不可只留空行。',
    '- 不要輸出 JSON、程式碼區塊、前言、結語。',
    '範例骨架：',
    contract.example,
  ].join('\n');
}

export function appendMissingSectionsRetryInstruction(
  prompt: string,
  promptKey: PromptTemplateKey,
  missingSections: string[]
): string {
  const contract = getPromptSectionContract(promptKey);
  if (!contract || missingSections.length === 0) {
    return prompt;
  }
  return [
    prompt.trimEnd(),
    '',
    '【格式修正重試】',
    `上一版缺少章節：${missingSections.map((name) => `【${name}】`).join('、')}。`,
    `請完整重寫並確保輸出包含：${formatRequirementList(contract.requirements)}。`,
    '請直接輸出最終內容，不要解釋。',
  ].join('\n');
}

export function validatePromptSections(
  promptKey: PromptTemplateKey,
  content: string
): SectionValidationResult {
  const contract = getPromptSectionContract(promptKey);
  if (!contract) {
    return { ok: true, missing: [], found: [] };
  }
  return validateRequiredSections(content, contract.requirements);
}

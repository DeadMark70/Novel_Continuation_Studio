export interface PromptContext {
  originalNovel?: string;
  compressedContext?: string;
  characterCards?: string;
  styleGuide?: string;
  compressionOutline?: string;
  evidencePack?: string;
  eroticPack?: string;
  analysis?: string;
  outline?: string;
  breakdown?: string;
  previousChapters?: string[];
  userNotes?: string;
  nextChapterNumber?: number;
  truncationThreshold?: number;
  dualEndBuffer?: number;
  targetStoryWordCount?: number;
  targetChapterCount?: number;
  pacingMode?: 'fixed' | 'curve';
  plotPercent?: number;
  curvePlotPercentStart?: number;
  curvePlotPercentEnd?: number;
  eroticSceneLimitPerChapter?: number;
  compressionOutlineTargetRange?: string;
  compressionChunkCount?: number;
  compressionSampledChunkCount?: number;
  chapterRangeStart?: number;
  chapterRangeEnd?: number;
}

function clampPercent(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(value as number)));
}

function buildPacingRatioSection(context: PromptContext): string {
  const targetStoryWordCount = context.targetStoryWordCount ?? 20000;
  const targetChapterCount = Math.max(1, context.targetChapterCount ?? 5);
  const avgChapterWords = Math.max(1000, Math.round(targetStoryWordCount / targetChapterCount));
  const chapterMin = Math.max(800, Math.floor(avgChapterWords * 0.8));
  const chapterMax = Math.max(chapterMin + 200, Math.ceil(avgChapterWords * 1.2));
  const eroticSceneLimitPerChapter = Math.max(0, Math.min(8, context.eroticSceneLimitPerChapter ?? 2));
  const pacingMode = context.pacingMode ?? 'fixed';

  if (pacingMode === 'curve') {
    const plotStart = clampPercent(context.curvePlotPercentStart, 80);
    const plotEnd = clampPercent(context.curvePlotPercentEnd, 40);
    const eroticStart = 100 - plotStart;
    const eroticEnd = 100 - plotEnd;
    return [
      '- 全書目標配比（曲線升溫）：',
      `  - 前期（約前 30% 章節）劇情/心理/關係推進 ${plotStart}%；親密/色情描寫 ${eroticStart}%。`,
      `  - 後期（約後 30% 章節）劇情/心理/關係推進 ${plotEnd}%；親密/色情描寫 ${eroticEnd}%。`,
      '  - 中段請線性過渡，避免比例突跳。',
      `- 每章字數預算：建議 ${avgChapterWords} 字（可在 ${chapterMin}-${chapterMax} 字浮動）。`,
      '- 每個情節段落必填：`本段劇情:色情 = __:__`、`預估字數 __`、`本段親密戲的劇情功能（至少1項）__`。',
      `- 每章硬限制：親密場景最多 ${eroticSceneLimitPerChapter} 場；若有親密場景，必須帶來可感知的關係位移 + 留下鉤子。`,
      '- 硬規則：任何親密/色情段落必須完成至少 1 個劇情功能（埋伏筆 / 揭露情報 / 權力位置翻轉 / 關係位移）。',
    ].join('\n');
  }

  const plotPercent = clampPercent(context.plotPercent, 60);
  const eroticPercent = 100 - plotPercent;
  return [
    `- 全書目標配比（固定）：劇情/心理/關係推進 ${plotPercent}%；親密/色情描寫 ${eroticPercent}%（兩者合計 100）。`,
    `- 每章字數預算：建議 ${avgChapterWords} 字（可在 ${chapterMin}-${chapterMax} 字浮動）。`,
    '- 每個情節段落必填：`本段劇情:色情 = __:__`、`預估字數 __`、`本段親密戲的劇情功能（至少1項）__`。',
    `- 每章硬限制：親密場景最多 ${eroticSceneLimitPerChapter} 場；若有親密場景，必須帶來可感知的關係位移 + 留下鉤子。`,
    '- 硬規則：任何親密/色情段落必須完成至少 1 個劇情功能（埋伏筆 / 揭露情報 / 權力位置翻轉 / 關係位移）。',
  ].join('\n');
}

/**
 * Replaces placeholders in the format {{VARIABLE}} or [Legacy Placeholder] with actual content.
 */
export function injectPrompt(template: string, context: PromptContext): string {
  let result = template;

  // Modern {{Placeholders}}
  if (context.originalNovel) {
    result = result.replace(/{{NOVEL_TEXT}}/g, context.originalNovel);
    // Legacy support
    result = result.replace(/\x5B插入小說全文\x5D|\x5B插入原始小說全文\x5D/g, context.originalNovel);
  }

  const compressedOrOriginal = context.compressedContext || context.originalNovel || '';
  result = result.replace(/{{COMPRESSED_CONTEXT}}/g, compressedOrOriginal);
  result = result.replace(/{{CHARACTER_CARDS}}/g, context.characterCards || '');
  result = result.replace(/{{STYLE_GUIDE}}/g, context.styleGuide || '');
  result = result.replace(/{{COMPRESSION_OUTLINE}}/g, context.compressionOutline || '');
  result = result.replace(/{{EVIDENCE_PACK}}/g, context.evidencePack || '');
  result = result.replace(/{{EROTIC_PACK}}/g, context.eroticPack || '');
  result = result.replace(
    /{{COMPRESSION_OUTLINE_TARGET_RANGE}}/g,
    context.compressionOutlineTargetRange || '5000-10000'
  );
  result = result.replace(
    /{{COMPRESSION_CHUNK_COUNT}}/g,
    (context.compressionChunkCount ?? 0).toString()
  );
  result = result.replace(
    /{{COMPRESSION_SAMPLED_CHUNK_COUNT}}/g,
    (context.compressionSampledChunkCount ?? 0).toString()
  );

  if (context.analysis) {
    result = result.replace(/{{ANALYSIS_RESULT}}/g, context.analysis);
    // Legacy support
    result = result.replace(/\x5B插入提示詞1的輸出\x5D/g, context.analysis);
  }

  if (context.outline) {
    result = result.replace(/{{OUTLINE_RESULT}}/g, context.outline);
    // Legacy support
    result = result.replace(/\x5B插入提示詞2的輸出\x5D/g, context.outline);
  }

  if (context.breakdown) {
    result = result.replace(/{{CHAPTER_BREAKDOWN}}/g, context.breakdown);
    // Legacy support
    result = result.replace(/\x5B插入提示詞3的輸出\x5D|\x5B插入章節框架\x5D/g, context.breakdown);
  }

  if (context.previousChapters && context.previousChapters.length > 0) {
    const chapters = context.previousChapters;
    const MAX_FULL_CHAPTERS = 2; // Only keep last 2 chapters fully
    const threshold = context.truncationThreshold ?? 800;
    const buffer = context.dualEndBuffer ?? 400;
    
    let chaptersText = '';
    
    if (chapters.length <= MAX_FULL_CHAPTERS) {
      // Include all chapters if 2 or fewer
      chaptersText = chapters.map((ch, i) => `【第 ${i + 1} 章】\n${ch}`).join('\n\n---\n\n');
    } else {
      // Summarize earlier chapters, keep last 2 full
      const earlyChapters = chapters.slice(0, -MAX_FULL_CHAPTERS);
      const recentChapters = chapters.slice(-MAX_FULL_CHAPTERS);
      
      // Create smart dual-end summaries for early chapters
      const summaries = earlyChapters.map((ch, i) => {
        const chapterNum = i + 1;
        // NEVER truncate Chapter 1 or small chapters
        if (chapterNum === 1 || ch.length <= threshold) {
          return `【第 ${chapterNum} 章 - 完整】\n${ch}`;
        }
        
        const head = ch.substring(0, buffer).trim();
        const tail = ch.substring(ch.length - buffer).trim();
        const omitted = ch.length - head.length - tail.length;
        
        return `【第 ${chapterNum} 章 - 摘要】\n${head}\n\n...[中間省略 ${omitted} 字]...\n\n${tail}`;
      }).join('\n\n---\n\n');
      
      // Full text for recent chapters
      const recentTexts = recentChapters.map((ch, i) => {
        const chapterNum = earlyChapters.length + i + 1;
        return `【第 ${chapterNum} 章 - 完整】\n${ch}`;
      }).join('\n\n---\n\n');
      
      chaptersText = `${summaries}\n\n---\n\n${recentTexts}`;
    }
    
    result = result.replace(/{{GENERATED_CHAPTERS}}/g, chaptersText);
    // Legacy support
    result = result.replace(/\x5B插入前面所有已生成的章節\x5D|\x5B已生成的前面章節\x5D/g, chaptersText);
  } else {
    result = result.replace(/{{GENERATED_CHAPTERS}}/g, '尚未生成任何章節。');
  }

  if (context.nextChapterNumber !== undefined) {
    result = result.replace(/{{NEXT_CHAPTER_NUMBER}}/g, context.nextChapterNumber.toString());
  }

  const targetStoryWordCount = context.targetStoryWordCount ?? 20000;
  result = result.replace(/{{TARGET_STORY_WORD_COUNT}}/g, targetStoryWordCount.toString());

  const targetChapterCount = context.targetChapterCount ?? 5;
  result = result.replace(/{{TARGET_CHAPTER_COUNT}}/g, targetChapterCount.toString());
  result = result.replace(/{{CHAPTER_RANGE_START}}/g, (context.chapterRangeStart ?? 1).toString());
  result = result.replace(/{{CHAPTER_RANGE_END}}/g, (context.chapterRangeEnd ?? targetChapterCount).toString());
  result = result.replace(/{{PACING_RATIO_SECTION}}/g, buildPacingRatioSection(context));

  const plotPercent = clampPercent(context.plotPercent, 60);
  const eroticPercent = 100 - plotPercent;
  const curvePlotPercentStart = clampPercent(context.curvePlotPercentStart, 80);
  const curveEroticPercentStart = 100 - curvePlotPercentStart;
  const curvePlotPercentEnd = clampPercent(context.curvePlotPercentEnd, 40);
  const curveEroticPercentEnd = 100 - curvePlotPercentEnd;
  result = result.replace(/{{PLOT_PERCENT}}/g, plotPercent.toString());
  result = result.replace(/{{EROTIC_PERCENT}}/g, eroticPercent.toString());
  result = result.replace(/{{PLOT_PERCENT_START}}/g, curvePlotPercentStart.toString());
  result = result.replace(/{{EROTIC_PERCENT_START}}/g, curveEroticPercentStart.toString());
  result = result.replace(/{{PLOT_PERCENT_END}}/g, curvePlotPercentEnd.toString());
  result = result.replace(/{{EROTIC_PERCENT_END}}/g, curveEroticPercentEnd.toString());
  result = result.replace(
    /{{EROTIC_SCENE_LIMIT_PER_CHAPTER}}/g,
    Math.max(0, Math.min(8, context.eroticSceneLimitPerChapter ?? 2)).toString()
  );

  // Handle User Notes / Direction
  if (context.userNotes) {
    // New automation-friendly conditional blocks
    result = result.replace(/{{USER_DIRECTION_SECTION}}/g, `**用戶的故事方向偏好：**\n${context.userNotes}`);
    result = result.replace(/{{USER_DIRECTION_REQUIREMENT}}/g, `- 特別注意用戶提出的方向偏好，將其自然融入劇情`);
    
    // Legacy support: Try to inject before "---" if no placeholder found
    if (!template.includes('{{USER_DIRECTION_SECTION}}') && !template.includes('{{USER_DIRECTION_REQUIREMENT}}')) {
      const splitIndex = result.lastIndexOf('---');
      if (splitIndex !== -1) {
        const injection = `\n\n【用戶額外指示/劇情走向】\n${context.userNotes}\n\n`;
        result = result.slice(0, splitIndex) + injection + result.slice(splitIndex);
      } else {
        result += `\n\n【用戶額外指示/劇情走向】\n${context.userNotes}`;
      }
    }
  } else {
    // Clear the placeholders if no notes
    result = result.replace(/{{USER_DIRECTION_SECTION}}/g, '');
    result = result.replace(/{{USER_DIRECTION_REQUIREMENT}}/g, '');
  }

  return result;
}

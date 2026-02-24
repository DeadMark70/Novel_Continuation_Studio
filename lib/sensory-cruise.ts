import type { AutoSensoryMappingResult, SensoryAnchorTemplate } from '@/lib/llm-types';
import { getAutoSensoryAnchors } from '@/lib/sensory-mapping';

type SensoryCruisePhase = 'chapter1' | 'continuation';

interface SensoryAutoTemplateByPhase {
  chapter1?: string;
  continuation?: string;
}

export type SensoryCruiseSource = 'none' | 'manual' | 'autoMapping' | 'autoTemplate';

export interface SensoryCruiseResolution {
  source: SensoryCruiseSource;
  anchors?: string;
  templateName?: string;
  autoMappingResult: AutoSensoryMappingResult | null;
  selectedTemplateIds: string[];
  selectedTemplateNames: string[];
  shouldCarryToNextRun: boolean;
}

interface ResolveSensoryCruiseInput {
  stepId: string;
  chapterNumber?: number;
  manualSensoryAnchors?: string;
  autoSensoryMapping: boolean;
  sensoryAnchorTemplates: SensoryAnchorTemplate[];
  sensoryAutoTemplateByPhase: SensoryAutoTemplateByPhase;
  breakdown: string;
  recentlyUsedIds?: string[];
  maxAnchors?: number;
}

function getAutoTemplateId(
  stepId: string,
  sensoryAutoTemplateByPhase: SensoryAutoTemplateByPhase
): string | undefined {
  if (stepId === 'chapter1') {
    return sensoryAutoTemplateByPhase.chapter1;
  }
  if (stepId === 'continuation') {
    return sensoryAutoTemplateByPhase.continuation;
  }
  return undefined;
}

function supportsAutoMapping(stepId: string): stepId is SensoryCruisePhase {
  return stepId === 'chapter1' || stepId === 'continuation';
}

function resolveTemplateNames(
  templates: SensoryAnchorTemplate[],
  templateIds: string[]
): string[] {
  if (templateIds.length === 0) {
    return [];
  }
  const templateMap = new Map(templates.map((entry) => [entry.id, entry.name]));
  return templateIds
    .map((entry) => templateMap.get(entry) || entry)
    .filter((entry) => entry.trim().length > 0);
}

export function resolveSensoryCruiseState({
  stepId,
  chapterNumber,
  manualSensoryAnchors,
  autoSensoryMapping,
  sensoryAnchorTemplates,
  sensoryAutoTemplateByPhase,
  breakdown,
  recentlyUsedIds = [],
  maxAnchors = 2,
}: ResolveSensoryCruiseInput): SensoryCruiseResolution {
  const manualSensory = manualSensoryAnchors?.trim();
  const autoTemplateId = getAutoTemplateId(stepId, sensoryAutoTemplateByPhase);
  const autoTemplate = autoTemplateId
    ? sensoryAnchorTemplates.find((entry) => entry.id === autoTemplateId)
    : undefined;

  const autoMappingResult = (
    !manualSensory &&
    autoSensoryMapping &&
    supportsAutoMapping(stepId) &&
    Number.isFinite(chapterNumber)
  )
    ? getAutoSensoryAnchors({
      templates: sensoryAnchorTemplates,
      breakdown,
      chapterNumber: Number(chapterNumber),
      recentlyUsedIds,
      maxAnchors,
    })
    : null;

  let source: SensoryCruiseSource = 'none';
  let anchors: string | undefined;
  let templateName: string | undefined;
  let selectedTemplateIds: string[] = [];

  if (manualSensory) {
    source = 'manual';
    anchors = manualSensory;
    templateName = 'Manual Override';
  } else if (autoMappingResult?.anchorText?.trim()) {
    source = 'autoMapping';
    anchors = autoMappingResult.anchorText.trim();
    templateName = 'Auto Mapping';
    selectedTemplateIds = autoMappingResult.selectedTemplateIds;
  } else if (autoTemplate?.content?.trim()) {
    source = 'autoTemplate';
    anchors = autoTemplate.content.trim();
    templateName = autoTemplate.name;
    selectedTemplateIds = [autoTemplate.id];
  }

  return {
    source,
    anchors,
    templateName,
    autoMappingResult,
    selectedTemplateIds,
    selectedTemplateNames: resolveTemplateNames(sensoryAnchorTemplates, selectedTemplateIds),
    shouldCarryToNextRun: source !== 'autoMapping',
  };
}

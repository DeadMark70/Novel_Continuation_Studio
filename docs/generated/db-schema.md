# DB Schema (Generated Snapshot)

Source: `lib/db.ts`  
Database name: `NovelContinuationDB`  
Current schema version: `14`

## Tables (v14)

1. `novels`
- key: `++id`
- indexes: `sessionId`, `updatedAt`, `createdAt`
- role: metadata-centric session records

2. `novelBlobs`
- key: `sessionId`
- indexes: `updatedAt`
- role: large text/blob payloads split from `novels`

3. `settings`
- key: `id` (global settings record)
- indexes: `updatedAt`

4. `lorebook`
- key: `id`
- indexes: `novelId`, `type`

## Core Record Shapes

## `NovelEntry` (logical merged view)

- identity: `sessionId`, `sessionName`
- narrative core:
  - `content`
  - `analysis`
  - `outline`
  - `outlineDirection`
  - `breakdown`
  - `chapters[]`
- targets/pacing:
  - `targetStoryWordCount`
  - `targetChapterCount`
  - `pacingMode`, `plotPercent`, `curvePlotPercentStart`, `curvePlotPercentEnd`
  - `eroticSceneLimitPerChapter`
- compression artifacts:
  - `characterCards`
  - `styleGuide`
  - `compressionOutline`
  - `evidencePack`
  - `eroticPack`
  - `compressedContext`
  - `compressionMeta`
- consistency:
  - `consistencyReports[]`
  - `characterTimeline[]`
  - `foreshadowLedger[]`
  - `latestConsistencySummary`
- run metadata:
  - `runStatus`
  - `recoverableStepId`
  - `lastRunAt`
  - `lastRunError`
  - `lastRunId`
- timestamps: `createdAt`, `updatedAt`

## `SettingsEntry`

- provider/model routing:
  - `activeProvider`
  - `providers`
  - `providerDefaults`
  - `modelOverrides`
  - `phaseConfig`
  - `phaseParamOverrides`
  - `phaseParamInheritance`
- compatibility fields:
  - `apiKey`, `selectedModel`, `recentModels`
  - `thinkingEnabled`, `modelCapabilities`
- prompt and generation:
  - `customPrompts`
  - `truncationThreshold`
  - `dualEndBuffer`
- compression settings:
  - `compressionMode`
  - `compressionAutoThreshold`
  - `compressionChunkSize`
  - `compressionChunkOverlap`
  - `compressionEvidenceSegments`
- auto-resume:
  - `autoResumeOnLength`
  - `autoResumePhaseAnalysis`
  - `autoResumePhaseOutline`
  - `autoResumeMaxRounds`
- sensory templates:
  - `sensoryAnchorTemplates`
  - `sensoryAutoTemplateByPhase`
  - `autoSensoryMapping`
- timestamp: `updatedAt`

## Migration Timeline

- v1: `novels`
- v2: add `settings`
- v3: add `sessionId` for session history
- v4: backfill novel targets + settings thinking defaults
- v5: add compression artifacts and defaults
- v6: initialize consistency arrays
- v7: provider split (`nim`/`openrouter`), defaults, phase config
- v8: pacing defaults
- v9: add `novelBlobs` and migrate large payloads out of `novels`
- v10: add/backfill `eroticPack`
- v11: add/backfill auto-resume settings
- v12: add/backfill sensory templates and auto-template mapping
- v13: add `lorebook` table
- v14: add phase-level param override/inheritance defaults

## Notes

- Runtime reads merge `novels` metadata and `novelBlobs` payload to form full `NovelEntry`.
- `sensoryAnchorTemplates[]` now supports optional `povCharacter` for view-safe sensory mapping.
- This file is a generated snapshot. Update it whenever `lib/db.ts` schema or migrations change.

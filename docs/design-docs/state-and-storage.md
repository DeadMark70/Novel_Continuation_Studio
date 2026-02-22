# State And Storage

## State Domains

1. Workflow state (`store/useWorkflowStore.ts`)
- Current step, per-step status/content/error
- Auto mode/range/pause
- Truncation metadata and auto-resume counters

2. Novel state (`store/useNovelStore.ts`)
- Session content and phase artifacts
- Chapter array
- Consistency reports and ledgers

3. Settings state (`store/useSettingsStore.ts`)
- Provider/model/phase routing
- Prompt overrides
- compression and auto-resume knobs
- sensory template settings

4. Run scheduler (`store/useRunSchedulerStore.ts`)
- queue + active runs
- cancellation and interruption handling

## Persistence Model

Database: Dexie (`lib/db.ts`), current schema version 13.

Tables:

- `novels` (metadata-centric, frequent list/query)
- `novelBlobs` (large text payloads split out from metadata)
- `settings`
- `lorebook`

This split reduces heavy list reads and keeps session lookup predictable.

## Performance Principles

- Avoid high-frequency global updates for streaming text.
- Use selectors for store subscriptions in large components.
- Persist at stable milestones, not every stream chunk.

## Migration Strategy

- Increment schema version with explicit upgrade blocks.
- Backfill missing defaults in upgrades.
- Keep backward compatibility fields where needed.

See generated snapshot:

- `docs/generated/db-schema.md`


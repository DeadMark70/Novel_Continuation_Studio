# Project Tracks

This file records major project tracks and their documentation anchors.

## Latest Track

- `provider_routing_settings_history_upgrade_20260211` (implemented)
  - Scope:
    - Add OpenRouter as second provider alongside NIM.
    - Add per-phase provider/model routing (Phase 0-5).
    - Replace modal-centric settings/history UX with full pages (`/settings`, `/history`).
    - Add provider defaults + per-model override model-params pipeline.
    - Expand prompt management UI and context controls on settings page.

- `settings_stability_and_smoke_hardening_20260211` (implemented)
  - Scope:
    - Optimize settings save path using snapshot persistence.
    - Fix prompt draft/default fallback behavior.
    - Add OpenRouter offline guard for E2E and cost safety.
    - Upgrade Playwright smoke checks for stable end-to-end regression coverage.

## Previous Tracks

- `phase0_long_novel_compression_20260210` (implemented)
  - Path: `conductor/archive/phase0_long_novel_compression_20260210/`
  - Scope:
    - Add optional Phase 0 compression before analysis.
    - Add compression controls and downstream compressed-context routing.

- `nim_stream_timeout_resilience_20260209` (implemented)
  - Path: `conductor/archive/nim_stream_timeout_resilience_20260209/`
  - Scope:
    - Inactivity timeout + retry behavior for NIM streaming.

- `workflow_customization_nim_compat_20260207` (implemented)
  - Path: `conductor/archive/workflow_customization_nim_compat_20260207/`
  - Scope:
    - Workflow customization, target placeholders, and NIM capability handling.
\\

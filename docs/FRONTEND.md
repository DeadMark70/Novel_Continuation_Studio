# FRONTEND

## Stack

- Next.js App Router
- React 19
- Tailwind v4
- Radix UI primitives
- Zustand state stores

## Frontend Architecture

- Route pages in `app/`
- Reusable UI primitives in `components/ui/`
- Workflow step panels in `components/workflow/`
- Lorebook editors in `components/lorebook/`

## Performance Rules

1. Prefer selector-based store subscriptions.
2. Avoid broad store object subscriptions in large render trees.
3. Keep streaming updates off global render hot paths when possible.
4. Keep async loops cooperative to avoid event-loop starvation.

## Accessibility Baseline

- Icon-only controls require explicit `aria-label`.
- Dialogs should include title + description.
- Focus-visible styles must remain intact.


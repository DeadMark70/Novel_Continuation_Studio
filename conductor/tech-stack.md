# Technology Stack

## Core Frameworks
- **Frontend:** React 18+
- **Meta-Framework:** Next.js (App Router)
- **Language:** TypeScript

## UI & Styling
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui (Radix UI primitives)
- **Icons:** Lucide React
- **Design Philosophy:** Noir Industrial (High contrast, sharp edges, dark mode)

## State & Data
- **Global State:** Zustand
    - **Workflow Store:** Manages execution phases and global generation locks (`isGenerating` mutex).
    - **Novel Store:** Manages content persistence, session handling, and workflow customization targets (`targetStoryWordCount`, `targetChapterCount`).
    - **Settings Store:** Manages NIM model settings, thinking mode toggle, and model capability cache.
- **Persistence:** IndexedDB with Dexie.js (Schema v4)
    - **Schema:** Session-based storage (`sessionId` index) for multi-run history.
    - **Current Version:** v4 (adds session-level workflow targets and settings capability metadata).

## AI & Integration
- **LLM API:** NVIDIA NIM API
- **Capabilities:** Server-Sent Events (SSE) for real-time streaming output
- **Protocols:**
    - Strict error object detection for HTTP 200 responses.
    - Model capability probing route (`/api/nim/capabilities`) to detect chat/thinking support.
    - Capability semantics differentiate temporary probe failure (`unknown`) vs explicit incompatibility (`unsupported`).
    - Request parameter forwarding safeguards in `/api/nim/generate` (including `chat_template_kwargs`, penalties, and seed).
    - Streaming client uses inactivity timeout with retry on timeout errors for slow models.
    - Route segment duration hint on `/api/nim/generate`: `maxDuration = 300`.

## Development Tools
- **Agent:** Gemini CLI (Coding Agent)
- **Version Control:** Git
- **Standards:** [Engineering Standards](../docs/ENGINEERING_STANDARDS.md)

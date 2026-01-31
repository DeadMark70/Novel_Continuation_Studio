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
    - **Novel Store:** Manages content persistence and session handling.
- **Persistence:** IndexedDB with Dexie.js (Schema v3)
    - **Schema:** Session-based storage (`sessionId` index) for multi-run history.

## AI & Integration
- **LLM API:** NVIDIA NIM API
- **Capabilities:** Server-Sent Events (SSE) for real-time streaming output
- **Protocols:** Strict error object detection for HTTP 200 responses.

## Development Tools
- **Agent:** Gemini CLI (Coding Agent)
- **Version Control:** Git
- **Standards:** [Engineering Standards](../docs/ENGINEERING_STANDARDS.md)

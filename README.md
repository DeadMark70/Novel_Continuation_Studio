# Novel Continuation Studio

> [!CAUTION]
> **Research Prototype - Use at Your Own Risk**  
> This project is a personal research prototype designed for experimenting with specific AI-assisted writing workflows. It is currently in an **experimental alpha state** and contains significant known bugs, stability issues, and unoptimized code paths.
>
> - **Data Loss**: There is no cloud sync. All data is stored locally in your browser (IndexedDB). Clearing your browser cache **will delete all your novels**.
> - **Cost**: This tool consumes high-end LLM APIs (Claude 3.5 Sonnet, GPT-4o, etc.). Monitor your usage carefully.
> - **Support**: There is no active support or maintenance provided.

## Overview

**Novel Continuation Studio** is a specialized local-first writing environment designed to explore **Phase-Based Narrative Generation**. Unlike generic chat interfaces, this studio treats story writing as a structured pipeline, moving from high-level context compression to granular scene drafting.

It implements a **Hybrid AI Architecture**:

- **Routing Integration**: Uses **OpenRouter** for high-intelligence reasoning (e.g., Anthropic Claude 3.5 Sonnet, OpenAI GPT-4o) and **NVIDIA NIM** for low-latency, cost-effective inference.
- **Structured Workflows**: Enforces a strict creative process: `Compression` -> `Analysis` -> `Outline` -> `Breakdown` -> `Drafting`.

## Architecture & Workflows

The system is built around a unidirectional data flow that mimics a professional writer's planning process:

1.  **Context Compression**:
    - Consolidates previous chapters and established lore into a token-efficient summary.
    - _Goal_: Maintain long-term narrative consistency without exceeding context windows.

2.  **Consistency Analysis**:
    - Evaluates the current state of the story against character profiles and world-building rules.
    - _Goal_: Detect plot holes or character drift before generating new text.

3.  **Outlining (Scene Planning)**:
    - Generates high-level beats for the upcoming chapter using reasoning models.
    - _Goal_: Ensure pacing and structural integrity.

4.  **Scene Breakdown**:
    - Expands outline beats into detailed beat-by-beat instructions.
    - _Goal_: Provide granular guidance for the drafting model.

5.  **Drafting (Continuation)**:
    - Executes the final prose generation based on the breakdown.
    - _Goal_: High-quality literary output.

## Technical Stack

This project is a modern **Next.js** application leveraging a local-first philosophy.

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript / React 19
- **Styling**: TailwindCSS v4
- **State Management**: `zustand` (Separated stores for Settings, Novel Data, and Execution State)
- **Persistence**: `Dexie.js` (IndexedDB wrapper) for robust client-side storage
- **Validation**: `zod` for strict schema validation of LLM outputs
- **Testing**:
  - Unit: `Vitest`
  - E2E: `Playwright`

## Getting Started

### Prerequisites

- **Node.js**: v20.10.0 or higher is required.
- **API Keys**: You must have access to:
  - [OpenRouter](https://openrouter.ai/) (for primary reasoning models)
  - [NVIDIA NIM](https://build.nvidia.com/explore/discover) (optional, for specific fast models)

### Installation

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/your-username/novel-continuation-studio.git
    cd novel-continuation-studio
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    # or
    pnpm install
    ```

3.  **Configure Environment**:
    Create a `.env.local` file in the root directory:

    ```bash
    # Required for core functionality
    OPENROUTER_API_KEY=sk-or-your-key-here

    # Optional: For specialized routing
    NIM_API_KEY=nvapi-your-key-here

    # Optional: OpenRouter attribution
    OPENROUTER_SITE_URL=http://localhost:3000
    OPENROUTER_SITE_NAME=NovelContinuationStudio
    ```

4.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    Access the application at `http://localhost:3000`.

## Quality Assurance

The project includes a suite of tests to ensure basic stability of the prompt engine and data persistence details.

```bash
# Run unit tests
npm test

# Run E2E smoke tests (requires Playwright browsers)
npx playwright install --with-deps chromium
npm run e2e
```

## Known Limitations

- **Browser Storage**: Database size is limited by your browser's IndexedDB quota. Large projects with many versions may hit this limit.
- **Context Window**: Extremely long novels may degrade consistency if the compression phase fails to capture key details.
- **Mobile Support**: The UI is optimized for desktop usage; mobile experience is currently broken/unsupported.

---

_Verified locally on Windows 11 / Node v20.11.0_

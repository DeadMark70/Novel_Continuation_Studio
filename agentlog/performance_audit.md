# Performance & API Audit

## 1. SSE & Streaming Efficiency
- **Findings**: The API routes (e.g., `app/api/nim/generate/route.ts`) act as transparent proxies. They use `NextResponse(response.body)` to stream the raw response from the provider directly to the client.
- **Strength**: Zero buffering on the server, minimal latency, and low memory footprint.
- **Observation**: Abort signals are correctly propagated from the client to the upstream provider, preventing "zombie" generations that waste tokens.

## 2. Phase 0 Compression Pipeline
- **Parallelization**: Tasks (Role Cards, Style Guide, Plot Ledger, Evidence Pack) are executed in parallel with a concurrency of 4. This significantly reduces the total wall-clock time for Step 0.
- **Sampling Strategy**: Instead of processing 100% of long source texts, the pipeline uses `selectRepresentativeChunks`. 
    - **Performance Gain**: Reduces input token count by ~60-80% for very long novels while still capturing the narrative arc.
- **Heuristic Synthesis**: The final "Compressed Context" is assembled programmatically in `lib/compression.ts`, saving an additional LLM turn and reducing total latency.

## 3. Context Window Management
- **Strategy**: Dual-End Truncation for history.
    - Keeps the last 2 chapters in full.
    - Summarizes earlier chapters by keeping the head and tail (buffer of ~400 chars).
- **Efficiency**: Effectively prevents context overflow without losing the "thread" of the story. 

## 4. Client-Side Rendering Bottlenecks
- **Findings**: `hooks/useStepGenerator.ts` updates the Zustand store on every single chunk received from the stream.
- **Issue**: High-speed streaming (NIM) can produce 50+ chunks per second. Triggering a React re-render for every chunk causes high CPU usage and can lead to UI jank or input lag.
- **Risk**: Medium. Most noticeable on lower-end devices or during very long generations.
- **Optimization**: Implement a 100ms throttle for `updateStepContent` updates during active streaming.

## 5. Token Estimation
- **Findings**: Currently uses character-based heuristics.
- **Opportunity**: Transition to a more accurate tokenizer (like `tiktoken` or `gpt-tokenizer`) in a web worker to improve the accuracy of truncation decisions without blocking the main thread.

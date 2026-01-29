# Track Specification: Core App & Novel Management

## 1. Overview
This track focuses on bootstrapping the application and implementing the first critical module: **Novel Management**. We will establish the "Noir Industrial" visual identity, set up the state management architecture, and allow users to upload or paste their initial novel text for analysis.

## 2. Goals
-   Initialize the Next.js application with the defined Tech Stack.
-   Implement the "Noir Industrial" design system (Tailwind + shadcn/ui).
-   Set up the persistent storage layer (IndexedDB via Dexie).
-   Create the `StoryUpload` component for text input.
-   Implement basic text statistics (Word Count).

## 3. User Stories
-   As a user, I want to see a dark, atmospheric interface when I open the app.
-   As a user, I want to paste my existing novel text into the app.
-   As a user, I want to upload a `.txt` file containing my novel.
-   As a user, I want to see the word count of my uploaded text.
-   As a user, I want my uploaded text to be saved automatically so I don't lose it if I refresh.

## 4. Technical Components

### 4.1. Project Structure
-   `app/layout.tsx`: Global layout with ThemeProvider.
-   `app/page.tsx`: Main entry point (initially showing the Upload view).

### 4.2. State Management (`store/useNovelStore.ts`)
-   **State:** `originalNovel` (string), `wordCount` (number).
-   **Actions:** `setNovel(content: string)`, `loadFromStorage()`.

### 4.3. Storage (`lib/storage.ts`)
-   **Database:** `NovelDB` (Dexie).
-   **Tables:** `novels` (id, content, timestamp).

### 4.4. UI Components
-   `components/ui/*`: shadcn/ui primitives (Button, Textarea, Card, etc.).
-   `components/StoryUpload.tsx`: The main input area. Supports drag-and-drop file upload and direct text pasting.
-   `components/NovelStats.tsx`: Simple display for word count.

## 5. Design Requirements
-   **Theme:** Dark mode only. Background `#0a0a0a`. Accents `#00f0ff` (Cyan) or `#ff003c` (Crimson).
-   **Typography:** Sans-serif for UI, Monospace for stats.

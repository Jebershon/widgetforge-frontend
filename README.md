# WidgetForge — AI Mendix Widget Generator

> Phase 1: Frontend UI — Vite + React + TypeScript (SWC)

## Stack
- **Vite 5** with `@vitejs/plugin-react-swc` (SWC compiler)
- **React 18** + **TypeScript 5** (strict mode)
- **Zustand** for global state management
- **CSS Modules** for scoped styling (no Tailwind, no CSS-in-JS)
- `clsx` for conditional class composition

## Project Structure

```
widgetforge/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── package.json
└── src/
    ├── main.tsx               # Entry point
    ├── App.tsx                # Root layout (3-column grid)
    ├── App.module.css
    ├── styles/
    │   └── globals.css        # Design system tokens (CSS variables)
    ├── types/
    │   └── index.ts           # All TypeScript interfaces
    ├── store/
    │   └── useStore.ts        # Zustand store (chat, build, files)
    ├── hooks/
    │   └── useBuildSimulation.ts   # Drives the pipeline animation
    ├── utils/
    │   └── mockData.ts        # Mock generated file content
    └── components/
        ├── AppHeader.tsx/.module.css     # Top bar: logo, status, nav
        ├── ChatPanel.tsx/.module.css     # Left: prompt input + chat
        ├── MainPanel.tsx/.module.css     # Center: terminal, code, preview, pipeline
        └── ArtifactsPanel.tsx/.module.css # Right: download card + history
```

## Setup

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`

The Vite dev server proxies:
- `/api/*` → `http://localhost:8000` (Phase 2: FastAPI backend)
- `/ws/*`  → `ws://localhost:8000`  (Phase 2: WebSocket build logs)

## UI Panels

| Panel | Description |
|---|---|
| **Prompt Studio** (left) | Chat interface for AI generation, quick-start tags, and manual toggle |
| **Manual Bundle** (left) | Editor for XML, TSX, CSS, and dependencies to package custom widgets |
| **Build Log** (center) | Live terminal with ANSI color support, code viewer, and formatted errors |
| **Pipeline** (bottom) | Visual tracking of the 8-step build and packaging process |
| **Artifacts** (right) | Real-time download for `.mpk` files and persistent build history |

## Phase Roadmap

- ✅ **Phase 1** — Web Widgets (Development complete — Full AI & Manual orchestration)
- ⬜ **Phase 2** — Native Widgets (Mobile-first widget scaffolding and bundling)
- ⬜ **Phase 3** — Internal LLM Integration (Direct code generation within the tool via API)

## Design Tokens

All colors, fonts and spacing live in `src/styles/globals.css` as CSS custom properties on `:root`. The palette is a dark developer-tool theme:

- `--bg-base` / `--bg-surface` / `--bg-elevated` — layered surfaces
- `--accent-blue` (#2563eb) + `--accent-cyan` (#06b6d4) — brand accents
- `--success` / `--warn` / `--danger` — semantic states
- `--font-ui`: Familjen Grotesk | `--font-mono`: JetBrains Mono

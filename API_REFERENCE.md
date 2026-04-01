# WidgetForge — API Reference & Project Documentation

## Overview

**WidgetForge** is a full-stack platform that generates and bundles custom Mendix pluggable widgets. It combines a modern React frontend with a Node.js backend to provide a seamless widget development experience — from code generation to `.mpk` download.

### Two Core APIs

| API | Purpose |
|---|---|
| **`POST /api/generate`** | AI-driven: describe a widget in plain English → receive generated XML/TSX/CSS code |
| **`POST /api/bundle`** | Manual: supply your own XML, TSX, CSS, and deps → server compiles and packages a `.mpk` |

Both APIs stream detailed terminal logs with ANSI color support for easier debugging in the frontend.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                        │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐               │
│  │  Sidebar     │  │ BundlePanel │  │  MainPanel   │               │
│  │  (Mode       │  │ (Monaco     │  │  (Build Logs │               │
│  │   Switcher)  │  │  Editors)   │  │   + Preview) │               │
│  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘               │
│         │                 │                 │                        │
│         └────────────┬────┘─────────────────┘                       │
│                      │                                              │
│              Zustand Store (Global State)                           │
│              AI Settings Modal (Provider, Key, Model)               │
└──────────────────────┬──────────────────────────────────────────────┘
                       │  HTTP (JSON / File Download)
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js + Express)                     │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐          │
│  │ aiService.ts │  │ scaffoldWidget│  │ buildWidgetPkg() │          │
│  │ (Gemini /    │  │ .ts (Yeoman  │  │ (Orchestrator)   │          │
│  │  OpenAI /    │  │  Generator)  │  │                  │          │
│  │  Anthropic)  │  │              │  │                  │          │
│  └──────────────┘  └──────────────┘  └──────────────────┘          │
│                                                                     │
│  Build Pipeline: Scaffold → Inject → Correct → Build → MPK Patch   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
widgetforge/
├── API_REFERENCE.md          ← This file
├── prompt.md                 ← AI prompt guide & system prompt
├── index.html                ← Frontend entry point (Vite)
├── vite.config.ts
├── tsconfig.app.json
├── package.json              ← Root: frontend deps (React, Vite)
│
├── src/                      ← Frontend (React + Vite)
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/           ← UI panels
│   │   ├── BundlePanel/      ← Multi-tab code editor (XML/TSX/CSS/JSON/Utils)
│   │   ├── MainPanel/        ← Build log viewer + live preview
│   │   ├── Sidebar/          ← Mode switcher + navigation
│   │   ├── DocsView/         ← In-app documentation modal
│   │   └── ChatPanel/        ← AI chat interface
│   ├── hooks/
│   ├── store/                ← Zustand global state (with platform backup/restore)
│   ├── styles/
│   ├── types/
│   └── utils/
│       └── typeAcquisition.ts ← Auto-downloads @types for npm packages in Monaco
│
└── server/                   ← Backend (Node.js + Express + TypeScript)
    ├── package.json          ← Server deps (express, adm-zip, openai, etc.)
    ├── tsconfig.json
    ├── .env                  ← AI keys and config (not committed)
    ├── dist/                 ← Compiled JS output (tsc)
    ├── temp/                 ← Ephemeral widget build dirs (auto-cleaned)
    └── src/
        ├── index.ts          ← Main Express server + build orchestration
        └── services/
            ├── aiService.ts       ← Gemini / OpenAI / Anthropic provider
            └── scaffoldWidget.ts  ← Mendix widget project scaffolding
```

---

## Build Pipeline Deep Dive

When `/api/bundle` is called, the backend executes this pipeline:

### Phase 1 — Scaffold
Uses Yeoman Engine with `@mendix/generator-widget` to create a clean Mendix widget project in a temporary directory (`server/temp/<timestamp>-<WidgetName>/`).

### Phase 2 — Inject Code
- Writes your XML to `src/<WidgetName>.xml`
- Writes your TSX to `src/<WidgetName>.tsx`
- Writes your CSS to `src/ui/<WidgetName>.css`
- Writes uploaded utility files to `src/utils/`

### Phase 3 — Auto-Correct
The server applies a series of corrections to handle common AI mistakes:

| Correction | What It Does |
|---|---|
| **Widget ID normalisation** | Ensures `id="com.widgetforge.<namelower>.<Name>"` |
| **PropertyGroup wrapping** | Adds `<propertyGroup caption="General">` around orphaned `<property>` tags |
| **Invalid XML tag removal** | Strips `<translatable>`, `<minimumValue>`, `<maximumValue>`, `<defaultValue>` (as child elements), `<isList>`, `<required>`, `<isDefault>`, `<onChange>` |
| **XML declaration normalisation** | Ensures exactly one `<?xml version="1.0" encoding="utf-8"?>` |
| **CSS import injection** | Adds `import "./ui/<Name>.css";` to the TSX if CSS is provided |
| **Mendix import stripping** | Removes any `import ... from "mendix/*"` or `@mendix/*` lines |
| **Bare createElement removal** | Strips standalone `createElement` imports (the `React.createElement` reference handles it) |
| **Properties element** | Ensures `<properties>` element always exists in XML (Mendix requires it) |

### Phase 4 — Build
Runs `npm install --legacy-peer-deps` followed by `npm run build` (Mendix pluggable-widgets-tools Rollup pipeline). Build timeout is 10 minutes.

### Phase 5 — MPK Patch (Web Only)
Mendix build tools do **not** automatically include `.css` files in the `.mpk`. The server fixes this:
1. Reads the CSS file from `src/ui/<Name>.css`
2. Opens the `.mpk` (ZIP) with `adm-zip`
3. Injects the CSS at `com/widgetforge/<namelower>/ui/<Name>.css`
4. Updates `package.xml` manifest to reference the new CSS file
5. Writes the patched `.mpk`

### Phase 6 — Deliver & Cleanup
The `.mpk` is streamed to the browser. The temp build directory is deleted immediately after download (or on error).

---

## Environment Variables (`server/.env`)

| Variable          | Description                                        | Example              |
|-------------------|----------------------------------------------------|----------------------|
| `PORT`            | Server port                                        | `8000`               |
| `AI_PROVIDER`     | Default AI provider if not provided by Frontend UI | `gemini`             |

> **Note:** API keys and AI model selection are now configured from the frontend Settings modal and passed to the backend per-request, not stored in `.env`.

---

## Running the Server

```powershell
# 1. Build
cd server
.\node_modules\.bin\tsc

# 2. Create dist/package.json (forces CommonJS — run once)
node -e "require('fs').writeFileSync('dist/package.json', JSON.stringify({type:'commonjs'}))"

# 3. Start
node dist/index.js
```

Server starts on `http://localhost:8000`.

---

## API Endpoints

### `GET /api/health`
Returns server status.

```bash
curl http://localhost:8000/api/health
```

---

### `POST /api/ai/test`
Tests connectivity to the configured AI provider.

**Body:**
| Field         | Type   | Required | Description                             |
|---------------|--------|----------|-----------------------------------------|
| `aiProvider`  | string | ✅       | `"gemini"`, `"openai"`, or `"anthropic"` |
| `apiKey`      | string | ✅       | API key for the chosen provider         |
| `aiModel`     | string | ✅       | Specific model name                     |

```bash
curl -X POST http://localhost:8000/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{
    "aiProvider": "gemini",
    "apiKey": "your_api_key_here",
    "aiModel": "gemini-1.5-pro"
  }'
```

---

### `POST /api/generate` — AI Generation Mode

**Body:**
| Field         | Type   | Required | Description                             |
|---------------|--------|----------|-----------------------------------------|
| `widgetName`  | string | ✅       | PascalCase widget name                  |
| `description` | string | ✅       | Plain-English widget description for AI |
| `platform`    | string | ❌       | `"web"` (default) or `"native"`         |
| `aiProvider`  | string | ❌       | `"gemini"`, `"openai"`, or `"anthropic"` |
| `apiKey`      | string | ❌       | API key for the chosen provider         |
| `aiModel`     | string | ❌       | Specific model name                     |

**Returns:** JSON with generated code (XML, TSX, CSS, dependencies).

> **💡 Iterative Chat Context:** The `/api/generate` endpoint is stateless. However, the Frontend UI's Chat panel automatically concatenates your chat history into the `description` field. This enables iterative widget refinement (e.g. asking "Now add sorting" will intelligently build upon your previous prompts). **If you want to create an entirely new widget, you must refresh the page to clear the chat history first**, otherwise the AI will merge the requirements of both widgets!

```bash
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "widgetName": "NeonStory",
    "description": "A widget that displays a simple h1 tag containing some small story, styled with a modern dark theme and a neon pink glow."
  }' \
  --output NeonStory.mpk
```

---

### `POST /api/bundle` — Manual Bundle Mode

**Body:**
| Field          | Type   | Required | Description                                          |
|----------------|--------|----------|------------------------------------------------------|
| `widgetName`   | string | ✅       | PascalCase widget name                               |
| `description`  | string | ✅       | Human-readable description                           |
| `aiXml`        | string | ✅       | Full Mendix widget XML definition                    |
| `aiTsx`        | string | ✅       | Full React TSX component (must export named fn)      |
| `aiCss`        | string | ❌       | CSS to bundle and inject into the `.mpk`             |
| `dependencies` | object | ❌       | Extra npm packages `{"pkg": "^version"}`             |
| `platform`     | string | ❌       | `"web"` (default) or `"native"`                      |
| `utilFiles`    | array  | ❌       | Array of `{name: string, content: string}` util files |

**Returns:** A downloadable `.mpk` file.

> **Widget ID Convention:** Must follow `com.widgetforge.<widgetnamelowercase>.<WidgetName>`  
> The server auto-corrects this if needed.

---

## Frontend Architecture

### Tech Stack
| Technology | Role |
|---|---|
| **React 18 + TypeScript** | Type-safe component architecture |
| **Zustand** | Lightweight global state management |
| **Monaco Editor** | VS Code engine with IntelliSense, auto-type acquisition |
| **Vite** | Near-instant HMR and build tooling |
| **clsx** | Conditional CSS class composition |
| **esm.sh** | Browser-side NPM package resolution for live preview |

### Key Components
| Component | Responsibility |
|---|---|
| **BundlePanel** | Multi-tab editor (XML, TSX, CSS, JSON, Utils) with metadata controls |
| **MainPanel** | Streaming build log viewer + live widget preview |
| **Sidebar** | Mode switcher (Manual Bundle / AI Generate) + navigation |
| **DocsView** | In-app documentation modal (Front-end Guide + API Reference) |
| **ChatPanel** | AI chat interface for prompt-based generation |

### State Management (Zustand Store)
The store manages:
- Widget metadata (name, description, platform)
- Code state (XML, TSX, CSS, dependencies JSON, uploaded utils)
- Platform backup/restore (web ↔ native code swap)
- Build status and log entries
- AI configuration (provider, key, model)

### Auto-Type Acquisition
When the user types an `import` statement or adds a package to the dependencies JSON, WidgetForge:
1. Parses import statements and deps JSON for package names
2. Fetches `@types/<pkg>` declarations from CDN
3. Registers them with Monaco's TypeScript language service
4. Provides full IntelliSense for third-party packages

---

## Example Payloads

All examples below can be run directly as `curl` commands.

---

### 1. NeonCalculator — Dark neon calculator

```bash
curl -X POST http://localhost:8000/api/bundle \
  -H "Content-Type: application/json" \
  -d '{
  "widgetName": "NeonCalculator",
  "description": "A dark, neon-themed beautiful calculator.",
  "aiXml": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<widget id=\"com.widgetforge.neoncalculator.NeonCalculator\" pluginWidget=\"true\" needsEntityContext=\"false\" offlineCapable=\"true\" supportedPlatform=\"Web\" xmlns=\"http://www.mendix.com/widget/1.0/\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.mendix.com/widget/1.0/ ../node_modules/mendix/custom_widget.xsd\">\n    <name>Neon Calculator</name>\n    <description>A dark, neon-themed beautiful calculator.</description>\n    <properties>\n        <propertyGroup caption=\"General\">\n            <property key=\"themeColor\" type=\"string\" required=\"false\" defaultValue=\"#ff00ff\">\n                <caption>Neon Color</caption>\n                <description>Color of the neon glow.</description>\n            </property>\n        </propertyGroup>\n    </properties>\n</widget>",
  "aiCss": ".neon-calc-container { background: #111; padding: 20px; border-radius: 12px; border: 2px solid var(--neon-color, #f0f); box-shadow: 0 0 15px var(--neon-color, #f0f); color: white; max-width: 300px; margin: auto; font-family: '\''Inter'\'', sans-serif; }\n.neon-calc-display { padding: 15px; font-size: 2rem; text-align: right; background: #222; border-radius: 8px; margin-bottom: 20px; }\n.neon-calc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }\n.neon-calc-btn { background: #222; border: 1px solid #333; color: white; font-size: 1.2rem; padding: 15px; border-radius: 8px; cursor: pointer; transition: all 0.3s; }\n.neon-calc-btn:hover { background: #333; box-shadow: 0 0 10px var(--neon-color, #f0f); }\n.neon-calc-btn.op { color: var(--neon-color, #f0f); font-weight: bold; }",
  "aiTsx": "import React, { createElement, useState } from '\''react'\'';\n\nexport interface NeonCalculatorProps {\n  themeColor?: string;\n}\n\nexport function NeonCalculator({ themeColor = '\''#ff00ff'\'' }: NeonCalculatorProps) {\n  const [display, setDisplay] = useState('\''0'\'');\n  const handleBtn = (val: string) => {\n    if (val === '\''C'\'') setDisplay('\''0'\'');\n    else if (val === '\''='\'') setDisplay(prev => String(eval(prev)));\n    else setDisplay(prev => prev === '\''0'\'' ? val : prev + val);\n  };\n  return createElement('\''div'\'', { className: '\''neon-calc-container'\'', style: { '\''--neon-color'\'': themeColor } },\n    createElement('\''div'\'', { className: '\''neon-calc-display'\'' }, display),\n    createElement('\''div'\'', { className: '\''neon-calc-grid'\'' },\n      ...['C','/','*','-','7','8','9','+','4','5','6','1','2','3','0','.','='].map(b =>\n        createElement('\''button'\'', { key: b, className: `neon-calc-btn ${['\''/'\'','\''*'\'','\''-'\'','\''+'\'','\''C'\'','\''='\''].includes(b)?'\''op'\'':'\'''\''}`  , onClick: () => handleBtn(b) }, b)\n      )\n    )\n  );\n}"
}' \
  --output NeonCalculator.mpk
```

---

## Key Architecture Notes

### CSS in Mendix Widgets
Mendix build tools (`mx-widget-tools`) do not automatically include `.css` files in the bundled `.mpk`. The server works around this with a post-build step that:
1. Reads the CSS buffer from `src/ui/WidgetName.css`
2. Uses `adm-zip` to inject it directly into the `.mpk` archive
3. Updates the `package.xml` manifest to reference the file

### ANSI Log Rendering
The frontend automatically converts backend terminal escape codes into colored, styled React elements. This ensures that Rollup/TypeScript errors are easily readable in the "Build Log" and "Errors" tabs.

### Widget ID Convention
IDs must follow the pattern: `com.widgetforge.<widgetnamelowercase>.<WidgetName>`  
Example: `com.widgetforge.neoncalculator.NeonCalculator`

The server auto-corrects non-conforming IDs at build time.

### Environment & Cleanup
- Subdirectories created in `server/temp/` during the build process are automatically cleaned up after the download completes or upon error.
- The server is built using `npm run build` which populates the `dist/` directory.

### Utility File Support
- The `utilFiles` array in the `/api/bundle` request body accepts `{name, content}` objects.
- Files are written to `src/utils/` in the scaffold before the build.
- Import statements are auto-generated in the TSX editor on the frontend.

### Platform Support
- **Web** (Phase 1 — Complete): Full widget generation with CSS injection.
- **Native** (Phase 2 — In Progress): Mobile scaffolding with platform-specific boilerplate.
- Code is backed up and restored when switching between Web and Native in the frontend.

---

*Last Updated: March 2026*

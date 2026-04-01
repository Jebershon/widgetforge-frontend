# WidgetForge — AI Code Generation Guide
### Generate Mendix Pluggable Widgets using any AI tool

> **Compatible with:** Claude, ChatGPT, Gemini, Mistral, and local models (Ollama, LM Studio, etc.)  
> **Target Platform:** Mendix 10+ Web | React 19 | WidgetForge Manual Bundle Mode

---

## 🏗️ Platform Architecture at a Glance

WidgetForge is a **full-stack Mendix widget factory** — a React + Vite frontend paired with a Node.js + Express backend that takes raw code blocks (XML, TSX, CSS, JSON) and produces a production-ready `.mpk` file you can drop into Mendix Studio Pro.

### How the Build Pipeline Works (End-to-End)

```
┌──────────────────────────────────────────────────────────────────────┐
│                        YOU (or an AI agent)                         │
│   Provide: Widget Name · Description · XML · TSX · CSS · JSON deps │
└──────────────────────┬───────────────────────────────────────────────┘
                       │  POST /api/bundle
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  1. SCAFFOLD — Yeoman + @mendix/generator-widget creates a clean   │
│     Mendix widget project structure in a temp directory.            │
├──────────────────────────────────────────────────────────────────────┤
│  2. INJECT — Your XML, TSX, CSS, and any uploaded utility files     │
│     are written into the scaffolded project.                        │
├──────────────────────────────────────────────────────────────────────┤
│  3. CORRECT — Auto-fix pass:                                        │
│     • Widget ID normalised to com.widgetforge.<name>.<Name>         │
│     • Bare `createElement` imports stripped (React default handles) │
│     • Mendix/@mendix hallucinated imports removed                   │
│     • Missing <propertyGroup> wrappers added to XML                 │
│     • Invalid XML child tags (translatable, minimumValue…) purged   │
│     • CSS import line injected into TSX for the Rollup build        │
│     • XML declaration normalised to <?xml version="1.0"…?>          │
├──────────────────────────────────────────────────────────────────────┤
│  4. BUILD — `npm install --legacy-peer-deps` + `npm run build`      │
│     (Mendix pluggable-widgets-tools Rollup pipeline)                │
├──────────────────────────────────────────────────────────────────────┤
│  5. MPK PATCH — Post-build: CSS file injected into .mpk ZIP via     │
│     adm-zip, package.xml manifest updated to register the asset.    │
├──────────────────────────────────────────────────────────────────────┤
│  6. DELIVER — .mpk streamed to the browser for download. Temp       │
│     directory automatically cleaned up.                              │
└──────────────────────────────────────────────────────────────────────┘
```

### Two Modes of Operation

| Mode | Endpoint | What You Provide | What Happens |
|---|---|---|---|
| **AI Generation** | `POST /api/generate` | Widget name + plain-English description | AI generates XML/TSX/CSS → server builds → `.mpk` returned |
| **Manual Bundle** | `POST /api/bundle` | Widget name + XML + TSX + optional CSS/JSON deps | Server builds your code directly → `.mpk` returned |

### New Features & Capabilities

| Feature | Description |
|---|---|
| **Multi-AI Provider Support** | Gemini, OpenAI, and Anthropic — configured from the frontend settings modal, not `.env` |
| **TSX-First Workflow** | All code generation and editing uses TypeScript TSX (not JSX) |
| **Utility File Uploads** | Drop `.js`/`.ts` helper files into the Utils tab — they're bundled into the `.mpk` and auto-imported |
| **Live Preview** | Real-time widget rendering using mock Mendix props in the browser |
| **Monaco Editor** | Full VS Code editing experience with IntelliSense, auto-type acquisition for npm packages |
| **Platform Switching** | Toggle between Web and Native (Phase 2) — code is backed up/restored per platform |
| **ANSI Build Logs** | Color-coded terminal output streamed to the browser for easy debugging |
| **Auto-Corrections** | Server fixes Widget IDs, strips bad imports, wraps properties, normalises XML |

---

## 🧠 Understanding WidgetForge Before You Prompt

Before generating code, know what WidgetForge does **for you automatically** so you don't fight it:

| WidgetForge handles automatically | You must get right in the prompt |
|---|---|
| CSS injection into the `.mpk` archive | Correct XML structure & property groups |
| Fixing malformed Widget IDs in XML | `import React` default import in TSX |
| Stripping bad Mendix library imports | Using `createElement` — NOT JSX |
| Running `npm install` & `npm run build` | Scoping all CSS to `.widget-yourwidgetname` |
| Packaging the final `.mpk` file | Valid JSON for the dependencies block |
| Adding `<propertyGroup>` wrappers if missing | Named export (not `export default`) |
| Removing invalid XML child tags | Proper Props interface matching XML keys |
| Injecting CSS import line into TSX | Guard optional props with `?.` |
| Normalising XML declaration | Use `createElement()` for all elements |

---

## ✅ The 4 Non-Negotiable Rules (Read Before Prompting)

These rules exist because of how the Mendix Rollup build pipeline works internally. Breaking any one of them causes a build failure.

> **RULE 1 — NO JSX syntax.**  
> Write `createElement("div", { className: "foo" }, "Hello")` — never `<div className="foo">Hello</div>`.  
> The Mendix build uses `"jsx": "react"` in tsconfig (classic transform), not the modern JSX runtime.

> **RULE 2 — ALWAYS import React as default.**  
> Every TSX file MUST start with:  
> `import React, { createElement, useState, useRef, useEffect, useCallback } from "react";`  
> Missing the default `React` import causes error `TS2552: Cannot find name 'createElement'`.

> **RULE 3 — NO Mendix library imports.**  
> Never import from `mendix/`, `@mendix/`, `mendix/components/*`, or use globals like `mx.ui.*`.  
> WidgetForge provides its own mock environment. These imports break the preview and the build.

> **RULE 4 — NO CSS import line in TSX.**  
> Do NOT write `import "./ui/WidgetName.css";` in the TSX file.  
> WidgetForge injects CSS into the `.mpk` binary directly. That import line causes a build error.

---

## 🤖 The System Prompt (Copy & Paste into Any AI Agent)

This is the **complete system prompt** you should use when asking any AI (ChatGPT, Claude, Gemini, Copilot, local models, etc.) to generate a WidgetForge-compatible widget. Replace everything inside `[square brackets]` with your requirements. The rest must stay exactly as written.

```
ACT AS a Senior Mendix and React developer. Generate a production-ready Mendix 10 Pluggable Widget for WidgetForge.

WIDGET NAME: [e.g., ColorPicker]
WIDGET FUNCTION: [e.g., A circular HSL color picker that writes a hex string to a Mendix attribute]
EXTRA PROPERTIES: [e.g., showOpacity: boolean toggle, labelText: string]
INTERACTIONS: [e.g., clicking a swatch confirms the color; clear button resets to null]

════════════════════════════════════════════
OUTPUT FORMAT — FOLLOW EXACTLY
════════════════════════════════════════════

Produce exactly 4 fenced code blocks in this order:
1. ```xml   — the Mendix widget descriptor
2. ```tsx   — the React component
3. ```css   — scoped component styles
4. ```json  — npm dependency versions (empty object {} if none needed)

No prose between blocks. A short bullet-point notes section is allowed AFTER all 4 blocks.

════════════════════════════════════════════
BLOCK 1 RULES — XML (widget.xml)
════════════════════════════════════════════

CRITICAL STRUCTURAL SCHEMA (Follow this exactly):
<widget id="com.widgetforge.[namelower].[NamePascal]" ...>
  <name>[NamePascal]</name>
  <description>...</description>
  <properties>
    <propertyGroup caption="General">
      <property key="prop1" type="string" ...>...</property>
    </propertyGroup>
  </properties>
</widget>

- ALL <propertyGroup> tags MUST be strictly nested directly inside the <properties> block. Do not orphan them.
- Widget ID format:  com.widgetforge.[widgetnamelowercase].[WidgetNamePascalCase]
- Every <property> tag MUST be inside a <propertyGroup caption="..."> tag.

VALID PROPERTY TYPES & STUCTURE EXAMPLES:
1. string:      <property key="..." type="string" defaultValue="...">
2. boolean:     <property key="..." type="boolean" defaultValue="true|false">
3. integer:     <property key="..." type="integer" defaultValue="0">
4. textTemplate:<property key="..." type="textTemplate">
5. action:      <property key="..." type="action">
                  <caption>...</caption><description>...</description>
                  <returnType type="Void" />
                </property>
6. attribute:   <property key="..." type="attribute">
                  <caption>...</caption><description>...</description>
                  <attributeTypes>
                    <attributeType name="String"/> <!-- or Integer, Boolean, DateTime, Decimal -->
                  </attributeTypes>
                </property>
7. enumeration: <property key="..." type="enumeration" defaultValue="Key1">
                  <caption>...</caption><description>...</description>
                  <enumerationValues>
                    <enumerationValue key="Key1">Label 1</enumerationValue>
                    <enumerationValue key="Key2">Label 2</enumerationValue>
                  </enumerationValues>
                </property>
- Any type not on this list (e.g. invalid hallucinated types) will crash Mendix.
- Include these system properties in the General group:
    <systemProperty key="Label" />
    <systemProperty key="Visibility" />
    <systemProperty key="Editability" />

════════════════════════════════════════════
BLOCK 2 RULES — TSX ([WidgetName].tsx)
════════════════════════════════════════════

- Line 1 MUST be:
  import React, { createElement, useState, useRef, useEffect, useCallback } from "react";
  (The default React import is REQUIRED — omitting it causes TS2552 in the Mendix Rollup build.)

- Use createElement() for ALL elements. NEVER use JSX angle-bracket syntax (<div>, <span>, etc.).
  CORRECT:   createElement("div", { className: "foo" }, "Hello")
  WRONG:     <div className="foo">Hello</div>

- Use a named export:  export function [WidgetName](props: [WidgetName]Props) { ... }
  NEVER use:           export default function ...

- Define a Props interface whose keys exactly match the XML property key= attributes:
  - Attribute props:  { value?: T; setValue: (v: T) => void }
  - Action props:     () => void
  - Enum/bool/int:    plain TypeScript type (string | boolean | number)

- DO NOT import CSS. Do NOT write: import "./ui/[WidgetName].css";
- DO NOT import from "mendix/", "@mendix/", or use mx.ui.* globals.
- ALL React state in hooks (useState, useReducer, useCallback, useMemo).
- Close dropdowns on outside click using useRef + document.addEventListener("mousedown").
- Guard all optional props with optional chaining: props.myAttr?.value

════════════════════════════════════════════
BLOCK 3 RULES — CSS ([WidgetName].css)
════════════════════════════════════════════

- EVERY selector must start with .widget-[widgetnamelowercase]
  e.g., .widget-colorpicker { ... }
       .widget-colorpicker .cp-swatch { ... }
- Include the root reset:
  .widget-[widgetnamelowercase], .widget-[widgetnamelowercase] * { box-sizing: border-box; }
- Use Flexbox or Grid for layout. Avoid fixed pixel widths on the root element.
- Provide hover, focus-visible, and disabled states for all interactive elements.
- Use CSS custom properties (variables) for colors and spacing so Mendix themes can override them.
- Prefix all @keyframes names: @keyframes [widgetname]-fade-in { ... }

════════════════════════════════════════════
BLOCK 4 RULES — JSON (dependencies)
════════════════════════════════════════════

- Return a flat JSON object of npm package names to version strings.
- Example: { "lucide-react": "latest", "date-fns": "3.6.0" }
- If the widget uses only React built-ins, return: {}
- Do NOT include react, react-dom, or mendix packages — they are pre-installed.

════════════════════════════════════════════
```

---

## 🛠️ How to Use the Output in WidgetForge

1. Open **WidgetForge** → click the **Manual Bundle** tab.
2. Fill in the **Widget Name** and **Description** fields at the top.
3. Paste each block into its matching editor tab:

| AI Output Block | WidgetForge Tab |
|---|---|
| ` ```xml ` | **XML** tab |
| ` ```tsx ` | **TSX** tab |
| ` ```css ` | **CSS** tab |
| ` ```json ` | **Dependencies** field |


4. Click **Bundle** — WidgetForge compiles, patches, and downloads your `.mpk`.
5. Import the `.mpk` into **Mendix Studio Pro** and configure your attribute/action bindings.

---

## 🧩 Utility Files — Sharing Code Across Widgets

WidgetForge supports **utility file uploads**. If your widget needs helper functions, constants, or shared logic:

1. Go to the **Utils** tab in the Manual Bundle panel.
2. Drop or browse `.js` / `.ts` files.
3. WidgetForge auto-generates an import line in the TSX editor (e.g. `import * as helpers from './utils/helpers';`).
4. Uploaded files are written to `src/utils/` in the build scaffold and included in the final `.mpk`.

> **Tip:** Tell the AI to structure reusable logic (e.g. date formatting, validation) in a separate file, then upload it as a utility.

---

## 💡 Tips for Small / Local Models

Small models (7B–13B parameters) sometimes struggle with all 4 blocks at once. Use this order instead:

**Step 1 — Get the XML first:**
> *"Generate only the XML block for a Mendix widget named [Name] with these properties: [list]. Follow the WidgetForge XML rules above."*

**Step 2 — Get the TSX referencing the XML:**
> *"Now generate the TSX block for the XML above. Use createElement, import React as default, no CSS import, named export."*

**Step 3 — Get the CSS:**
> *"Generate the CSS for this widget. Scope every rule to .widget-[namelower]. Include hover and disabled states."*

**Step 4 — Get the JSON:**
> *"List only the npm packages used in the TSX above as a JSON object {name: version}. Return {} if none."*

---

## 🚫 Common Mistakes & Fixes

| Symptom | Root Cause | Fix |
|---|---|---|
| `TS2552: Cannot find name 'createElement'` | Missing `import React` default | Add `React` to the import |
| `Module not found: mendix/...` | AI hallucinated Mendix imports | Delete any `import ... from "mendix/..."` lines |
| CSS not applied in Mendix | CSS import line in TSX | Remove `import "./ui/Widget.css"` from TSX |
| Widget properties not showing in Studio Pro | `<property>` outside `<propertyGroup>` | Wrap all properties in `<propertyGroup caption="...">` |
| Build fails with JSX parse error | AI used angle-bracket JSX | Replace all `<tag>` syntax with `createElement("tag", ...)` |
| Styles bleed into Mendix UI | CSS not scoped | Prefix every rule with `.widget-yourwidgetname` |
| `export default` build error | Mendix expects named export | Change to `export function WidgetName(...)` |
| Props not received at runtime | Props interface keys ≠ XML keys | Ensure interface keys exactly match XML `key=` attributes |

---

## ⚙️ What WidgetForge Does Automatically (You Don't Need to Do These)

- ✅ Scaffolds the full Mendix widget project structure (via Yeoman + @mendix/generator-widget)
- ✅ Fixes malformed Widget IDs in XML to `com.widgetforge.<name>.<Name>`
- ✅ Removes accidental `createElement` bare imports
- ✅ Strips hallucinated `mendix/` and `@mendix/` imports from TSX
- ✅ Wraps orphaned `<property>` tags in `<propertyGroup caption="General">`
- ✅ Removes invalid XML child tags (`translatable`, `minimumValue`, `maximumValue`, etc.)
- ✅ Normalises the XML declaration to `<?xml version="1.0" encoding="utf-8"?>`
- ✅ Injects CSS import line into TSX for the Rollup build
- ✅ Runs `npm install --legacy-peer-deps` for your dependencies
- ✅ Executes the full Mendix `pluggable-widgets-tools` build
- ✅ Injects your CSS file into the `.mpk` ZIP binary via adm-zip
- ✅ Updates `package.xml` manifest to register CSS assets
- ✅ Streams real-time build logs (with ANSI color) to your browser terminal
- ✅ Securely wipes the temp build environment after download
- ✅ Writes uploaded utility files to `src/utils/` in the scaffold

---

## 🚧 Known Limitations

| Limitation | Detail |
|---|---|
| **Web only** | Mobile/Native widget support coming in Phase 2 |
| **React 19** | Class components and legacy lifecycle methods will fail |
| **No live Mendix data** | Preview uses mock props — real binding happens in Studio Pro |
| **Internet required** | `npm install` runs server-side and needs network access |
| **10-min build timeout** | Widgets with many heavy dependencies may time out |
| **Manual binding** | After `.mpk` import, you must configure attributes/actions in Studio Pro |

---

*Built for WidgetForge · Mendix Pluggable Widget Platform · Web · React 19*

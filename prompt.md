# WidgetForge — AI Code Generation Guide
### Generate Mendix Pluggable Widgets using any AI tool

> **Compatible with:** Claude, ChatGPT, Gemini, Mistral, and local models (Ollama, LM Studio, etc.)  
> **Target Platform:** Mendix 10+ Web | React 19 | WidgetForge Manual Bundle Mode

---

## 🧠 Understanding WidgetForge Before You Prompt

Before generating code, know what WidgetForge does **for you automatically** so you don't fight it:

| WidgetForge handles automatically | You must get right in the prompt |
|---|---|
| CSS injection into the `.mpk` archive | Correct XML structure & property groups |
| Fixing malformed Widget IDs | `import React` default import in TSX |
| Stripping bad Mendix library imports | Using `createElement` — NOT JSX |
| Running `npm install` & `npm run build` | Scoping all CSS to `.widget-yourwidgetname` |
| Packaging the final `.mpk` file | Valid JSON for the dependencies block |

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

## 🤖 The Master Prompt (Copy & Paste)

Replace everything inside `[square brackets]` with your requirements. The rest must stay exactly as written.

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

- Widget ID format:  com.widgetforge.[widgetnamelowercase].[WidgetNamePascalCase]
- Every <property> tag MUST be inside a <propertyGroup caption="..."> tag.
- Use type="attribute" for Mendix data bindings (with <attributeTypes> child).
- Use type="action" for microflow/nanoflow triggers.
- Use type="enumeration" for dropdowns — always include defaultValue.
- Use type="boolean" for toggles — always include defaultValue.
- Use type="integer" for numbers — always include defaultValue.
- Use type="textTemplate" for plain text / expression strings.
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

---

## ⚙️ What WidgetForge Does Automatically (You Don't Need to Do These)

- ✅ Scaffolds the full Mendix widget project structure
- ✅ Fixes malformed Widget IDs in XML
- ✅ Removes accidental `createElement` bare imports
- ✅ Runs `npm install --legacy-peer-deps` for your dependencies
- ✅ Executes the full Mendix `pluggable-widgets-tools` build
- ✅ Injects your CSS file into the `.mpk` ZIP binary
- ✅ Updates `package.xml` manifest to register CSS assets
- ✅ Streams real-time build logs to your browser terminal
- ✅ Securely wipes the temp build environment after download

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

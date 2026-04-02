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
Source: https://docs.mendix.com/apidocs-mxsdk/apidocs/pluggable-widgets-property-types/
════════════════════════════════════════════

FULL DOCUMENT SKELETON:
<?xml version="1.0" encoding="utf-8"?>
<widget id="com.widgetforge.[namelower].[NamePascal]"
        pluginWidget="true"
        needsEntityContext="true"
        offlineCapable="true"
        supportedPlatform="Web"
        xmlns="http://www.mendix.com/widget/1.0/"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.mendix.com/widget/1.0/ ../node_modules/mendix/custom_widget.xsd">
    <name>[NamePascal]</name>
    <description>...</description>
    <properties>
        <propertyGroup caption="General">
            <!-- properties here -->
        </propertyGroup>
    </properties>
</widget>

STRUCTURAL RULES:
- <properties> is the ONLY container for <propertyGroup> elements.
- <propertyGroup caption="..."> is the ONLY container for <property> and <systemProperty>.
- PropertyGroups can nest (first-level = tabs, second-level = boxes in Studio Pro).
- EVERY <property> MUST have child elements <caption> and <description>.

COMPLETE PROPERTY TYPE REFERENCE:

1. STRING:  <property key="x" type="string" defaultValue="..." multiline="false" required="true|false">
2. BOOLEAN: <property key="x" type="boolean" defaultValue="true|false">
3. INTEGER: <property key="x" type="integer" defaultValue="0">
4. DECIMAL: <property key="x" type="decimal" defaultValue="0.0">
5. ENUMERATION: <property key="x" type="enumeration" defaultValue="key1">
   + <enumerationValues><enumerationValue key="key1">Label</enumerationValue></enumerationValues>
6. ICON: <property key="x" type="icon" required="false">
7. IMAGE: <property key="x" type="image" required="false" allowUpload="true|false">
8. WIDGETS: <property key="x" type="widgets" required="false" dataSource="<ds_key>">
9. EXPRESSION: <property key="x" type="expression" defaultValue="'value'" dataSource="<ds_key>">
   + <returnType type="String|Boolean|DateTime|Decimal|Integer" />
10. TEXT TEMPLATE: <property key="x" type="textTemplate" multiline="false" dataSource="<ds_key>">
11. ACTION: <property key="x" type="action" required="false" dataSource="<ds_key>">
    NOTE: Do NOT add <returnType> to action properties.
12. ATTRIBUTE ★ THIS IS HOW YOU BIND TO MENDIX DATA ★
    <property key="titleAttribute" type="attribute" onChange="<action_key>" dataSource="<ds_key>">
        <caption>Title</caption>
        <description>Attribute to be used as title</description>
        <attributeTypes>
            <attributeType name="String"/>  <!-- Valid: AutoNumber, Binary, Boolean, DateTime, Enum, HashString, Integer, Long, String, Decimal -->
        </attributeTypes>
    </property>
13. ASSOCIATION: <property key="x" type="association" selectableObjects="<ds_key>" onChange="<action_key>">
    + <associationTypes><associationType name="Reference|ReferenceSet"/></associationTypes>
14. OBJECT: <property key="x" type="object" isList="true">
    + <properties><propertyGroup caption="...">...sub-properties...</propertyGroup></properties>
15. DATASOURCE: <property key="x" type="datasource" isList="true" required="false">
16. SELECTION: <property key="x" type="selection" dataSource="<ds_key>" onChange="<action_key>">
    + <selectionTypes><selectionType name="None|Single|Multi"/></selectionTypes>
17. FILE: <property key="x" type="file" required="false" allowUpload="true|false">

SYSTEM PROPERTIES (place inside <propertyGroup>):
    <systemProperty key="Label"/>
    <systemProperty key="Name"/>
    <systemProperty key="TabIndex"/>
    <systemProperty key="Visibility"/>
    <systemProperty key="Editability"/>

ATTRIBUTE DATASOURCE BINDING RULE (STRICT):
- ALWAYS bind attribute properties to a datasource when applicable.
- If a property is inside an object/list (e.g., columns) and relates to row data, its <property type="attribute"> tag MUST have the dataSource="<datasource_property_key>" XML attribute.
- If missing this binding, Mendix WILL NOT allow the user to select the attribute because it lacks list context.
- Example: <property key="colAttr" type="attribute" dataSource="propKey">

FORBIDDEN PATTERNS — WILL CAUSE XML ERRORS:
- NEVER generate child elements: <translatable>, <minimumValue>, <maximumValue>, <defaultValue>, <isList>, <required>, <isDefault>, <onChange>
- These are ATTRIBUTES on <property>, NOT child elements.
- CORRECT: <property key="x" type="string" required="false" defaultValue="hi">
- WRONG:   <property key="x" type="string"><required>false</required></property>
- The ONLY valid child elements inside <property> are:
  <caption>, <description>, <attributeTypes>, <enumerationValues>, <returnType>,
  <associationTypes>, <selectionTypes>, <properties>, <translations>, <actionVariables>

════════════════════════════════════════════
RELATIVE DATASOURCE PATH (CRITICAL)
════════════════════════════════════════════
1. When a property is inside a type="object" (nested structure):
   - dataSource MUST be a RELATIVE PATH.
   - NOT the root key directly.
   - type="object" properties MUST NEVER include dataSource attribute themselves.
2. Use:
   dataSource="../<datasource_key>"
3. Example:
   ROOT:
   <property key="dataSource" type="datasource" isList="true" />
   INSIDE OBJECT:
   <property key="attribute" type="attribute" dataSource="../dataSource" />
4. NEVER use:
   ❌ dataSource="dataSource"   (invalid inside object)
   ❌ dataSource="data"         (invalid unless exists)
5. VALIDATION:
   - If attribute is inside object → MUST start with "../"
   - If at root level → MUST NOT use "../"

FAILURE WILL CAUSE: "Invalid property path '<key>' in dataSource attribute"

════════════════════════════════════════════
MANDATORY VALIDATION — MUST PASS BEFORE OUTPUT
════════════════════════════════════════════
Before returning the final JSON, you MUST validate the XML:
1. Scan ALL <property type="attribute"> occurrences.
2. For EACH attribute property:
   - If ANY datasource exists in the widget (type="datasource"):
     → The attribute property MUST include the EXACT datasource key.
     → If nested in an object, it MUST be prefixed with "../" (e.g., dataSource="../gridDS").
3. This rule applies EVEN IF:
   - The attribute is inside an object (type="object" isList="true")
   - The attribute is deeply nested inside propertyGroups
4. If ANY attribute property is missing dataSource:
   → FIX IT BEFORE RETURNING OUTPUT
5. NEVER assume default binding — Mendix DOES NOT auto-bind attributes.
6. If multiple datasources exist:
   → Choose the most relevant one based on context (usually the main list datasource)
7. FINAL CHECK:
   - ZERO attribute properties without dataSource
   - If any found → REWRITE XML before returning

FAILURE TO FOLLOW THIS WILL BREAK THE WIDGET IN Mendix.

════════════════════════════════════════════
SELF-CORRECTION LOOP
════════════════════════════════════════════
After generating XML:
Step 1: Validate attribute bindings
Step 2: If invalid → regenerate ONLY XML section
Step 3: Re-check again
Step 4: Repeat until valid

Do NOT return partially valid XML.


════════════════════════════════════════════
BLOCK 2 RULES — TSX ([WidgetName].tsx)
════════════════════════════════════════════

════════════════════════════════════════════
STRICT TYPESCRIPT TYPING (MANDATORY)
════════════════════════════════════════════
1. NEVER use implicit 'any' types.
   - ALL function parameters MUST have explicit types.
2. This applies to:
   - Arrow functions
   - useCallback
   - map() callbacks
   - event handlers
   - inline functions
3. Examples:
   ❌ WRONG: const handleChange = (value) => { ... }
   ✅ CORRECT: const handleChange = (value: number) => { ... }
4. React Hooks:
   ❌ WRONG: useCallback((newPage) => { ... })
   ✅ CORRECT: useCallback((newPage: number) => { ... })
5. Array mapping:
   ❌ WRONG: items.map(item => ...)
   ✅ CORRECT: items.map((item: any) => ...)
   OR better: items.map((item: MyType) => ...)
6. If type is unknown:
   → Use "any" explicitly (NOT implicit)
   Example: (item: any)
7. FINAL VALIDATION:
   - Scan for ALL function parameters
   - Ensure NONE are untyped
   - If found → FIX before returning
FAILURE WILL CAUSE: TS7006: Parameter implicitly has an 'any' type

════════════════════════════════════════════
ATTRIBUTE ACCESS RULE (CRITICAL)
════════════════════════════════════════════

1. IF attribute is inside OBJECT (type="object", isList="true"):
   → Type is EditableValue<T>
   → Access using:
     attribute.value

   ❌ NEVER use:
     attribute.get(item)

2. IF attribute is linked to DATASOURCE (root level):
   → Type is ListAttributeValue<T>
   → Access using:
     attribute.get(item).value

3. VALIDATION:
   - If ".get(" is used → ensure type is ListAttributeValue
   - If type is EditableValue → ensure NO ".get(" usage

FAILURE WILL CAUSE:
TS2339: Property 'get' does not exist on type 'EditableValue'

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
- MENDIX TYPE SHIMS: Since you cannot import from 'mendix', if your Props interface uses Mendix types, you MUST define them as empty interfaces or simple types at the top of the file. 
  Example: 
  export interface ActionValue { readonly canExecute: boolean; readonly isExecuting: boolean; execute(): void; }
  export interface EditableValue<T> { readonly value?: T; readonly readOnly: boolean; setValue(value?: T): void; }
  export interface ListValue { readonly items?: any[]; readonly status: string; }
  export interface ListAttributeValue<T> { get(item: any): EditableValue<T>; }
- DATASOURCES vs OBJECT LISTS - CRITICAL DIFFERENCE:
  1. DATASOURCE (ListValue): Use props.myDataSource.items?.map(item => ...).
     Attributes linked to a datasource become ListAttributeValue, so you MUST use .get(item).
     Example: props.myLinkedAttr?.get(item)?.value
  2. OBJECT LIST (isList="true"): It's a standard array. Use props.myObjectList?.map(obj => ...).
     Attributes inside objects are passed as direct EditableValue (NOT ListAttributeValue).
     NEVER use .get(item) on them!
     Example: obj.myInnerAttr?.value
- EDITABLEVALUE & ACTIONVALUE METHODS - NO HALLUCINATIONS:
  - EditableValue has a .value property to GET the value.
  - EditableValue has a .setValue(newValue) method to SET the value.
  - NEVER write .getValue() or .getValue(x). It DOES NOT EXIST in the Mendix API (TS2551).
  - ActionValue has an .execute() method. NEVER write .run() or .executeAction().
- CRITICAL — REACT ERROR #31 PREVENTION:
  Objects are NOT valid React children. NEVER pass a raw object/item into createElement as a child.
  WRONG:   createElement("span", null, item)           // item is an object → React error #31
  WRONG:   createElement("span", null, props.myAttr)   // myAttr is an EditableValue object → error
  CORRECT: createElement("span", null, String(item.someField ?? ""))
  CORRECT: createElement("span", null, props.myAttr?.value ?? "")
  If unsure about a value's type, wrap it: String(value ?? "")

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
| `React error #31: Objects are not valid as React child` | Rendering a raw object/item instead of a primitive | Extract `.value` from EditableValue, use `item.field` not `item`, wrap with `String(val ?? "")` |
| `dataList.map is not a function` | Calling `.map()` on a datasource (ListValue) instead of its `.items` | Use `props.myDataSource.items?.map(...)` not `props.myDataSource.map(...)` |

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

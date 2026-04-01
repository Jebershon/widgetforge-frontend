## WidgetForge – Low-token Widget Generation Prompt

Use this prompt with a text-generation model that has limited tokens but needs to reliably output Mendix widget code (**XML + TSX + CSS + dependencies**) as JSON.

```text
You are an expert Mendix Pluggable Widget + React + TypeScript engineer.

GOAL
Generate a production-quality Mendix pluggable Web widget named "{WIDGET_NAME}" that matches the spec below.

OUTPUT (STRICT)
Return ONLY a single valid JSON object with EXACT keys:
- "aiXml": string
- "aiTsx": string
- "aiCss": string (can be empty string, but must exist)
- "dependencies": object (can be {})

No markdown. No explanations. No extra keys.

WIDGET SPEC (what to build)
{USER_SPEC}

HARD RULES — Mendix XML (aiXml)
1) The root tag MUST be <widget ...> with ALL attributes exactly:
   id="com.widgetforge.{WIDGET_NAME_LOWER}.{WIDGET_NAME}"
   pluginWidget="true"
   needsEntityContext="false"
   offlineCapable="true"
   supportedPlatform="Web"
   xmlns="http://www.mendix.com/widget/1.0/"
   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
   xsi:schemaLocation="http://www.mendix.com/widget/1.0/ ../node_modules/mendix/custom_widget.xsd"

2) Must include:
   <name>{WIDGET_NAME}</name>
   <description>...</description>
   <icon/>
   <properties> ... </properties>  (ALWAYS present, even if empty)

3) Property rules:
- Every <property> MUST be inside <propertyGroup caption="...">.
- Property types determine their allowed child elements:
  - most types (string, boolean, integer, decimal, etc.) only accept <caption> and <description>.
  - `enumeration`: must contain <enumerationValues>
  - `attribute`: must contain <attributeTypes>
  - `expression`: must contain <returnType>
  - `object`: must contain <properties> with <propertyGroup> inside.
  - `action`: must contain <returnType>
  - `association`: must contain <associationTypes>
  - `selection`: must contain <selectionTypes>
- If you need defaults: use attribute defaultValue="...".
- If required: use attribute required="true|false".
- Use only valid Mendix property types: string, boolean, integer, decimal, textTemplate, action, attribute, enumeration, datasource, widgets, object, icon, image, file, expression, association, selection.
- Do NOT invent extra XML child tags like <minimumValue>, <maximumValue>, <translatable>, <onChange>, etc.

HARD RULES — TypeScript/React (aiTsx)
1) Must export a named component:
   export function {WIDGET_NAME}(props: {WIDGET_NAME}Props): ReactElement { ... }

2) Must declare:
   export interface {WIDGET_NAME}Props { ... }
Fields MUST correspond to XML properties (matching keys and types).

3) Forbidden imports (NEVER):
- any "mendix/*" or "@mendix/*"
- "@mendix/pluggable-widgets-api"
- "createElement" from "react" (use JSX)
If you include unused imports, the build will fail — avoid them.

4) Functional requirements:
- Implement full interactivity for complex widgets (state, events, keyboard accessibility, loading/error states, empty states).
- If remote data is needed, use fetch + AbortController, proper retries/backoff optional, and robust error handling.
- No placeholder-only UI. Must be usable.

5) Styling:
- If you reference CSS, you MUST import:
  import "./ui/{WIDGET_NAME}.css";
- All classes MUST be scoped under:
  .widget-{WIDGET_NAME_LOWER} ...
- Root element MUST have class:
  className="widget-{WIDGET_NAME_LOWER}"

HARD RULES — CSS (aiCss)
- Must be scoped to .widget-{WIDGET_NAME_LOWER}
- Prefer CSS variables for theming.
- Include focus-visible styles for interactive controls.

DEPENDENCIES (dependencies)
- If a third-party library is genuinely beneficial (charts, drag-drop, virtualization, date utils), include it.
- Keep dependencies minimal.
- Use realistic semver ranges, e.g. "^x.y.z".
- If no deps, return {}.

COMPLEXITY TOOLBOX (choose as needed)
For heavy UIs, you MAY implement:
- virtual list (react-window) for large lists
- charts (recharts or chart.js)
- drag-drop (dnd-kit)
- date handling (date-fns)
- validation (zod)
But only if needed by {USER_SPEC}.

FINAL CHECK (must satisfy before output)
- Valid JSON parse
- XML has required attributes + <properties>
- TSX exports named component + props interface
- CSS scoped and imported
- No forbidden imports
```

### How to use

- Replace `{WIDGET_NAME}` with a PascalCase widget name (e.g. `KanbanBoardWidget`).
- Replace `{WIDGET_NAME_LOWER}` with the lowercase version (e.g. `kanbanboardwidget`).
- Replace `{USER_SPEC}` with your natural-language widget description, including data model, interactions, and edge cases.


import { useState } from 'react'
import styles from './DocsView.module.css'
import clsx from 'clsx'

interface DocsViewProps {
  onClose: () => void
}

export function DocsView({ onClose }: DocsViewProps) {
  const [activeTab, setActiveTab] = useState<'frontend' | 'api'>('frontend')

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.tabs}>
            <button
              className={clsx(styles.tab, activeTab === 'frontend' && styles.tabActive)}
              onClick={() => setActiveTab('frontend')}
            >
              Front-end Guide
            </button>
            <button
              className={clsx(styles.tab, activeTab === 'api' && styles.tabActive)}
              onClick={() => setActiveTab('api')}
            >
              API Reference
            </button>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </header>

        <div className={styles.content}>
          {activeTab === 'frontend' ? <FrontendDocs /> : <ApiDocs />}
        </div>
      </div>
    </div>
  )
}

function FrontendDocs() {
  return (
    <div className={styles.markdown}>
      <h1>Front-end Architecture</h1>
      <p>WidgetForge is a full-stack Mendix widget factory — a React + Vite frontend paired with a Node.js + Express backend that takes raw code blocks (XML, TSX, CSS, JSON) and produces a production-ready <code>.mpk</code> file you can drop into Mendix Studio Pro.</p>

      <h3>📐 System Architecture</h3>
      <img
        src="/architecture-diagram.png"
        alt="WidgetForge Architecture Diagram — Frontend, Backend, and Build Pipeline"
        style={{ width: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem' }}
      />

      <h3>🏗️ How the Build Pipeline Works</h3>
      <ol>
        <li><strong>Scaffold</strong> — Yeoman + <code>@mendix/generator-widget</code> creates a clean Mendix project structure in a temp directory.</li>
        <li><strong>Inject</strong> — Your XML, TSX, CSS, and any uploaded utility files are written into the scaffold.</li>
        <li><strong>Correct</strong> — Auto-fix pass: Widget ID normalised, bad imports stripped, missing <code>&lt;propertyGroup&gt;</code> wrappers added, invalid XML tags purged, CSS import injected into TSX.</li>
        <li><strong>Build</strong> — <code>npm install --legacy-peer-deps</code> + <code>npm run build</code> (Mendix pluggable-widgets-tools Rollup pipeline).</li>
        <li><strong>MPK Patch</strong> — CSS file injected into the <code>.mpk</code> ZIP via adm-zip; <code>package.xml</code> manifest updated.</li>
        <li><strong>Deliver</strong> — <code>.mpk</code> streamed to browser. Temp directory auto-cleaned.</li>
      </ol>

      <h3>🆕 New Features &amp; Capabilities</h3>
      <ul>
        <li><strong>Iterative Chat Context</strong>: The AI chat purposefully combines your new prompts with all previous messages to refine your current widget dynamically. <em>NOTE: If you want to build a completely new, separate widget, please refresh the page to clear your chat history first!</em></li>
        <li><strong>Multi-AI Provider Support</strong>: Gemini, OpenAI, and Anthropic — configured from the frontend settings modal.</li>
        <li><strong>TSX-First Workflow</strong>: All code generation and editing uses TypeScript TSX.</li>
        <li><strong>Utility File Uploads</strong>: Drop <code>.js</code>/<code>.ts</code> helper files into the Utils tab — auto-imported and bundled into the <code>.mpk</code>.</li>
        <li><strong>Live Preview</strong>: Real-time widget rendering using mock Mendix props.</li>
        <li><strong>Monaco Editor</strong>: Full VS Code editing with IntelliSense and auto-type acquisition for npm packages.</li>
        <li><strong>Platform Switching</strong>: Toggle Web ↔ Native — code is backed up and restored per platform.</li>
        <li><strong>ANSI Build Logs</strong>: Color-coded terminal output streamed to the browser.</li>
        <li><strong>Auto-Corrections</strong>: Server fixes Widget IDs, strips bad imports, wraps properties, normalises XML.</li>
      </ul>
      
      <h3>Core Technologies</h3>
      <ul>
        <li><strong>React 18 &amp; TypeScript</strong>: Modern type-safe component architecture.</li>
        <li><strong>Zustand</strong>: Lightweight state management with platform backup/restore for Web ↔ Native switching.</li>
        <li><strong>Monaco Editor</strong>: The same engine powering VS Code, with IntelliSense and auto-type acquisition for npm packages.</li>
        <li><strong>Vite</strong>: Next-generation frontend tooling for near-instant Hot Module Replacement (HMR).</li>
        <li><strong>clsx</strong>: Conditional CSS class composition.</li>
        <li><strong>esm.sh</strong>: Browser-side npm package resolution for live preview.</li>
      </ul>

      <h3>Key UI Components</h3>
      <ul>
        <li><strong>BundlePanel</strong>: Multi-tab code editor (XML, TSX, CSS, JSON deps, Utils) with metadata controls and name-mismatch validation.</li>
        <li><strong>MainPanel</strong>: Streaming build log viewer with ANSI color rendering + live widget preview.</li>
        <li><strong>Sidebar</strong>: Mode Switcher (Manual Bundle / AI Generate) and primary navigation.</li>
        <li><strong>ChatPanel</strong>: AI chat interface for prompt-based generation with provider/model selection.</li>
        <li><strong>DocsView</strong>: This in-app documentation modal.</li>
      </ul>

      <h3>Resolved Technical Challenges</h3>
      <ul>
        <li><strong>Layout Regression Fixes</strong>: Custom state-driven resizer handle to solve CSS <code>resize</code> colliding with Grid layouts.</li>
        <li><strong>Dynamic Metadata Transitions</strong>: <code>grid-template-rows</code> fractional trick for smooth expand/collapse.</li>
        <li><strong>Editor Scaling</strong>: Fixed flex-column height issues so Monaco always fills 100% vertical space.</li>
        <li><strong>Platform State Isolation</strong>: Web and Native modes have completely separate, non-interfering data flows with backup/restore on switch.</li>
      </ul>

      <h3>Manual Bundle Walkthrough</h3>
      <ol>
        <li><strong>Set Metadata</strong>: Provide a clear Widget Name (PascalCase) and description.</li>
        <li><strong>Get AI Code</strong>: Click the <strong>?</strong> button next to the metadata to copy the system prompt. Paste it into any AI agent (ChatGPT, Claude, Gemini, etc.) along with your widget requirements.</li>
        <li><strong>Inject Code</strong>: Paste the generated XML, TSX, CSS, and JSON deps into their respective editor tabs.</li>
        <li><strong>Add Utils</strong> (optional): Drop helper <code>.js</code>/<code>.ts</code> files into the Utils tab.</li>
        <li><strong>Preview</strong>: Verify the widget renders correctly in the Live Preview.</li>
        <li><strong>Bundle</strong>: Click <strong>"Bundle Widget ▶"</strong> to compile, patch, and download your <code>.mpk</code>.</li>
      </ol>

      <h3>🤖 System Prompt for AI Agents (v3.0)</h3>
      <p>When using any AI agent to generate widget code for WidgetForge's Manual Bundle mode, paste this system prompt first. It tells the AI exactly how to format the output so you can paste it directly into WidgetForge's editor tabs. Click the <strong>?</strong> button in the Bundle panel to copy it.</p>
      
      <div className={styles.promptBox}>
        <pre><code>{`ACT AS a Senior Mendix and React developer. Generate a production-ready Mendix 10 Pluggable Widget for WidgetForge.

WIDGET NAME: [e.g., ColorPicker]
WIDGET FUNCTION: [e.g., A circular HSL color picker that writes a hex string to a Mendix attribute]
EXTRA PROPERTIES: [e.g., showOpacity: boolean toggle, labelText: string]
INTERACTIONS: [e.g., clicking a swatch confirms the color; clear button resets to null]

════════════════════════════════════════════
OUTPUT FORMAT — FOLLOW EXACTLY
════════════════════════════════════════════

Produce exactly 4 fenced code blocks in this order:
1. \`\`\`xml   — the Mendix widget descriptor
2. \`\`\`tsx   — the React component
3. \`\`\`css   — scoped component styles
4. \`\`\`json  — npm dependency versions (empty object {} if none needed)

No prose between blocks. A short bullet-point notes section is allowed AFTER all 4 blocks.

════════════════════════════════════════════
BLOCK 1 — XML (widget.xml)
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
- Every <property> MUST be inside a <propertyGroup caption="...">.

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

════════════════════════════════════════════
BLOCK 2 — TSX ([WidgetName].tsx)
════════════════════════════════════════════
- Line 1: import React, { createElement, useState, useRef, useEffect, useCallback } from "react";
- Use createElement() for ALL elements. NEVER use JSX (<div>, <span>).
- Named export only: export function [WidgetName](props) { ... }
- NO CSS imports. NO mendix/* imports. NO mx.ui.* globals.
- Guard optional props: props.myAttr?.value

════════════════════════════════════════════
BLOCK 3 — CSS ([WidgetName].css)
════════════════════════════════════════════
- EVERY selector starts with .widget-[namelower]
- Include box-sizing reset. Use CSS custom properties for theming.
- Provide hover, focus-visible, disabled states.

════════════════════════════════════════════
BLOCK 4 — JSON (dependencies)
════════════════════════════════════════════
- Flat JSON: {"pkg": "version"}. Return {} if none.
- Do NOT include react, react-dom, or mendix packages.`}</code></pre>
      </div>

      <h3>Known Limitations</h3>
      <ul>
        <li><strong>Web Only</strong>: Native Mobile support is coming in Phase 2.</li>
        <li><strong>React 19</strong>: Build environment strictly uses React 19. Class components will fail.</li>
        <li><strong>Mock Preview</strong>: Live preview uses local mock state, not a Mendix database.</li>
        <li><strong>Internet Required</strong>: <code>npm install</code> runs server-side and needs network access.</li>
        <li><strong>10-min Build Timeout</strong>: Widgets with many heavy dependencies may time out.</li>
      </ul>

      <h3>Supported Packages (via esm.sh)</h3>
      <p>WidgetForge uses <strong>esm.sh</strong> to resolve npm packages. Most ESM-compatible libraries work:</p>
      <ul>
        <li><strong>Chart &amp; Data</strong>: <code>recharts</code>, <code>chart.js</code>, <code>d3</code>, <code>big.js</code></li>
        <li><strong>UI &amp; Animation</strong>: <code>framer-motion</code>, <code>lucide-react</code>, <code>clsx</code>, <code>canvas-confetti</code></li>
        <li><strong>React Utilities</strong>: <code>react-use</code>, <code>react-icons</code>, <code>react-calendar</code></li>
        <li><strong>Modern JS</strong>: <code>date-fns</code>, <code>lodash-es</code>, <code>qrcode.react</code></li>
      </ul>
      <p><small>* Note: Avoid libraries that require Node-specific APIs (fs, path, etc.) as they won't run in the browser's live preview.</small></p>
    </div>
  )
}

function ApiDocs() {
  return (
    <div className={styles.markdown}>
      <h1>Backend &amp; API Reference</h1>
      <p>The backend is a Node.js Express server that orchestrates the full lifecycle: scaffolding, code injection, auto-correction, building, MPK patching, and delivery.</p>

      <h3>Tech Stack</h3>
      <ul>
        <li><strong>Express + TypeScript</strong>: Robust, type-safe API routing.</li>
        <li><strong>Yeoman Engine</strong>: Uses <code>@mendix/generator-widget</code> for standardized widget scaffolding.</li>
        <li><strong>Adm-Zip</strong>: Post-build MPK manipulation to inject CSS assets that default build tools omit.</li>
        <li><strong>AI Providers</strong>: Integrated support for Google Gemini, OpenAI, and Anthropic — keys passed per-request from the frontend.</li>
      </ul>

      <h3>API Endpoints</h3>
      <ul>
        <li><code>GET /api/health</code>: Basic heartbeat and service availability check.</li>
        <li><code>POST /api/ai/test</code>: Verifies connection health with the configured AI provider by passing provider, key, and model in request body.</li>
        <li><code>POST /api/generate</code>: AI mode — takes a description, returns generated XML/TSX/CSS code.</li>
        <li><code>POST /api/bundle</code>: Manual mode — takes raw code strings + optional utils, builds and returns a <code>.mpk</code>.</li>
      </ul>

      <h3>Build Pipeline (6 Phases)</h3>
      <ol>
        <li><strong>Scaffold</strong>: Creates a professional Mendix project structure in <code>server/temp/</code> via Yeoman.</li>
        <li><strong>Inject Code</strong>: Writes your XML, TSX, CSS, and uploaded utility files into the scaffold.</li>
        <li><strong>Auto-Correct</strong>:
          <ul>
            <li>Normalises Widget ID to <code>com.widgetforge.&lt;name&gt;.&lt;Name&gt;</code></li>
            <li>Wraps orphaned <code>&lt;property&gt;</code> tags in <code>&lt;propertyGroup&gt;</code></li>
            <li>Removes invalid XML child tags (<code>translatable</code>, <code>minimumValue</code>, etc.)</li>
            <li>Strips <code>mendix/*</code> and <code>@mendix/*</code> hallucinated imports</li>
            <li>Injects CSS import line into TSX for the Rollup build</li>
            <li>Normalises the XML declaration</li>
          </ul>
        </li>
        <li><strong>Build</strong>: Executes <code>npm install --legacy-peer-deps</code> and the <code>pluggable-widgets-tools</code> Rollup build.</li>
        <li><strong>MPK Patch</strong>: Injects CSS into the <code>.mpk</code> ZIP and updates <code>package.xml</code> manifest.</li>
        <li><strong>Deliver &amp; Cleanup</strong>: Streams <code>.mpk</code> to browser, then auto-cleans the temp directory.</li>
      </ol>

      <h3>Utility File Support</h3>
      <p>The <code>/api/bundle</code> endpoint accepts an optional <code>utilFiles</code> array of <code>{`{name, content}`}</code> objects. These are written to <code>src/utils/</code> in the scaffold before the build, allowing helper functions and shared logic to be bundled into the final <code>.mpk</code>.</p>

      <h3>Strategic Roadmap</h3>
      <ul>
        <li><strong>Phase 1 (Complete)</strong>: Web Widgets — AI &amp; Manual orchestration, CSS injection, auto-corrections.</li>
        <li><strong>Phase 2 (In Progress)</strong>: Native Widgets — Mobile scaffolding with platform-specific boilerplate.</li>
        <li><strong>Phase 3 (Vision)</strong>: Internal LLM Integration — In-tool code generation API.</li>
      </ul>
    </div>
  )
}

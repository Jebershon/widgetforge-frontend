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
      <p>WidgetForge is a high-performance React application designed for rapid Mendix widget prototyping.</p>
      
      <h3>Core Technologies</h3>
      <ul>
        <li><strong>React 18 & TypeScript</strong>: Modern type-safe component architecture.</li>
        <li><strong>Zustand</strong>: Lightweight state management for handling build status and widget metadata.</li>
        <li><strong>Monaco Editor</strong>: The same engine powering VS Code, providing syntax highlighting and IntelliSense for XML/TSX/CSS.</li>
        <li><strong>Vite</strong>: Next-generation frontend tooling for near-instant Hot Module Replacement (HMR).</li>
      </ul>

      <h3>Key UI Components</h3>
      <ul>
        <li><strong>BundlePanel</strong>: Provides a multi-tab code editing experience with integrated metadata controls.</li>
        <li><strong>MainPanel</strong>: A streaming log viewer that tracks the backend build progress in real-time.</li>
        <li><strong>Sidebar</strong>: Houses the Mode Switcher and persistent primary navigation.</li>
      </ul>

      <h3>Resolved Technical Challenges</h3>
      <ul>
        <li><strong>Layout Regression Fixes</strong>: We implemented a custom state-driven resizer handle to solve issues with native CSS `resize` colliding with Grid layouts.</li>
        <li><strong>Dynamic Metadata Transitions</strong>: Used the `grid-template-rows` fractional trick to ensure metadata fields expand/collapse with biological smoothness.</li>
        <li><strong>Editor Scaling</strong>: Fixed flex-column height issues ensuring Monaco Editor always fills 100% of available vertical space.</li>
      </ul>

      <h3>Manual Bundle Walkthrough</h3>
      <ol>
        <li><strong>Set Metadata</strong>: Provide a clear Widget Name (PascalCase) and description.</li>
        <li><strong>AI Generation</strong>: Copy the pre-formatted prompt from the metadata section and paste it into an LLM.</li>
        <li><strong>Inject Code</strong>: Paste the generated XML, TSX, and CSS into their respective tabs.</li>
        <li><strong>Preview</strong>: Verify the widget renders correctly in the Live Preview tab.</li>
        <li><strong>Bundle</strong>: Click "Bundle Widget" to generate and download the `.mpk` file.</li>
      </ol>

      <h3>AI Prompt Specialist (v2.0)</h3>
      <p>For best results, use this <strong>"Ultimate Prompt"</strong>. It is optimized for both heavy and low-parameter models to ensure WidgetForge compatibility:</p>
      
      <div className={styles.promptBox}>
        <pre><code>{`ACT AS a Senior Mendix & React Developer. Generate a Mendix Pluggable Widget based on:
Widget Name: [[WIDGET_NAME]]
Function: [[DESCRIPTION]]

RULES:
1. Provide 4 blocks: XML, TSX, CSS, JSON.
2. React 19, functional components.
3. NO @mendix/* or mendix/* imports.
4. NO createElement. Use JSX.
5. XML ID: com.widgetforge.[[WIDGET_NAME_LOWER]].[[WIDGET_NAME]]

BLOCK 1: Mendix XML (widget.xml)
BLOCK 2: React TSX ([[WIDGET_NAME]].tsx) - include import "./ui/[[WIDGET_NAME]].css"
BLOCK 3: CSS ([[WIDGET_NAME]].css)
BLOCK 4: Dependencies (JSON {"pkg": "version"})`}</code></pre>
      </div>

      <h3>Known Limitations</h3>
      <ul>
        <li><strong>Web Only</strong>: Native Mobile support is coming in Phase 2.</li>
        <li><strong>React 19</strong>: Build environment strictly uses React 19.</li>
        <li><strong>Mock Preview</strong>: Live preview uses local state, not a Mendix database.</li>
      </ul>

      <h3>Supported Packages (via esm.sh)</h3>
      <p>WidgetForge uses <strong>esm.sh</strong> to resolve npm packages. Most ESM-compatible libraries work:</p>
      <ul>
        <li><strong>Chart & Data</strong>: <code>recharts</code>, <code>chart.js</code>, <code>d3</code>, <code>big.js</code></li>
        <li><strong>UI & Animation</strong>: <code>framer-motion</code>, <code>lucide-react</code>, <code>clsx</code>, <code>canvas-confetti</code></li>
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
      <h1>Backend & API Reference</h1>
      <p>The backend is a Node.js Express server that handles the complex orchestration of scaffolding, building, and packaging Mendix widgets.</p>

      <h3>Tech Stack</h3>
      <ul>
        <li><strong>Express (ES6+)</strong>: Robust API routing.</li>
        <li><strong>Yeoman Engine</strong>: Utilizes <code>@mendix/generator-widget</code> for standardized widget scaffolding.</li>
        <li><strong>Adm-Zip</strong>: Advanced MPK manipulation to inject assets that default build tools often omit.</li>
        <li><strong>AI Providers</strong>: Integrated support for Google Gemini, OpenAI, and Anthropic.</li>
      </ul>

      <h3>End points</h3>
      <ul>
        <li><code>GET /api/health</code>: Basic heartbeat and service availability check.</li>
        <li><code>GET /api/ai/status</code>: Verifies connection health with the configured AI provider.</li>
        <li><code>POST /api/generate</code>: Full automation—takes a description and returns a compiled <code>.mpk</code> file.</li>
        <li><code>POST /api/bundle</code>: Expert mode—takes raw code strings and produces a validated Mendix package.</li>
      </ul>

      <h3>Backend Processing Logic</h3>
      <ol>
        <li><strong>Scaffolding</strong>: Creates a professional Mendix project structure programmatically.</li>
        <li><strong>Correction</strong>: Auto-fixes Widget IDs in XML and sanitizes TSX imports.</li>
        <li><strong>Build</strong>: Executes <code>npm install</code> and the <code>pluggable-widgets-tools</code> build.</li>
        <li><strong>MPK Injection</strong>: Manually injects CSS into the <code>.mpk</code> and updates the manifest.</li>
      </ol>

      <h3>Strategic Roadmap</h3>
      <ul>
        <li><strong>Phase 1 (Complete)</strong>: Web Widgets — AI & Manual orchestration.</li>
        <li><strong>Phase 2 (Upcoming)</strong>: Native Widgets — Mobile scaffolding.</li>
        <li><strong>Phase 3 (Vision)</strong>: Internal LLM Integration — In-tool code generation API.</li>
      </ul>
    </div>
  )
}

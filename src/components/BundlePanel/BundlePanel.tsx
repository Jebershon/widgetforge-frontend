import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import styles from './BundlePanel.module.css'
import clsx from 'clsx'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { acquireTypes, injectReactTypes, injectReactNativeTypes } from '@/utils/typeAcquisition'

export function BundlePanel() {
  const widgetName = useStore((s) => s.widgetName)
  const setWidgetMetaData = useStore((s) => s.setWidgetMetaData)
  const description = useStore((s) => s.description)
  const xmlCode = useStore((s) => s.xmlCode)
  const setXmlCode = useStore((s) => s.setXmlCode)
  const tsxCode = useStore((s) => s.tsxCode)
  const setTsxCode = useStore((s) => s.setTsxCode)

  const cssCode = useStore((s) => s.cssCode)
  const setCssCode = useStore((s) => s.setCssCode)
  const depsJson = useStore((s) => s.depsJson)
  const setDepsJson = useStore((s) => s.setDepsJson)
  const widgetPlatform = useStore((s) => s.widgetPlatform)
  const uploadedUtils = useStore((s) => s.uploadedUtils)
  const addUploadedUtil = useStore((s) => s.addUploadedUtil)
  const removeUploadedUtil = useStore((s) => s.removeUploadedUtil)

  const [activeTab, setActiveTab] = useState<'xml' | 'tsx' | 'css' | 'json' | 'utils'>('xml')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleUtilFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!/\.(js|ts|jsx|tsx)$/.test(file.name)) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        addUploadedUtil({ name: file.name, content: e.target?.result as string || '' });
  // Auto-prepend import line into the TSX editor (read current jsxCode from store)
        const importAlias = file.name.replace(/\.(js|ts|jsx|tsx)$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
        const importPath = `./utils/${file.name.replace(/\.(ts|tsx)$/, '')}`;
        const importLine = `import * as ${importAlias} from '${importPath}';\n`;
        const currentTsx = useStore.getState().tsxCode;
        // Don't add duplicate import lines
        if (!currentTsx.includes(`from '${importPath}'`)) {
          setTsxCode(importLine + currentTsx);
        }
      };
      reader.readAsText(file);
    });
  }, [addUploadedUtil, setTsxCode]);


  // Phase 2: Switch tab if CSS is active but platform is Native
  useEffect(() => {
    if (widgetPlatform === 'native' && activeTab === 'css') {
      setActiveTab('tsx');
    }

  }, [widgetPlatform, activeTab]);

  // Phase 2: Auto-sync XML platform type
  useEffect(() => {
    // 1. Sync XML platform
    const platformRegex = /supportedPlatform="([^"]*)"/;
    if (platformRegex.test(xmlCode)) {
      const currentXmlPlatform = xmlCode.match(platformRegex)?.[1];
      const targetXmlPlatform = widgetPlatform === 'native' ? 'Native' : 'Web';
      if (currentXmlPlatform !== targetXmlPlatform) {
        setXmlCode(xmlCode.replace(platformRegex, `supportedPlatform="${targetXmlPlatform}"`));
      }
    }
  }, [widgetPlatform, xmlCode, setXmlCode]);


  const [isMetaExpanded, setIsMetaExpanded] = useState(false)

  const [isBuilding, setIsBuilding] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // ── Name mismatch validation ───────────────────────────────────────────
  const nameMismatch = useMemo(() => {
    const issues: string[] = [];

    // Check XML <name> tag
    const xmlNameMatch = xmlCode.match(/<name>([^<]+)<\/name>/);
    if (xmlNameMatch && xmlNameMatch[1].trim() !== widgetName) {
      issues.push(`XML <name> is "${xmlNameMatch[1].trim()}" but Widget Name is "${widgetName}"`);
    }

    // Check TSX export function name
    const tsxFuncMatch = tsxCode.match(/export\s+(?:default\s+)?function\s+(\w+)/);
    if (tsxFuncMatch && tsxFuncMatch[1] !== widgetName) {
      issues.push(`TSX exports function "${tsxFuncMatch[1]}" but Widget Name is "${widgetName}"`);
    }

    return issues;
  }, [widgetName, xmlCode, tsxCode]);


  const monacoRef = useRef<any>(null)

  useEffect(() => {
    if (!monacoRef.current) return;

    const timer = setTimeout(() => {
      const parsePackages = () => {
        // 1. From Imports
        const importRegex = /import\s+(?:(?:[\w\*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]/g;
        const discoveredPkgs: string[] = [];
        let match;
        while ((match = importRegex.exec(tsxCode)) !== null) {

          const pkg = match[1];
          if (!pkg.startsWith('.') && !pkg.startsWith('/') && !['react', 'react-dom', 'mendix'].includes(pkg)) {
            discoveredPkgs.push(pkg);
          }
        }

        // 2. From Dependencies JSON
        try {
          const deps = JSON.parse(depsJson);
          Object.keys(deps).forEach(pkg => {
            if (!pkg.startsWith('@types/') && !['react', 'react-dom'].includes(pkg)) {
              discoveredPkgs.push(pkg);
            }
          });
        } catch (e) { /* ignore invalid json */ }

        return Array.from(new Set(discoveredPkgs));
      };

      const pkgs = parsePackages();
      if (pkgs.length > 0) {
        acquireTypes(monacoRef.current, pkgs);
      }

      if (widgetPlatform === 'native') {
        injectReactNativeTypes(monacoRef.current);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [tsxCode, depsJson, widgetPlatform]);


  // ── Register uploaded util files with Monaco for autocomplete ──────────────
  useEffect(() => {
    if (!monacoRef.current || uploadedUtils.length === 0) return;
    const monaco = monacoRef.current;

    // Keep track of disposables so we can clean up old registrations on change
    const disposables: { dispose(): void }[] = [];

    uploadedUtils.forEach(u => {
      // Virtual path must match the import path the user writes in their TSX.
      // We use file:///src/ as the project root.
      const base = u.name.replace(/\.(ts|tsx|js|jsx)$/, '');
      const virtualPath  = `file:///src/utils/${u.name}`;
      const virtualPath2 = `file:///src/utils/${base}`; // Extensionless for import resolution
      const virtualPath3 = `file:///src/utils/${base}.js`; // .js alias for .ts files

      const content = u.content;

      // addExtraLib returns a disposable; we'll clean up when uploadedUtils changes
      disposables.push(
        monaco.languages.typescript.typescriptDefaults.addExtraLib(content, virtualPath),
        monaco.languages.typescript.typescriptDefaults.addExtraLib(content, virtualPath2),
        monaco.languages.typescript.typescriptDefaults.addExtraLib(content, virtualPath3),
      );

      // Also create / update the Monaco model for the file so the language
      // server can fully resolve imports between files
      const uris = [virtualPath, virtualPath2, virtualPath3].map(v => monaco.Uri.parse(v));
      uris.forEach(uri => {
        if (!monaco.editor.getModel(uri)) monaco.editor.createModel(content, 'typescript', uri);
      });
    });

    return () => {
      // Dispose the extra-lib entries when util files change or component unmounts
      disposables.forEach(d => d.dispose());
    };
  }, [uploadedUtils]);

  const bundleWidget = useStore((s) => s.bundleWidget)
  const addLog = useStore((s) => s.addLog)

  const handleBeforeMount = (monaco: any) => {
    monacoRef.current = monaco;
    injectReactTypes(monaco);

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
    });

    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `
      declare namespace React {
        interface ReactElement { }
        function createElement(type: any, props?: any, ...children: any[]): ReactElement;
      }
      declare namespace JSX {
        interface IntrinsicElements {
          [elemName: string]: any;
        }
      }
      `,
      'file:///node_modules/@types/react/index.d.ts'
    );
  }

  const handleFormat = (editorInstance: editor.IStandaloneCodeEditor) => {
    editorInstance.getAction('editor.action.formatDocument')?.run()
  }

  const handleBundle = async () => {
    setErrorMsg('')
    setIsBuilding(true)
    await bundleWidget()
    setIsBuilding(false)
  }


  return (
    <div className={styles.panel}>
      <div className={styles.metaSection}>
        <div
          className={clsx(styles.metaToggle, isMetaExpanded && styles.metaToggleActive)}
          onClick={() => setIsMetaExpanded(prev => !prev)}
        >
          <div className={styles.metaTitleRow}>
            <div className={clsx(styles.chevron, isMetaExpanded && styles.chevronExpanded)}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div className={styles.metaInfo}>
              <span className={styles.metaTitle}>{widgetName || 'Unnamed Widget'}</span>
              <span className={styles.metaVersion}>v1.0.0</span>
            </div>
          </div>
          <div className={styles.metaRight}>
            <span className={styles.clickHint}>
              {isMetaExpanded ? 'Click to collapse' : 'Click to edit metadata'}
            </span>
            <button
              className={styles.aiHelpBtnSmall}
              onClick={(e) => {
                e.stopPropagation();
                const wn = widgetName || '[WidgetName]';
                const wnLower = widgetName ? widgetName.toLowerCase() : '[widgetnamelowercase]';
                const desc = description || '[Describe what this widget does]';
                const prompt = `ACT AS a Senior Mendix and React developer. Generate a production-ready Mendix 10 Pluggable Widget for WidgetForge.

WIDGET NAME: ${wn}
WIDGET FUNCTION: ${desc}
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
BLOCK 1 RULES — XML (widget.xml)
════════════════════════════════════════════

- Widget ID format:  com.widgetforge.${wnLower}.${wn}
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
BLOCK 2 RULES — TSX (${wn}.tsx)
════════════════════════════════════════════

- Line 1 MUST be:
  import React, { createElement, useState, useRef, useEffect, useCallback } from "react";
  (The default React import is REQUIRED — omitting it causes TS2552 in the Mendix Rollup build.)

- Use createElement() for ALL elements. NEVER use JSX angle-bracket syntax (<div>, <span>, etc.).
  CORRECT:   createElement("div", { className: "foo" }, "Hello")
  WRONG:     <div className="foo">Hello</div>

- Use a named export:  export function ${wn}(props: ${wn}Props) { ... }
  NEVER use:           export default function ...

- Define a Props interface whose keys exactly match the XML property key= attributes:
  - Attribute props:  { value?: T; setValue: (v: T) => void }
  - Action props:     () => void
  - Enum/bool/int:    plain TypeScript type (string | boolean | number)

- DO NOT import CSS. Do NOT write: import "./ui/${wn}.css";
- DO NOT import from "mendix/", "@mendix/", or use mx.ui.* globals.
- ALL React state in hooks (useState, useReducer, useCallback, useMemo).
- Close dropdowns on outside click using useRef + document.addEventListener("mousedown").
- Guard all optional props with optional chaining: props.myAttr?.value

════════════════════════════════════════════
BLOCK 3 RULES — CSS (${wn}.css)
════════════════════════════════════════════

- EVERY selector must start with .widget-${wnLower}
  e.g., .widget-${wnLower} { ... }
       .widget-${wnLower} .inner { ... }
- Include the root reset:
  .widget-${wnLower}, .widget-${wnLower} * { box-sizing: border-box; }
- Use Flexbox or Grid for layout. Avoid fixed pixel widths on the root element.
- Provide hover, focus-visible, and disabled states for all interactive elements.
- Use CSS custom properties (variables) for colors and spacing so Mendix themes can override them.
- Prefix all @keyframes names: @keyframes ${wnLower}-fade-in { ... }

════════════════════════════════════════════
BLOCK 4 RULES — JSON (dependencies)
════════════════════════════════════════════

- Return a flat JSON object of npm package names to version strings.
- Example: { "lucide-react": "latest", "date-fns": "3.6.0" }
- If the widget uses only React built-ins, return: {}
- Do NOT include react, react-dom, or mendix packages — they are pre-installed.

════════════════════════════════════════════`;
                navigator.clipboard.writeText(prompt);
                addLog({ tag: 'INFO', message: '✅ System Prompt copied to clipboard! Paste it into any AI agent.' });
              }}
              title="Copy Prompt Template"
            >
              ?
            </button>
          </div>
        </div>

        <div className={clsx(styles.metaWrapper, isMetaExpanded && styles.metaWrapperExpanded)}>
          <div className={styles.metaFields}>
            <div className={styles.metaFieldsInner}>
              <div className={styles.inputGroup}>
                <div className={styles.labelRow}>
                  <label>Widget Name</label>
                  <span className={styles.labelHint}>UpperCamelCase</span>
                </div>
                <div className={styles.inputContainer}>
                  <input
                    type="text"
                    value={widgetName}
                    onChange={e => setWidgetMetaData(e.target.value, description)}
                    className={styles.input}
                    placeholder="e.g. DataGridPro"
                    spellCheck={false}
                  />
                  {/^[A-Z][a-zA-Z0-9]*$/.test(widgetName) && (
                    <span className={styles.inputBadge} title="Valid PascalCase">✓ OK</span>
                  )}
                </div>
              </div>
              <div className={styles.inputGroup}>
                <div className={styles.labelRow}>
                  <label>Description</label>
                </div>
                <div className={styles.inputContainer}>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setWidgetMetaData(widgetName, e.target.value)}
                    className={styles.input}
                    placeholder="Describe what this widget does..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.editorContainer}>
        <div className={styles.tabs}>
          <button
            className={clsx(styles.tabBtn, activeTab === 'xml' && styles.tabActive)}
            onClick={() => setActiveTab('xml')}
          >
            <span className={clsx(styles.langBadge, styles.badgeXml)}>XML</span> Widget XML
          </button>
          <button
            className={clsx(styles.tabBtn, activeTab === 'tsx' && styles.tabActive)}
            onClick={() => setActiveTab('tsx')}
          >
            <span className={clsx(styles.langBadge, styles.badgeTsx)}>TSX</span> Component TSX
          </button>

          {widgetPlatform === 'web' && (
            <button
              className={clsx(styles.tabBtn, activeTab === 'css' && styles.tabActive)}
              onClick={() => setActiveTab('css')}
            >
              <span className={clsx(styles.langBadge, styles.badgeCss)}>CSS</span> Widget CSS
            </button>
          )}
          <button
            className={clsx(styles.tabBtn, activeTab === 'json' && styles.tabActive)}
            onClick={() => setActiveTab('json')}
          >
            <span className={clsx(styles.langBadge, styles.badgeJson)}>JSON</span> Dependencies
          </button>
          <button
            className={clsx(styles.tabBtn, activeTab === 'utils' && styles.tabActive)}
            onClick={() => setActiveTab('utils')}
          >
            <span className={clsx(styles.langBadge, styles.badgeUtils)}>JS</span>
            Utils
            {uploadedUtils.length > 0 && (
              <span className={styles.utilsBadgeCount}>{uploadedUtils.length}</span>
            )}
          </button>
        </div>

        <div className={styles.editorWrapper}>
          {activeTab === 'xml' && (
            <Editor
              language="xml"
              theme="vs-dark"
              value={xmlCode}
              onChange={(val) => setXmlCode(val || '')}
              options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
              onMount={(editor, monacoValue) => {
                editor.addCommand(monacoValue.KeyMod.CtrlCmd | monacoValue.KeyMod.KeyS, () => handleFormat(editor))
              }}
            />
          )}
          {activeTab === 'tsx' && (
            <Editor
              language="typescript"
              theme="vs-dark"
              value={tsxCode}
              path="file:///src/Widget.tsx"
              beforeMount={handleBeforeMount}
              onChange={(val) => setTsxCode(val || '')}
              options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
              onMount={(editor, monacoValue) => {
                editor.addCommand(monacoValue.KeyMod.CtrlCmd | monacoValue.KeyMod.KeyS, () => handleFormat(editor))
              }}
            />
          )}

          {activeTab === 'css' && (
            <Editor
              language="css"
              theme="vs-dark"
              value={cssCode}
              onChange={(val) => setCssCode(val || '')}
              options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
              onMount={(editor, monacoValue) => {
                editor.addCommand(monacoValue.KeyMod.CtrlCmd | monacoValue.KeyMod.KeyS, () => handleFormat(editor))
              }}
            />
          )}
          {activeTab === 'json' && (
            <Editor
              language="json"
              theme="vs-dark"
              value={depsJson}
              onChange={(val) => setDepsJson(val || '')}
              options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
              onMount={(editor, monacoValue) => {
                editor.addCommand(monacoValue.KeyMod.CtrlCmd | monacoValue.KeyMod.KeyS, () => handleFormat(editor))
              }}
            />
          )}
          {activeTab === 'utils' && (
            <div className={styles.utilsPanel}>
              <div
                className={clsx(styles.dropZone, isDragging && styles.dropZoneActive)}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleUtilFiles(e.dataTransfer.files); }}
              >
                <span className={styles.dropIcon}>📂</span>
                <span className={styles.dropLabel}>Drop <code>.js</code> / <code>.ts</code> files here</span>
                <span className={styles.dropHint}>or click to browse</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".js,.ts,.jsx,.tsx"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => handleUtilFiles(e.target.files)}
                />
              </div>
              {uploadedUtils.length > 0 && (
                <div className={styles.utilsList}>
                  <div className={styles.utilsListHeader}>Uploaded Files — use in TSX as:</div>
                  {uploadedUtils.map(u => (
                    <div key={u.name} className={styles.utilsItem}>
                      <span className={styles.utilsItemIcon}>📄</span>
                      <div className={styles.utilsItemInfo}>
                        <span className={styles.utilsItemName}>{u.name}</span>
                        <code className={styles.utilsItemImport}>{`import { ... } from './utils/${u.name.replace(/\.(ts|tsx)$/, '')}'`}</code>
                      </div>
                      <button
                        className={styles.utilsDeleteBtn}
                        onClick={() => removeUploadedUtil(u.name)}
                        title="Remove file"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
              {uploadedUtils.length === 0 && (
                <p className={styles.utilsEmpty}>No utility files uploaded yet. Uploaded files will be available as imports in your TSX component and included in the final .mpk build.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        {nameMismatch.length > 0 && (
          <div className={styles.mismatchWarn}>
            <span className={styles.mismatchIcon}>⚠</span>
            <div className={styles.mismatchList}>
              {nameMismatch.map((issue, i) => (
                <div key={i}>{issue}</div>
              ))}
            </div>
          </div>
        )}
        {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}
        <button
          className={clsx(styles.bundleBtn, isBuilding && styles.bundleBtnLoading)}
          onClick={handleBundle}
          disabled={isBuilding}
        >
          {isBuilding ? 'Bundling...' : 'Bundle Widget ▶'}
        </button>
      </div>
    </div>
  )
}

import { useStore } from '@/store/useStore'
import styles from './MainPanel.module.css'
import clsx from 'clsx'
import { useState, useEffect, useRef, useMemo } from 'react'
import { prepareLiveModule } from '@/utils/liveRuntime'
import { parseWidgetProps } from '@/utils/xmlUtils'
import type { PreviewTab, LogEntry, PipelineStep } from '@/types'
import { SafeAnsi } from '@/utils/ansiUtils'

export function MainPanel() {
  const activeTab = useStore((s) => s.activeTab)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const logs = useStore((s) => s.logs)
  const pipelineSteps = useStore((s) => s.pipelineSteps)
  const generatedFiles = useStore((s) => s.generatedFiles)
  const buildStatus = useStore((s) => s.buildStatus)
  const appMode = useStore((s) => s.appMode)

  const errorCount = logs.filter((l) => l.tag === 'ERR').length

  const tabs: { id: PreviewTab; label: string; badge?: number }[] = [
    { id: 'buildlog', label: 'Build Log' },
    ...(appMode === 'generate' ? [{ id: 'code' as const, label: 'Generated Code' }] : []),
    { id: 'preview',  label: 'Preview' },
    { id: 'errors',   label: 'Errors', badge: errorCount },
  ]

  const statusLabel =
    buildStatus === 'idle'       ? null :
    buildStatus === 'generating' ? 'Generating code…' :
    buildStatus === 'building'   ? 'Running npm build…' :
    buildStatus === 'packaging'  ? 'Packaging .mpk…' :
    buildStatus === 'done'       ? 'Build complete ✓' :
    'Build error'

  return (
    <main className={styles.panel}>
      {/* Tab bar */}
      <div className={styles.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={clsx(styles.tab, activeTab === tab.id && styles.tabActive)}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={styles.tabBadge}>{tab.badge}</span>
            )}
          </button>
        ))}
        <div className={styles.tabSpacer} />
        {statusLabel && (
          <div className={clsx(styles.statusChip, buildStatus === 'done' && styles.statusDone)}>
            <span className={styles.statusDot} />
            {statusLabel}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={styles.content}>
        {activeTab === 'buildlog' && <BuildLog logs={logs} />}
        {activeTab === 'code' && <CodeViewer files={generatedFiles} />}
        {activeTab === 'preview' && <WidgetPreview />}
        {activeTab === 'errors' && <ErrorsView logs={logs} />}
      </div>

      {/* Pipeline */}
      <Pipeline steps={pipelineSteps} />
    </main>
  )
}

// ── Build Log ──────────────────────────────────────────────────

function BuildLog({ logs }: { logs: LogEntry[] }) {
  return (
    <div className={styles.terminal}>
      {logs.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚡</div>
          <p>Enter a prompt to start building your widget</p>
        </div>
      ) : (
        logs.map((log) => (
          <div key={log.id} className={styles.logLine}>
            <span className={styles.logTime}>{log.timestamp}</span>
            <span className={clsx(styles.logTag, styles[`tag_${log.tag}`])}>{log.tag}</span>
            <span className={styles.logMsg}><SafeAnsi text={log.message} /></span>
          </div>
        ))
      )}
      {logs.length > 0 && <span className={styles.cursor} />}
    </div>
  )
}

// ── Code Viewer ───────────────────────────────────────────────

function CodeViewer({ files }: { files: { name: string; language: string; content: string }[] }) {
  // Simple: show file tabs + content
  if (files.length === 0) {
    return (
      <div className={styles.terminal}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📄</div>
          <p>Generated files will appear here after a build</p>
        </div>
      </div>
    )
  }

  return <CodePanelInner files={files} />
}

function CodePanelInner({ files }: { files: { name: string; language: string; content: string }[] }) {
  const [selected, setSelected] = useCodeSelection(files[0]?.name)
  const file = files.find((f) => f.name === selected) ?? files[0]

  return (
    <div className={styles.codePanel}>
      <div className={styles.fileTabs}>
        {files.map((f) => (
          <button
            key={f.name}
            className={clsx(styles.fileTab, selected === f.name && styles.fileTabActive)}
            onClick={() => setSelected(f.name)}
          >
            <FileIcon lang={f.language} />
            {f.name}
          </button>
        ))}
      </div>
      <div className={styles.codeContent}>
        <pre className={styles.code}><code>{file?.content}</code></pre>
      </div>
    </div>
  )
}

function useCodeSelection(initial: string | undefined) {
  const [sel, setSel] = useState(initial ?? '')
  return [sel, setSel] as const
}

function FileIcon({ lang }: { lang: string }) {
  const color = lang === 'xml' ? '#f59e0b' : lang === 'tsx' || lang === 'ts' ? '#06b6d4' : '#8b5cf6'
  return (
    <span style={{ color, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', marginRight: 4 }}>
      {lang.toUpperCase()}
    </span>
  )
}

// ── Widget Preview ────────────────────────────────────────────

function WidgetPreview() {
  const jsxCode = useStore((s) => s.jsxCode)
  const cssCode = useStore((s) => s.cssCode)
  const xmlCode = useStore((s) => s.xmlCode)
  const widgetName = useStore((s) => s.widgetName)
  const mockProps = useStore((s) => s.mockProps)
  const setMockProp = useStore((s) => s.setMockProp)
  
  const [error, setError] = useState<string | null>(null)
  const [showProps, setShowProps] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const properties = useMemo(() => parseWidgetProps(xmlCode), [xmlCode])

  useEffect(() => {
    if (!jsxCode.trim() || !iframeRef.current) return;

    const loadInIframe = async () => {
      const result = prepareLiveModule(jsxCode);
      if (result.error) {
        setError(result.error);
        return;
      }

      setError(null);
      const iframe = iframeRef.current!;
      const win = iframe.contentWindow;
      if (!win) return;

      // Create the loader script for the iframe
      const loaderScript = `
        import * as React from 'https://esm.sh/react@19';
        import { createRoot } from 'https://esm.sh/react-dom@19/client';
        import * as WidgetModule from '${result.url}';

        const rootEl = document.getElementById('root');
        const props = ${JSON.stringify(mockProps)};

        if (rootEl) {
          try {
            const root = createRoot(rootEl);
            const Comp = WidgetModule['${widgetName}'] || WidgetModule.default;
            if (Comp) {
              root.render(React.createElement(Comp, props));
            } else {
              document.body.innerHTML = '<div style="color: #ef4444; padding: 20px; font-family: sans-serif;"><b>Error:</b> Component "${widgetName}" not found.</div>';
            }
          } catch (err) {
            document.body.innerHTML = '<div style="color: #ef4444; padding: 20px; font-family: sans-serif;"><b>Render Error:</b> ' + err.message + '</div>';
          }
        }
      `;

      // Reset iframe content and inject the module loader
      const doc = iframe.contentDocument!;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: transparent; color: #fff; }
              #root { width: 100%; height: 100%; }
              /* User Styles */
              ${cssCode}
            </style>
          </head>
          <body>
            <div id="root"></div>
            <script type="module">${loaderScript}</script>
          </body>
        </html>
      `);
      doc.close();
    };

    const timer = setTimeout(loadInIframe, 500);
    return () => clearTimeout(timer);
  }, [jsxCode, cssCode, widgetName, mockProps]);

  return (
    <div className={styles.previewArea}>
      <div className={styles.previewBar}>
        <span className={styles.previewLabel}>Live Preview — {widgetName || 'Unnamed Widget'}</span>
        <div className={styles.tabSpacer} />
        <button 
          className={clsx(styles.togglePropsBtn, showProps && styles.togglePropsBtnActive)}
          onClick={() => setShowProps(!showProps)}
          title={showProps ? 'Hide Properties' : 'Show Properties'}
        >
          {showProps ? 'Hide Properties ◂' : 'Show Properties ▸'}
        </button>
      </div>
      <div className={clsx(styles.previewContent, !showProps && styles.previewContentFull)}>
        <div className={styles.previewCanvas}>
          {error && (
            <div className={styles.previewError}>
              <div className={styles.errIcon}>⚠️</div>
              <p><strong>Transpilation Error</strong></p>
              <pre>{error}</pre>
            </div>
          )}
          <iframe 
            ref={iframeRef} 
            className={styles.previewIframe} 
            title="Widget Preview"
            sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups allow-downloads"
          />
        </div>
        
        <aside className={clsx(styles.propsSidebar, !showProps && styles.propsSidebarCollapsed)}>
          <div className={styles.propsHeader}>Properties</div>
          <div className={styles.propsList}>
            {properties.length === 0 ? (
              <div className={styles.noProps}>No properties found in XML</div>
            ) : (
              properties.map(p => (
                <div key={p.key} className={styles.propGroup}>
                  <div className={styles.propLabel}>
                    <strong>{p.caption}</strong>
                    <span className={styles.propType}>{p.type}</span>
                  </div>
                  {p.description && <p className={styles.propDescription}>{p.description}</p>}
                  
                  {p.type === 'boolean' ? (
                    <label className={styles.propToggle}>
                      <input 
                        type="checkbox" 
                        checked={!!mockProps[p.key]} 
                        onChange={e => setMockProp(p.key, e.target.checked)}
                      />
                      <span>{mockProps[p.key] ? 'True' : 'False'}</span>
                    </label>
                  ) : p.type === 'integer' || p.type === 'decimal' ? (
                    <input 
                      type="number" 
                      className={styles.propInput}
                      value={mockProps[p.key] ?? p.defaultValue ?? ''}
                      onChange={e => setMockProp(p.key, Number(e.target.value))}
                    />
                  ) : (
                    <input 
                      type="text" 
                      className={styles.propInput}
                      value={mockProps[p.key] ?? p.defaultValue ?? ''}
                      onChange={e => setMockProp(p.key, e.target.value)}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

// ── Errors view ───────────────────────────────────────────────

function ErrorsView({ logs }: { logs: LogEntry[] }) {
  const errors = logs.filter((l) => l.tag === 'ERR')
  return (
    <div className={styles.terminal}>
      {errors.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✓</div>
          <p style={{ color: 'var(--success)' }}>No errors — build is clean</p>
        </div>
      ) : (
        errors.map((log) => (
          <div key={log.id} className={styles.logLine}>
            <span className={styles.logTime}>{log.timestamp}</span>
            <span className={clsx(styles.logTag, styles.tag_ERR)}>ERR</span>
            <span className={styles.logMsg} style={{ color: 'var(--danger)' }}>
              <SafeAnsi text={log.message} />
            </span>
          </div>
        ))
      )}
    </div>
  )
}

// ── Pipeline ──────────────────────────────────────────────────

function Pipeline({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className={styles.pipeline}>
      {steps.map((step, i) => (
        <div key={step.id} className={styles.stepWrap}>
          <div className={clsx(styles.step, styles[`step_${step.status}`])}>
            <div className={styles.stepIcon}>
              {step.status === 'done'    ? '✓' :
               step.status === 'error'  ? '✗' :
               step.status === 'running' ? <Spinner /> :
               String(i + 1).padStart(2, '0')}
            </div>
            <span className={styles.stepLabel}>{step.shortLabel}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={clsx(styles.stepLine, step.status === 'done' && styles.stepLineDone)} />
          )}
        </div>
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'spin 0.75s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
    </svg>
  )
}

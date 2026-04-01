import { useStore } from '@/store/useStore'
import styles from './MainPanel.module.css'
import clsx from 'clsx'
import { useState, useEffect, useRef, useMemo } from 'react'
import { prepareLiveModule, transpileUtil } from '@/utils/liveRuntime'
import { parseWidgetProps, friendlyTypeName } from '@/utils/xmlUtils'
import type { PreviewTab, LogEntry, PipelineStep } from '@/types'
import { SafeAnsi } from '@/utils/ansiUtils'
import { MobileEmulator } from '../MobileEmulator/MobileEmulator'

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
    ...(appMode === 'generate' ? [{ id: 'code' as const, label: 'Generated TSX' }] : []),

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

      <div className={styles.content}>
        {activeTab === 'buildlog' && <BuildLog logs={logs} />}
        {activeTab === 'code' && <CodeViewer files={generatedFiles} />}
        {activeTab === 'preview' && <WidgetPreview />}
        {activeTab === 'errors' && <ErrorsView logs={logs} />}
      </div>

      <Pipeline steps={pipelineSteps} />
    </main>
  )
}

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

function CodeViewer({ files }: { files: { name: string; language: string; content: string }[] }) {
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

function WidgetPreview() {
  const tsxCode = useStore((s) => s.tsxCode)

  const cssCode = useStore((s) => s.cssCode)
  const xmlCode = useStore((s) => s.xmlCode)
  const widgetName = useStore((s) => s.widgetName)
  const mockProps = useStore((s) => s.mockProps)
  const widgetPlatform = useStore((s) => s.widgetPlatform)
  const setMockProp = useStore((s) => s.setMockProp)
  const uploadedUtils = useStore((s) => s.uploadedUtils)
  
  const [error, setError] = useState<string | null>(null)
  const [showProps, setShowProps] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const properties = useMemo(() => parseWidgetProps(xmlCode), [xmlCode])

  useEffect(() => {
    if (!tsxCode.trim() || !iframeRef.current) return;

    const loadInIframe = async () => {
      const result = prepareLiveModule(tsxCode);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(null);
      const iframe = iframeRef.current!;

      // Prepare Native Shim blob
      let shimUrl = '';
      if (widgetPlatform === 'native') {
        const shimCode = `
          import * as RNWeb from 'https://esm.sh/react-native-web@0.19?deps=react@18,react-dom@18';

          // --- Proxy fallback for any unknown export ---
          // This catches ALL missing named exports so no library can throw "does not provide an export named X"
          const noop = () => {};
          const noopObj = new Proxy({}, { get: () => noop, apply: () => {} });

          // Re-export everything react-native-web provides
          export const {
            View, Text, TextInput, ScrollView, FlatList, SectionList,
            TouchableOpacity, TouchableHighlight, TouchableWithoutFeedback, TouchableNativeFeedback,
            Pressable, Image, ImageBackground, Modal, ActivityIndicator,
            Switch, Slider, Picker, WebView,
            StyleSheet, Animated, Easing, LayoutAnimation,
            Platform, Dimensions, PixelRatio, AppRegistry,
            findNodeHandle, NativeModules, processColor,
            KeyboardAvoidingView, SafeAreaView, StatusBar,
            RefreshControl, VirtualizedList,
            PanResponder, Vibration, Share, Linking, Alert,
            BackHandler, AccessibilityInfo, Appearance,
            Keyboard, AppState, NetInfo,
            DrawerLayoutAndroid, ProgressBarAndroid,
          } = { ...RNWeb };

          // --- Stable mocks for native-only APIs react-native-web doesn't have ---
          export const UIManager = RNWeb.UIManager || {
            getViewManagerConfig: () => ({ Commands: {} }),
            dispatchViewManagerCommand: noop,
            measure: noop, measureInWindow: noop, measureLayout: noop,
            setLayoutAnimationEnabledExperimental: noop,
            configureNextLayoutAnimation: noop,
          };

          export class NativeEventEmitter {
            constructor(_nativeModule) {}
            addListener(_event, _handler) { return { remove: noop }; }
            removeAllListeners(_event) {}
            emit(_event, ..._args) {}
            removeSubscription(_sub) {}
          }

          export const InteractionManager = {
            runAfterInteractions: (cb) => { cb && cb(); return { cancel: noop }; },
            createInteractionHandle: () => 0,
            clearInteractionHandle: noop,
            setDeadline: noop,
          };

          export const DeviceEventEmitter = {
            addListener: (_event, _handler) => ({ remove: noop }),
            removeAllListeners: noop,
            emit: noop,
          };

          export const requireNativeComponent = (name) => {
            return (props) => {
              const React = window.React;
              return React.createElement('div', { 
                style: { 
                  backgroundColor: '#1a1a1a', color: '#aaa', 
                  padding: '40px 20px', textAlign: 'center',
                  borderRadius: 12, border: '1px dashed #555',
                  fontSize: '12px', fontFamily: 'monospace', margin: 8
                } 
              }, '[Native: ' + name + ']');
            };
          };

          export const NativeAnimatedAPI = noopObj;
          export const TurboModuleRegistry = { get: () => null, getEnforcing: () => noopObj };
          export const DevSettings = { addMenuItem: noop, reload: noop };
          export const LogBox = { ignoreLogs: noop, ignoreAllLogs: noop, install: noop };

          export default { ...RNWeb, UIManager, NativeEventEmitter, requireNativeComponent, InteractionManager, DeviceEventEmitter };
        `;
        shimUrl = URL.createObjectURL(new Blob([shimCode], { type: 'application/javascript' }));
      }

      const doc = iframe.contentDocument!;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <base href="${window.location.origin}/" />
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
            <style>
              html, body {
                margin: 0; padding: 0; min-height: 100%; width: 100%; 
                overflow-x: hidden;
                background: ${widgetPlatform === 'native' ? '#fff' : 'transparent'};
                color: ${widgetPlatform === 'native' ? '#000' : '#fff'};
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              }
              #root { display: flex; flex-direction: column; width: 100%; min-height: 100%; }
              ${widgetPlatform === 'web' ? cssCode : ''}
            </style>
            <script type="importmap">
            {
              "imports": {
                "react": "https://esm.sh/react@18",
                "react-dom": "https://esm.sh/react-dom@18",
                "react-native": "${shimUrl || 'https://esm.sh/react-native-web@0.19?deps=react@18,react-dom@18'}"
                ${uploadedUtils.length > 0 ? uploadedUtils.map(u => {
                  const baseName = u.name.replace(/\.(ts|tsx|js|jsx)$/, '');
                  const jsContent = transpileUtil(u.content, u.name);
                  const utilBlob = URL.createObjectURL(new Blob([jsContent], { type: 'application/javascript' }));
                  return `, "https://widgetforge.local/utils/${baseName}": "${utilBlob}", "https://widgetforge.local/utils/${u.name}": "${utilBlob}", "https://widgetforge.local/utils/${baseName}.js": "${utilBlob}"`;
                }).join('') : ''}
              }
            }
            </script>
          </head>
          <body>
            <div id="root"></div>
            <script type="module">
              import * as React from 'react';
              import * as ReactDOM from 'react-dom';
              import { createRoot } from 'https://esm.sh/react-dom@18/client';
              ${widgetPlatform === 'native' ? "import * as RN from 'react-native';" : ""}

              window.React = React;
              window.ReactNative = ${widgetPlatform === 'native' ? 'RN' : 'null'};

              async function run() {
                const rootEl = document.getElementById('root');
                const mockData = ${JSON.stringify(mockProps)};
                const sanitizedProps = { ...mockData };
                
                // Safely parse any mockProps that are JSON strings
                Object.keys(sanitizedProps).forEach(key => {
                  const val = sanitizedProps[key];
                  if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
                    try { sanitizedProps[key] = JSON.parse(val); } catch (e) {}
                  }
                });

                try {
                  const WidgetModule = await import('${result.url}');
                  const Comp = WidgetModule['${widgetName}'] || WidgetModule.default;
                  if (Comp && rootEl) {
                    ${widgetPlatform === 'native' ? `
                      RN.AppRegistry.registerComponent('App', () => Comp);
                      RN.AppRegistry.runApplication('App', { 
                        rootTag: rootEl,
                        initialProps: sanitizedProps
                      });
                    ` : `
                      const root = createRoot(rootEl);
                      root.render(React.createElement(Comp, sanitizedProps));
                    `}
                  }
                } catch (err) {
                  if (rootEl) {
                    rootEl.innerHTML = '<div style="color: #ef4444; padding: 20px; font-family: sans-serif;"><b>Preview Error:</b> ' + String(err) + '</div>';
                  }
                  console.error('Preview Runtime Error:', err);
                }
              }
              run();
            </script>
          </body>
        </html>
      `);
      doc.close();
    };

    const timer = setTimeout(loadInIframe, 500);
    return () => clearTimeout(timer);
  }, [tsxCode, cssCode, widgetName, mockProps, widgetPlatform, uploadedUtils]);



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
          {widgetPlatform === 'web' && (
            <iframe 
              ref={iframeRef} 
              className={styles.previewIframe} 
              title="Widget Preview"
              sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups allow-downloads"
            />
          )}

          {widgetPlatform === 'native' && (
            <div className={styles.emulatorOverlay}>
              <MobileEmulator platform="android">
                <iframe 
                  ref={iframeRef} 
                  className={styles.emulatorIframe} 
                  title="Widget Native Preview"
                  sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups allow-downloads"
                />
              </MobileEmulator>
            </div>
          )}
        </div>
        
          <aside className={clsx(styles.propsSidebar, !showProps && styles.propsSidebarCollapsed)}>
          <div className={styles.propsHeader}>Properties</div>
          <div className={styles.propsList}>
            {properties.length === 0 ? (
              <div className={styles.noProps}>No properties found in XML</div>
            ) : (() => {
              // Group properties by their 'group' field
              const groups = new Map<string, typeof properties>();
              properties.filter(p => !p.linkedDataSource).forEach(p => {
                const g = p.group || '';
                if (!groups.has(g)) groups.set(g, []);
                groups.get(g)!.push(p);
              });
              
              const renderInput = (p: (typeof properties)[0]) => {
                // Boolean
                if (p.type === 'boolean') return (
                  <label className={styles.propToggle}>
                    <input type="checkbox" checked={!!mockProps[p.key]} onChange={e => setMockProp(p.key, e.target.checked)} />
                    <span className={styles.toggleSlider}></span>
                    <span className={styles.toggleLabel}>{mockProps[p.key] ? 'True' : 'False'}</span>
                  </label>
                );
                // Enumeration
                if (p.type === 'enumeration') return (
                  <select className={styles.propSelect} value={mockProps[p.key] ?? p.defaultValue ?? ''} onChange={e => setMockProp(p.key, e.target.value)}>
                    {p.options?.map(opt => <option key={opt.key} value={opt.key}>{opt.caption}</option>)}
                  </select>
                );
                // DateTime
                if (p.type === 'datetime') return (
                  <input type="date" className={styles.propInput} value={mockProps[p.key] || ''} onChange={e => setMockProp(p.key, e.target.value)} />
                );
                // Action / Microflow / Nanoflow
                if (p.type === 'action' || p.type === 'microflow' || p.type === 'nanoflow') return (
                  <button className={styles.propActionButton} onClick={() => alert(`${friendlyTypeName(p.type)} "${p.caption}" triggered!`)}>
                    ⚡ {p.type === 'nanoflow' ? 'Run Nanoflow' : p.type === 'microflow' ? 'Run Microflow' : 'Trigger Action'}
                  </button>
                );
                // DataSource / Object (list) / isList — with inline field mapping for linked attributes
                if (p.type === 'datasource' || p.type === 'object' || p.isList) {
                  // All attribute properties that are linked to this datasource
                  const linkedAttrs = properties.filter(lp => lp.linkedDataSource === p.key);
                  // Detect field names from parsed JSON to populate dropdowns
                  const jsonFields: string[] = (() => {
                    try {
                      const raw = mockProps[p.key];
                      const arr = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
                      if (Array.isArray(arr) && arr.length > 0) return Object.keys(arr[0]);
                    } catch { /* invalid JSON */ }
                    return [];
                  })();
                  return (
                    <div className={styles.propListControl}>
                      {/* JSON data editor */}
                      <textarea
                        className={styles.propTextarea}
                        placeholder={'[\n  { "id": "1", "name": "Item 1", "value": 100 },\n  { "id": "2", "name": "Item 2", "value": 200 }\n]'}
                        value={typeof mockProps[p.key] === 'string' ? mockProps[p.key] : JSON.stringify(mockProps[p.key] || [], null, 2)}
                        onChange={e => setMockProp(p.key, e.target.value)}
                        rows={5}
                        spellCheck={false}
                      />
                      <div className={styles.propHint}>
                        <span>JSON array of objects · <code>props.{p.key}</code></span>
                        <button className={styles.propMiniBtn} onClick={() => setMockProp(p.key, JSON.stringify([
                          { id: '1', name: 'Item 1', value: 100 },
                          { id: '2', name: 'Item 2', value: 200 },
                          { id: '3', name: 'Item 3', value: 300 },
                        ], null, 2))}>Sample data</button>
                      </div>

                      {/* Field Mapping section for linked attribute properties */}
                      {linkedAttrs.length > 0 && (
                        <div className={styles.fieldMappings}>
                          <div className={styles.fieldMappingsLabel}>
                            🔗 Field Mappings
                            <span className={styles.fieldMappingsHint}>Map JSON fields → attribute props</span>
                          </div>
                          {linkedAttrs.map(lp => {
                            const currentVal = mockProps[lp.key] ?? '';
                            return (
                              <div key={lp.key} className={styles.fieldMappingRow}>
                                <div className={styles.fieldMappingMeta}>
                                  <span className={styles.fieldMappingCaption}>{lp.caption}</span>
                                  <code className={styles.fieldMappingKey}>props.{lp.key}</code>
                                </div>
                                <div className={styles.fieldMappingControl}>
                                  {jsonFields.length > 0 ? (
                                    <select
                                      className={styles.propSelect}
                                      value={currentVal}
                                      onChange={e => setMockProp(lp.key, e.target.value)}
                                    >
                                      <option value="">— select field —</option>
                                      {jsonFields.map(f => (
                                        <option key={f} value={f}>{f}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      className={styles.propInput}
                                      placeholder="field name (e.g. name)"
                                      value={currentVal}
                                      onChange={e => setMockProp(lp.key, e.target.value)}
                                    />
                                  )}
                                  {lp.attributeTypes && (
                                    <span className={styles.fieldMappingType}>{lp.attributeTypes.join(' / ')}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {jsonFields.length === 0 && (
                            <p className={styles.fieldMappingsEmpty}>
                              ↑ Enter valid JSON above to see field selectors
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
                // Integer / Decimal
                if (p.type === 'integer' || p.type === 'decimal') return (
                  <input type="number" className={styles.propInput} value={mockProps[p.key] ?? p.defaultValue ?? ''} onChange={e => setMockProp(p.key, Number(e.target.value))} />
                );
                // Entity / Form / Image / EntityConstraint — read-only placeholders
                if (p.type === 'entity' || p.type === 'form' || p.type === 'image' || p.type === 'entityConstraint') return (
                  <div className={styles.propReadonly}>
                    <span className={styles.propReadonlyIcon}>
                      {p.type === 'entity' ? '🗂️' : p.type === 'form' ? '📄' : p.type === 'image' ? '🖼️' : '🔍'}
                    </span>
                    <input
                      type="text"
                      className={styles.propInput}
                      placeholder={`Mock ${friendlyTypeName(p.type)} name...`}
                      value={mockProps[p.key] ?? ''}
                      onChange={e => setMockProp(p.key, e.target.value)}
                    />
                  </div>
                );
                // Attribute — link to entity attribute
                if (p.type === 'attribute') return (
                  <div className={styles.propListControl}>
                    <input
                      type="text"
                      className={styles.propInput}
                      placeholder={`Mock ${p.attributeTypes?.join(' / ') || 'attribute'} value...`}
                      value={mockProps[p.key] ?? p.defaultValue ?? ''}
                      onChange={e => setMockProp(p.key, e.target.value)}
                    />
                    {p.attributeTypes && (
                      <div className={styles.propHint}>
                        <span>Allowed types: {p.attributeTypes.join(', ')}</span>
                      </div>
                    )}
                  </div>
                );
                // Multiline string / translatableString
                if (p.multiline || p.type === 'translatableString') return (
                  <textarea
                    className={styles.propTextarea}
                    rows={3}
                    value={mockProps[p.key] ?? p.defaultValue ?? ''}
                    onChange={e => setMockProp(p.key, e.target.value)}
                  />
                );
                // Default: text input (string, translatableString single-line)
                return (
                  <input type="text" className={styles.propInput} value={mockProps[p.key] ?? p.defaultValue ?? ''} onChange={e => setMockProp(p.key, e.target.value)} />
                );
              };

              return Array.from(groups.entries()).map(([groupName, groupProps]) => (
                <div key={groupName || '__default__'} className={styles.propGroupSection}>
                  {groupName && <div className={styles.propGroupHeader}>{groupName}</div>}
                  {groupProps.map(p => (
                    <div key={p.key} className={styles.propGroup}>
                      <div className={styles.propLabel}>
                        <strong>{p.caption}</strong>
                        <span className={styles.propType}>{friendlyTypeName(p.type)}</span>
                      </div>
                      {p.description && <p className={styles.propDescription}>{p.description}</p>}
                      {!p.required && <span className={styles.propOptional}>Optional</span>}
                      {renderInput(p)}
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
        </aside>
      </div>
    </div>
  )
}

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

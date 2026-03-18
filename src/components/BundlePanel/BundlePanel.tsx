import { useState, useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import styles from './BundlePanel.module.css'
import clsx from 'clsx'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { acquireTypes, injectReactTypes } from '@/utils/typeAcquisition'

export function BundlePanel() {
  const widgetName = useStore((s) => s.widgetName)
  const setWidgetMetaData = useStore((s) => s.setWidgetMetaData)
  const description = useStore((s) => s.description)
  const xmlCode = useStore((s) => s.xmlCode)
  const setXmlCode = useStore((s) => s.setXmlCode)
  const jsxCode = useStore((s) => s.jsxCode)
  const setJsxCode = useStore((s) => s.setJsxCode)
  const cssCode = useStore((s) => s.cssCode)
  const setCssCode = useStore((s) => s.setCssCode)
  const depsJson = useStore((s) => s.depsJson)
  const setDepsJson = useStore((s) => s.setDepsJson)

  const [activeTab, setActiveTab] = useState<'xml' | 'jsx' | 'css' | 'json'>('xml')
  
  const [isMetaExpanded, setIsMetaExpanded] = useState(false)
  
  const [isBuilding, setIsBuilding] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const monacoRef = useRef<any>(null)

  useEffect(() => {
    if (!monacoRef.current) return;

    const timer = setTimeout(() => {
      const parsePackages = () => {
        // 1. From Imports
        const importRegex = /import\s+(?:(?:[\w\*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]/g;
        const discoveredPkgs: string[] = [];
        let match;
        while ((match = importRegex.exec(jsxCode)) !== null) {
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
    }, 1000);

    return () => clearTimeout(timer);
  }, [jsxCode, depsJson]);

  const setStep = useStore((s) => s.setStep)
  const addLog = useStore((s) => s.addLog)
  const finishBuild = useStore((s) => s.finishBuild)
  const clearBuild = useStore((s) => s.clearBuild)
  const setBuildStatus = useStore((s) => s.setBuildStatus)
  const setGeneratedFiles = useStore((s) => s.setGeneratedFiles)
  const setGlobalActiveTab = useStore((s) => s.setActiveTab)

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

  const sanitizeCodeForBackend = (xml: string, jsx: string, name: string) => {
    let cleanXml = xml;
    const expectedId = `com.widgetforge.${name.toLowerCase()}.${name}`;
    
    // Fix ID if missing or wrong
    if (!cleanXml.includes(`id="${expectedId}"`)) {
      cleanXml = cleanXml.replace(/id="[^"]+"/, `id="${expectedId}"`);
    }

    // Wrap properties in group if missing
    if (cleanXml.includes('<property') && !cleanXml.includes('<propertyGroup')) {
      cleanXml = cleanXml.replace(
        /(<properties>)([\s\S]*?)(<\/properties>)/i,
        (_, open, props, close) =>
          `${open}\n        <propertyGroup caption="General">${props}</propertyGroup>\n    ${close}`
      );
    }

    // Strip AI hallucinations in XML
    const invalidTags = ['translatable', 'minimumValue', 'maximumValue', 'defaultValue', 'isList', 'required', 'isDefault', 'onChange'];
    invalidTags.forEach(tag => {
      cleanXml = cleanXml.replace(new RegExp(`\\s*<${tag}>[\\s\\S]*?<\\/${tag}>\\s*`, 'gi'), '');
      cleanXml = cleanXml.replace(new RegExp(`\\s*<${tag}\\s*\\/?>\\s*`, 'gi'), '');
    });

    let cleanJsx = jsx;
    // Strip mendix/* imports
    cleanJsx = cleanJsx.replace(/^import\s+.*from\s+['"]((?:@mendix|mendix)[^'"]*)['"];?\s*$/gm, '');
    
    return { cleanXml, cleanJsx };
  }

  const handleBundle = async () => {
    if (!widgetName.trim() || !xmlCode.trim() || !jsxCode.trim()) {
      setErrorMsg('Widget Name, XML, and JSX are required.')
      return
    }

    let parsedDeps = {}
    if (depsJson.trim()) {
      try {
        parsedDeps = JSON.parse(depsJson)
      } catch (e) {
        setErrorMsg('Invalid JSON in Dependencies field.')
        return
      }
    }

    setErrorMsg('')
    setIsBuilding(true)
    clearBuild()
    setGlobalActiveTab('buildlog')

    addLog({ tag: 'INFO', message: `Initializing manual bundle for ${widgetName}...` })
    setBuildStatus('building')
    
    // Phase 1: Scaffold (Immediate)
    setStep('scaffold', 'done', 0)
    addLog({ tag: 'OK', message: 'Environment scaffolded.' })

    // Phase 2: Code Injection
    setStep('code', 'running')
    addLog({ tag: 'INFO', message: 'Sanitizing code for production build...' })
    const { cleanXml, cleanJsx } = sanitizeCodeForBackend(xmlCode, jsxCode, widgetName)
    setStep('code', 'done', 500)

    try {
      setStep('npm', 'running')
      addLog({ tag: 'NPM', message: 'Installing dependencies and building widget...' })

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_URL}/api/bundle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetName,
          description,
          aiXml: cleanXml,
          aiJsx: cleanJsx,
          aiCss: cssCode,
          dependencies: parsedDeps
        })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.details || errData.error || 'Build failed')
      }

      setStep('npm', 'done', 2000)
      setStep('build', 'done', 500)
      setStep('package', 'running')
      addLog({ tag: 'PKG', message: 'Packaging .mpk and preparing download...' })

      const blob = await response.blob()
      
      const fileExt = '.mpk'
      const fileName = `${widgetName}${fileExt}`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      addLog({ tag: 'OK', message: `Successfully downloaded ${fileName}` })
      setStep('package', 'done', 800)
      setStep('download', 'done', 200)
      setBuildStatus('done')
      finishBuild({
        id: `build-${Date.now()}`,
        widgetName,
        version: '1.0.0',
        sizeKb: Math.round(blob.size / 1024),
        durationMs: 5000,
        status: 'success',
        builtAt: new Date()
      })
      
      setGeneratedFiles([
        { name: `${widgetName}.xml`, language: 'xml', content: cleanXml },
        { name: `${widgetName}.tsx`, language: 'tsx', content: cleanJsx },
        { name: `${widgetName}.css`, language: 'css', content: cssCode },
        { name: 'dependencies.json', language: 'json', content: depsJson }
      ])
      
      setGlobalActiveTab('preview')
    } catch (err: any) {
      console.error('Bundle error:', err)
      const fullMsg = err.message || 'Build failed'
      // Show short message in footer to avoid blocking UX
      setErrorMsg('Failed to build widget for more detail check Errors')
      setStep('npm', 'error')
      addLog({ tag: 'ERR', message: fullMsg })
      setBuildStatus('error')
    } finally {
      setIsBuilding(false)
    }
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
                 const prompt = `Generate a Mendix pluggable widget named "${widgetName}".
Description: ${description}
Rules: Functional React, JSON Result (aiXml, aiJsx, aiCss, dependencies), Scope CSS to .widget-${widgetName.toLowerCase()}.`;
                 navigator.clipboard.writeText(prompt);
                 addLog({ tag: 'INFO', message: 'Basic Prompt copied!' });
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
            className={clsx(styles.tabBtn, activeTab === 'jsx' && styles.tabActive)}
            onClick={() => setActiveTab('jsx')}
          >
            <span className={clsx(styles.langBadge, styles.badgeTsx)}>TSX</span> Component TSX
          </button>
          <button 
            className={clsx(styles.tabBtn, activeTab === 'css' && styles.tabActive)}
            onClick={() => setActiveTab('css')}
          >
            <span className={clsx(styles.langBadge, styles.badgeCss)}>CSS</span> Widget CSS
          </button>
          <button 
            className={clsx(styles.tabBtn, activeTab === 'json' && styles.tabActive)}
            onClick={() => setActiveTab('json')}
          >
            <span className={clsx(styles.langBadge, styles.badgeJson)}>JSON</span> Dependencies
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
          {activeTab === 'jsx' && (
            <Editor
              language="typescript"
              theme="vs-dark"
              value={jsxCode}
              path="index.tsx"
              beforeMount={handleBeforeMount}
              onChange={(val) => setJsxCode(val || '')}
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
        </div>
      </div>

      <div className={styles.footer}>
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

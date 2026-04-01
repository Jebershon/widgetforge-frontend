import { create } from 'zustand'
import type { AppState, PipelineStep, AppMode } from '@/types'

const INITIAL_STEPS: PipelineStep[] = [
  { id: 'scaffold', label: 'Scaffold Environment', shortLabel: 'Scaffold', status: 'idle' },
  { id: 'code', label: 'Code Injection', shortLabel: 'Code', status: 'idle' },
  { id: 'npm', label: 'npm install', shortLabel: 'npm', status: 'idle' },
  { id: 'build', label: 'npm run build', shortLabel: 'Build', status: 'idle' },
  { id: 'package', label: 'Package .mpk', shortLabel: 'Package', status: 'idle' },
  { id: 'download', label: 'Download Ready', shortLabel: 'Download', status: 'idle' },
]

let _idCounter = 0
const uid = () => `id_${++_idCounter}_${Date.now()}`

const ts = () => {
  const d = new Date()
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':')
}

export const useStore = create<AppState>((set) => ({
  // ── Chat ───────────────────────────────────
  messages: [
    {
      id: uid(),
      role: 'ai',
      content: 'Welcome to WidgetForge. Describe the Mendix widget you want to build — I\'ll generate the XML config, TypeScript component, editor preview, and package it as a ready-to-import `.mpk` file.',
      timestamp: new Date(),
      tags: [
        { label: 'Data Grid', color: 'blue', prompt: 'Data grid widget with sorting, filtering and server-side pagination' },
        { label: 'Chart Widget', color: 'cyan' as 'blue', prompt: 'Interactive chart widget using Chart.js with switchable bar, line and pie modes' },
        { label: 'File Upload', color: 'green', prompt: 'File upload widget with drag-and-drop zone, progress bar and multi-file support' },
        { label: 'Date Picker', color: 'warn', prompt: 'Custom date-range picker widget with calendar popover and Mendix entity binding' },
      ],
    },
  ],
  isAiTyping: false,
  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, { ...msg, id: uid(), timestamp: new Date() }] })),
  setAiTyping: (v) => set({ isAiTyping: v }),

  // ── Build ──────────────────────────────────
  buildStatus: 'idle',
  logs: [],
  pipelineSteps: INITIAL_STEPS,
  currentBuild: null,
  history: [],

  addLog: (entry) =>
    set((s) => ({
      logs: [...s.logs, { ...entry, id: uid(), timestamp: entry.timestamp ?? ts() }],
    })),

  setStep: (id, status, durationMs) =>
    set((s) => ({
      pipelineSteps: s.pipelineSteps.map((step) =>
        step.id === id ? { ...step, status, durationMs } : step,
      ),
    })),

  setBuildStatus: (buildStatus) => set({ buildStatus }),
  mpkBlobUrl: null as string | null,

  finishBuild: (run) =>
    set((s) => ({
      currentBuild: run,
      history: [run, ...s.history],
      buildStatus: run.status === 'error' ? 'error' : 'done',
    })),

  clearBuild: () =>
    set({
      logs: [],
      pipelineSteps: INITIAL_STEPS.map((s) => ({ ...s, status: 'idle' })),
      buildStatus: 'idle',
      currentBuild: null,
      generatedFiles: [],
      mpkBlobUrl: null,
    }),

  // ── Files / tabs ───────────────────────────
  generatedFiles: [],
  activeTab: 'buildlog',
  setActiveTab: (activeTab) => set({ activeTab }),
  setGeneratedFiles: (generatedFiles) => set({ generatedFiles }),

  // ── App mode ─────────────────────────────────
  appMode: 'bundle' as AppMode,
  setAppMode: (appMode: AppMode) => set({ appMode }),

  // ── AI Configuration ─────────────────────────
  aiProvider: (localStorage.getItem('wf_ai_provider') as 'gemini' | 'openai' | 'anthropic') || 'gemini',
  aiApiKey: localStorage.getItem('wf_ai_key') || 'apikey',
  aiModel: localStorage.getItem('wf_ai_model') || 
           ((localStorage.getItem('wf_ai_provider') || 'gemini') === 'gemini' ? 'gemini-1.5-pro' : 
            (localStorage.getItem('wf_ai_provider') || 'gemini') === 'openai' ? 'gpt-4o' : 
            'claude-3-5-sonnet-20240620'),
  setAiConfig: (aiProvider, aiApiKey, aiModel) => {
    localStorage.setItem('wf_ai_provider', aiProvider)
    localStorage.setItem('wf_ai_key', aiApiKey)
    localStorage.setItem('wf_ai_model', aiModel)
    set({ aiProvider, aiApiKey, aiModel })
  },

  // Widget Edit State
  widgetName: 'MyCustomWidget',
  description: 'A simple description',
  xmlCode: '<widget id="com.mendix.widget.custom.MyCustomWidget" pluginWidget="true" needsEntityContext="true" offlineCapable="true" supportedPlatform="Web" xmlns="http://www.mendix.com/widget/1.0/">\n    <name>MyCustomWidget</name>\n    <description>My widget description</description>\n    <icon/>\n    <properties>\n        <propertyGroup caption="General">\n            <property key="sampleText" type="string" required="true" defaultValue="Hello World">\n                <caption>Sample Text</caption>\n                <description>A simple text property.</description>\n            </property>\n        </propertyGroup>\n    </properties>\n</widget>',
  tsxCode: 'import { ReactElement, createElement } from "react";\nimport "./ui/MyCustomWidget.css";\n\nexport interface MyCustomWidgetProps {\n    sampleText: string;\n}\n\nexport function MyCustomWidget({ sampleText }: MyCustomWidgetProps): ReactElement {\n    return <div className="widget-mycustomwidget">{sampleText}</div>;\n}',

  cssCode: '.widget-mycustomwidget {\n    color: red;\n}',
  depsJson: '{}',
  mockProps: { sampleText: 'Preview Data' },
  setWidgetMetaData: (name, desc) => set((s) => {
    const oldName = s.widgetName;
    const newName = name.trim();
    
    let newXml = s.xmlCode;
    let newTsx = s.tsxCode;

    if (s.description !== desc) {
      // The first <description> in the XML is the main widget description
      newXml = newXml.replace(/<description>[\s\S]*?<\/description>/i, `<description>${desc}</description>`);
    }

    if (oldName !== newName) {
      const xmlNameRegex = new RegExp(`<name>${oldName}</name>`, 'g');
      const xmlIdRegex = new RegExp(`\\.${oldName}"`, 'g');
      
      const tsxFuncRegex = new RegExp(`export function ${oldName}`, 'g');
      const tsxPropsRegex = new RegExp(`${oldName}Props`, 'g');
      const tsxClassRegex = new RegExp(`widget-${oldName.toLowerCase()}`, 'g');
      const tsxCssImportRegex = new RegExp(`${oldName}\\.css`, 'g');

      newXml = newXml.replace(xmlNameRegex, `<name>${newName}</name>`);
      newXml = newXml.replace(xmlIdRegex, `.${newName}"`);

      newTsx = newTsx.replace(tsxFuncRegex, `export function ${newName}`);
      newTsx = newTsx.replace(tsxPropsRegex, `${newName}Props`);
      newTsx = newTsx.replace(tsxClassRegex, `widget-${newName.toLowerCase()}`);
      newTsx = newTsx.replace(tsxCssImportRegex, `${newName}.css`);
    }

    return { 
      widgetName: newName, 
      description: desc,
      xmlCode: newXml,
      tsxCode: newTsx
    };
  }),
  setXmlCode: (xmlCode) => set({ xmlCode }),
  setTsxCode: (tsxCode) => set({ tsxCode }),

  setCssCode: (cssCode) => set({ cssCode }),
  setDepsJson: (depsJson) => set({ depsJson }),
  setMockProp: (key, value) => set((s) => ({ mockProps: { ...s.mockProps, [key]: value } })),
  
  // Platform selection (Phase 2)
  widgetPlatform: 'web' as 'web' | 'native',
  setWidgetPlatform: (newPlatform: 'web' | 'native') => set((s) => {
    if (s.widgetPlatform === newPlatform) return {};

    // Generate dynamic boilerplates based on current widget name
    const NATIVE_BOILERPLATE = `import React from "react";
import { View, Text, StyleSheet } from "react-native";

export interface ${s.widgetName}Props {
    sampleText: string;
}

export function ${s.widgetName}({ sampleText }: ${s.widgetName}Props) {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>{sampleText ? sampleText : "Native Widget"}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
    text: { fontSize: 18, fontWeight: "bold", color: "#333" }
});`;

    const WEB_BOILERPLATE = `import { ReactElement, createElement } from "react";
import "./ui/${s.widgetName}.css";

export interface ${s.widgetName}Props {
    sampleText: string;
}

export function ${s.widgetName}({ sampleText }: ${s.widgetName}Props): ReactElement {
    return <div className="widget-${s.widgetName.toLowerCase()}">{sampleText}</div>;
}`;

    if (s.widgetPlatform === 'web') {
      // Switching WEB -> NATIVE
      // Backup web code, load native backup or boilerplate
      return {
        widgetPlatform: newPlatform,
        webCodeBackup: { tsx: s.tsxCode, css: s.cssCode, deps: s.depsJson },
        tsxCode: s.nativeCodeBackup?.tsx || NATIVE_BOILERPLATE,
        cssCode: s.nativeCodeBackup?.css || '',
        depsJson: s.nativeCodeBackup?.deps || '{}',
      };
    } else {
      // Switching NATIVE -> WEB
      // Backup native code, load web backup or boilerplate
      return {
        widgetPlatform: newPlatform,
        nativeCodeBackup: { tsx: s.tsxCode, css: s.cssCode, deps: s.depsJson },
        tsxCode: s.webCodeBackup?.tsx || WEB_BOILERPLATE,
        cssCode: s.webCodeBackup?.css || s.webCodeBackup?.css === undefined ? `.widget-${s.widgetName.toLowerCase()} {\n    color: red;\n}` : s.webCodeBackup.css,
        depsJson: s.webCodeBackup?.deps || '{}',
      };
    }

  }),

  // Utility files (user-uploaded JS/TS helpers)
  uploadedUtils: [],
  addUploadedUtil: (u) => set((s) => ({
    // Deduplicate by name — replacing existing file if same name is uploaded again
    uploadedUtils: [...s.uploadedUtils.filter(f => f.name !== u.name), u],
  })),
  removeUploadedUtil: (name) => set((s) => ({
    uploadedUtils: s.uploadedUtils.filter(f => f.name !== name),
  })),

  isGenerating: false,
  setIsGenerating: (isGenerating) => set({ isGenerating }),

  bundleWidget: async () => {
    const { widgetName, description, xmlCode, tsxCode, cssCode, depsJson, widgetPlatform, uploadedUtils, setStep, addLog, clearBuild, setBuildStatus, finishBuild, setGeneratedFiles, setActiveTab } = useStore.getState();
    
    clearBuild();
    setActiveTab('buildlog');
    addLog({ tag: 'INFO', message: `Initializing bundle for ${widgetName}...` });

    if (!widgetName.trim() || !xmlCode.trim() || !tsxCode.trim()) {
      addLog({ tag: 'ERR', message: 'Widget Name, XML, and TSX are required for bundling.' });
      setBuildStatus('error');
      setActiveTab('errors');
      throw new Error('Widget Name, XML, and TSX are required for bundling.');
    }

    let parsedDeps = {};
    if (depsJson.trim()) {
      try {
        parsedDeps = JSON.parse(depsJson);
      } catch (e) {
        addLog({ tag: 'ERR', message: 'Invalid JSON in Dependencies field.' });
        setBuildStatus('error');
        setActiveTab('errors');
        throw new Error('Invalid JSON in Dependencies field.');
      }
    }

    setBuildStatus('building');

    // Phase 1: Scaffold (Immediate)
    setStep('scaffold', 'done', 0);
    addLog({ tag: 'OK', message: 'Environment scaffolded.' });

    // Phase 2: Code Injection
    setStep('code', 'running');
    addLog({ tag: 'INFO', message: 'Sanitizing code for production build...' });
    
    // Inline sanitation logic
    let cleanXml = xmlCode;
    const expectedId = `com.widgetforge.${widgetName.toLowerCase()}.${widgetName}`;
    if (!cleanXml.includes(`id="${expectedId}"`)) {
      cleanXml = cleanXml.replace(/id="[^"]+"/, `id="${expectedId}"`);
    }
    if (cleanXml.includes('<property') && !cleanXml.includes('<propertyGroup')) {
      cleanXml = cleanXml.replace(
        /(<properties>)([\s\S]*?)(<\/properties>)/i,
        (_, open, props, close) =>
          `${open}\n        <propertyGroup caption="General">${props}</propertyGroup>\n    ${close}`
      );
    }
    const invalidTags = ['translatable', 'minimumValue', 'maximumValue', 'defaultValue', 'isList', 'required', 'isDefault', 'onChange'];
    invalidTags.forEach(tag => {
      cleanXml = cleanXml.replace(new RegExp(`\\s*<${tag}>[\\s\\S]*?<\\/${tag}>\\s*`, 'gi'), '');
      cleanXml = cleanXml.replace(new RegExp(`\\s*<${tag}\\s*\\/?>\\s*`, 'gi'), '');
    });

    let cleanTsx = tsxCode;
    cleanTsx = cleanTsx.replace(/^import\s+.*from\s+['"](?:@mendix|mendix)[^'"]*['"];?\s*$/gm, '');

    setStep('code', 'done', 500);

    try {
      setStep('npm', 'running');
      addLog({ tag: 'NPM', message: 'Installing dependencies and building widget...' });

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/bundle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetName,
          description,
          aiXml: cleanXml,
          aiTsx: cleanTsx,
          aiCss: cssCode,
          dependencies: parsedDeps,
          platform: widgetPlatform,
          utilFiles: uploadedUtils,
        })
      });

      if (!response.ok) {
        let errorMsg = 'Build failed';
        try {
          const errData = await response.json();
          errorMsg = errData.details || errData.error || errorMsg;
        } catch (_) {
          errorMsg = `Build failed with status ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      setStep('npm', 'done', 2000);
      setStep('build', 'done', 500);
      setStep('package', 'running');
      addLog({ tag: 'PKG', message: 'Packaging .mpk and preparing download...' });

      // Reconstruct the Blob from raw ArrayBuffer to remove any cross-origin taint
      // Chrome ignores the 'download' attribute on Blob URLs originating directly from a cross-origin fetch
      const arrayBuffer = await response.arrayBuffer();
      const cleanBlob = new Blob([arrayBuffer], { type: 'application/zip' });
      
      const fileName = `${widgetName}.mpk`;
      const url = window.URL.createObjectURL(cleanBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.setAttribute('download', fileName);
      document.body.appendChild(a);
      
      // Small delay to ensure DOM is updated before clicking
      setTimeout(() => {
        a.click();
        
        // Delay cleanup significantly so the browser has time to initiate the download, especially for larger files or slow networks
        setTimeout(() => {
          try {
            document.body.removeChild(a);
            // DO NOT revoke URL here, because we want to save it to state for ArtifactPanel re-downloads
          } catch (e) {
            console.warn('Cleanup error', e);
          }
        }, 5000);
      }, 50);

      addLog({ tag: 'OK', message: `Successfully downloaded ${fileName}` });
      setStep('package', 'done', 800);
      setStep('download', 'done', 200);
      setBuildStatus('done');
      
      // Update store with blob URL so we can re-download it from the UI!
      useStore.setState({ mpkBlobUrl: url });

      finishBuild({
        id: `build-${Date.now()}`,
        widgetName,
        version: '1.0.0',
        sizeKb: Math.round(cleanBlob.size / 1024),
        durationMs: 5000,
        status: 'success',
        builtAt: new Date()
      });

      setGeneratedFiles([
        { name: `${widgetName}.xml`, language: 'xml', content: cleanXml },
        { name: `${widgetName}.tsx`, language: 'tsx', content: cleanTsx },
        { name: `${widgetName}.css`, language: 'css', content: cssCode },
        { name: 'dependencies.json', language: 'json', content: depsJson }
      ]);

      setActiveTab('preview');
    } catch (err: any) {
      console.error('Bundle error:', err);
      addLog({ tag: 'ERR', message: err.message || 'Build failed' });
      setStep('npm', 'error');
      setBuildStatus('error');
      setActiveTab('errors');
      // Re-throw so the caller (ChatPanel) knows bundling failed
      throw err;
    }
  },
}))


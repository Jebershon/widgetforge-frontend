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
    }),

  // ── Files / tabs ───────────────────────────
  generatedFiles: [],
  activeTab: 'buildlog',
  setActiveTab: (activeTab) => set({ activeTab }),
  setGeneratedFiles: (generatedFiles) => set({ generatedFiles }),

  // ── App mode ─────────────────────────────────
  appMode: 'generate' as AppMode,
  setAppMode: (appMode: AppMode) => set({ appMode }),

  // Widget Edit State
  widgetName: 'MyCustomWidget',
  description: 'A simple description',
  xmlCode: '<widget id="com.mendix.widget.custom.MyCustomWidget" pluginWidget="true" needsEntityContext="true" offlineCapable="true" supportedPlatform="Web" xmlns="http://www.mendix.com/widget/1.0/">\n    <name>MyCustomWidget</name>\n    <description>My widget description</description>\n    <icon/>\n    <properties>\n        <propertyGroup caption="General">\n            <property key="sampleText" type="string" required="true" defaultValue="Hello World">\n                <caption>Sample Text</caption>\n                <description>A simple text property.</description>\n            </property>\n        </propertyGroup>\n    </properties>\n</widget>',
  jsxCode: 'import { ReactElement, createElement } from "react";\nimport "./ui/MyCustomWidget.css";\n\nexport interface MyCustomWidgetProps {\n    sampleText: string;\n}\n\nexport function MyCustomWidget({ sampleText }: MyCustomWidgetProps): ReactElement {\n    return <div className="widget-mycustomwidget">{sampleText}</div>;\n}',
  cssCode: '.widget-mycustomwidget {\n    color: red;\n}',
  depsJson: '{}',
  mockProps: { sampleText: 'Preview Data' },
  setWidgetMetaData: (name, desc) => set((s) => {
    const oldName = s.widgetName;
    const newName = name.trim();
    if (!newName || oldName === newName) return { description: desc };

    // Regex to find and replace the widget name in various contexts
    // 1. XML: <name>OldName</name> and id="...OldName"
    const xmlNameRegex = new RegExp(`<name>${oldName}</name>`, 'g');
    const xmlIdRegex = new RegExp(`\\.${oldName}"`, 'g');
    
    // 2. TSX: export function OldName, MyCustomWidgetProps, class="widget-oldname"
    const jsxFuncRegex = new RegExp(`export function ${oldName}`, 'g');
    const jsxPropsRegex = new RegExp(`${oldName}Props`, 'g');
    const jsxClassRegex = new RegExp(`widget-${oldName.toLowerCase()}`, 'g');
    const jsxCssImportRegex = new RegExp(`${oldName}.css`, 'g');

    let newXml = s.xmlCode.replace(xmlNameRegex, `<name>${newName}</name>`);
    newXml = newXml.replace(xmlIdRegex, `.${newName}"`);

    let newJsx = s.jsxCode.replace(jsxFuncRegex, `export function ${newName}`);
    newJsx = newJsx.replace(jsxPropsRegex, `${newName}Props`);
    newJsx = newJsx.replace(jsxClassRegex, `widget-${newName.toLowerCase()}`);
    newJsx = newJsx.replace(jsxCssImportRegex, `${newName}.css`);

    return { 
      widgetName: newName, 
      description: desc,
      xmlCode: newXml,
      jsxCode: newJsx
    };
  }),
  setXmlCode: (xmlCode) => set({ xmlCode }),
  setJsxCode: (jsxCode) => set({ jsxCode }),
  setCssCode: (cssCode) => set({ cssCode }),
  setDepsJson: (depsJson) => set({ depsJson }),
  setMockProp: (key, value) => set((s) => ({ mockProps: { ...s.mockProps, [key]: value } })),
}))

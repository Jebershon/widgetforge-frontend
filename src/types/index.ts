// ── Message types ──────────────────────────────────────────
export type MessageRole = 'user' | 'ai' | 'system'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  tags?: QuickTag[]
}

export interface QuickTag {
  label: string
  color: 'blue' | 'green' | 'warn' | 'purple'
  prompt: string
}

// ── Build pipeline ──────────────────────────────────────────
export type StepStatus = 'idle' | 'running' | 'done' | 'error'

export interface PipelineStep {
  id: string
  label: string
  shortLabel: string
  status: StepStatus
  durationMs?: number
}

export interface LogEntry {
  id: string
  timestamp: string
  tag: 'INFO' | 'AI' | 'NPM' | 'PKG' | 'OK' | 'WARN' | 'ERR' | 'XSD' | 'TS'
  message: string
  highlight?: string
}

// ── Build state ─────────────────────────────────────────────
export type BuildStatus = 'idle' | 'generating' | 'building' | 'packaging' | 'done' | 'error'

export interface BuildRun {
  id: string
  widgetName: string
  version: string
  sizeKb: number
  durationMs: number
  status: 'success' | 'warn' | 'error'
  builtAt: Date
  mpkUrl?: string
}

// ── Widget preview ──────────────────────────────────────────
export type PreviewTab = 'buildlog' | 'code' | 'preview' | 'errors'

// ── App mode ───────────────────────────────────────────────
export type AppMode = 'generate' | 'bundle'

export interface GeneratedFile {
  name: string
  language: 'xml' | 'tsx' | 'ts' | 'css' | 'json'
  content: string
}

// ── App state (Zustand) ────────────────────────────────────
export interface AppState {
  // Chat
  messages: ChatMessage[]
  isAiTyping: boolean
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setAiTyping: (v: boolean) => void

  // Build
  buildStatus: BuildStatus
  logs: LogEntry[]
  pipelineSteps: PipelineStep[]
  currentBuild: BuildRun | null
  history: BuildRun[]
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'> & { timestamp?: string }) => void
  setStep: (id: string, status: StepStatus, durationMs?: number) => void
  setBuildStatus: (s: BuildStatus) => void
  finishBuild: (run: BuildRun) => void
  clearBuild: () => void

  // Generated files
  generatedFiles: GeneratedFile[]
  activeTab: PreviewTab
  setActiveTab: (t: PreviewTab) => void
  setGeneratedFiles: (files: GeneratedFile[]) => void

  // App mode
  appMode: AppMode
  setAppMode: (m: AppMode) => void

  // Widget Edit State
  widgetName: string
  description: string
  xmlCode: string
  jsxCode: string
  cssCode: string
  depsJson: string
  mockProps: Record<string, any>
  setWidgetMetaData: (name: string, desc: string) => void
  setXmlCode: (code: string) => void
  setJsxCode: (code: string) => void
  setCssCode: (code: string) => void
  setDepsJson: (json: string) => void
  setMockProp: (key: string, value: any) => void
}

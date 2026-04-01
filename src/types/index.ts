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

// ── Utility files ──────────────────────────────────────────
export interface UploadedUtil {
  name: string      // filename e.g. "mathUtils.js"
  content: string   // raw text content
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
  mpkBlobUrl: string | null
  finishBuild: (run: BuildRun) => void
  clearBuild: () => void
  bundleWidget: () => Promise<void>
  isGenerating: boolean
  setIsGenerating: (v: boolean) => void


  // Generated files
  generatedFiles: GeneratedFile[]
  activeTab: PreviewTab
  setActiveTab: (t: PreviewTab) => void
  setGeneratedFiles: (files: GeneratedFile[]) => void

  // App mode
  appMode: AppMode
  setAppMode: (m: AppMode) => void

  // AI Configuration
  aiProvider: 'gemini' | 'openai' | 'anthropic'
  aiApiKey: string
  aiModel: string
  setAiConfig: (provider: 'gemini' | 'openai' | 'anthropic', apiKey: string, model: string) => void

  // Widget Edit State
  widgetName: string
  description: string
  xmlCode: string
  tsxCode: string
  cssCode: string
  depsJson: string
  mockProps: Record<string, any>
  setWidgetMetaData: (name: string, desc: string) => void
  setXmlCode: (code: string) => void
  setTsxCode: (code: string) => void
  setCssCode: (code: string) => void
  setDepsJson: (json: string) => void
  setMockProp: (key: string, value: any) => void
  
  // Platform selection (Phase 2)
  widgetPlatform: 'web' | 'native'
  setWidgetPlatform: (p: 'web' | 'native') => void
  
  // Platform Data Separation
  webCodeBackup?: { tsx: string, css: string, deps: string }
  nativeCodeBackup?: { tsx: string, css: string, deps: string }


  // Utility files (user-uploaded JS/TS helpers)
  uploadedUtils: UploadedUtil[]
  addUploadedUtil: (u: UploadedUtil) => void
  removeUploadedUtil: (name: string) => void
}

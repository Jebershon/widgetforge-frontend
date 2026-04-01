import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '@/store/useStore'
import styles from './SettingsModal.module.css'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const DEFAULT_MODELS = {
  gemini: 'gemini-1.5-pro',
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20240620'
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const globalProvider = useStore(s => s.aiProvider)
  const globalKey = useStore(s => s.aiApiKey)
  const globalModel = useStore(s => s.aiModel)
  const setAiConfig = useStore(s => s.setAiConfig)

  const [provider, setProvider] = useState(globalProvider)
  const [key, setKey] = useState(globalKey)
  const [model, setModel] = useState(globalModel || DEFAULT_MODELS[globalProvider])
  const [showSaved, setShowSaved] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isFetchingModels, setIsFetchingModels] = useState(false)

  // Sync state if opened
  useEffect(() => {
    if (isOpen) {
      setProvider(globalProvider)
      setKey(globalKey)
      setModel(globalModel || DEFAULT_MODELS[globalProvider])
      setTestStatus('idle')
      setTestMessage('')
      setAvailableModels([])
    }
  }, [isOpen, globalProvider, globalKey, globalModel])

  // Clear available models when provider changes
  useEffect(() => {
    setAvailableModels([])
  }, [provider])

  const fetchModels = async () => {
    if (!key) return
    setIsFetchingModels(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_URL}/api/ai/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiProvider: provider, apiKey: key })
      })
      const data = await response.json()
      if (data.success && data.models) {
        setAvailableModels(data.models)
        if (!data.models.includes(model)) {
          // just a small help
          setTestStatus('idle')
          setTestMessage('')
        }
      } else {
        setAvailableModels([])
        setTestStatus('error')
        setTestMessage(data.error || 'Failed to fetch models from API.')
      }
    } catch (e: any) {
      setAvailableModels([])
      setTestStatus('error')
      setTestMessage(e.message || 'Network error fetching models.')
    } finally {
      setIsFetchingModels(false)
    }
  }

  if (!isOpen) return null

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as 'gemini' | 'openai' | 'anthropic'
    setProvider(newProvider)
    if (!globalModel || globalProvider !== newProvider) {
      setModel(DEFAULT_MODELS[newProvider])
    }
    setTestStatus('idle')
    setTestMessage('')
  }

  const handleTest = async () => {
    if (!key) {
      setTestStatus('error')
      setTestMessage('API Key is required to test.')
      return
    }
    
    setTestStatus('testing')
    setTestMessage('Testing connection...')
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_URL}/api/ai/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiProvider: provider, apiKey: key, aiModel: model })
      })
      
      const data = await response.json()
      if (response.ok && data.success) {
        setTestStatus('success')
        setTestMessage(`Success! Model is responding.`)
      } else {
        setTestStatus('error')
        setTestMessage(data.error || 'Connection failed.')
      }
    } catch (err: any) {
      setTestStatus('error')
      setTestMessage(err.message || 'Network error.')
    }
  }

  const handleSave = () => {
    setAiConfig(provider, key, model)
    setShowSaved(true)
    setTimeout(() => {
      setShowSaved(false)
      onClose()
    }, 700)
  }

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
        
        <div className={styles.header}>
          <div className={styles.glowIcon}>⚙️</div>
          <h2 className={styles.title}>AI Configuration</h2>
          <p className={styles.subtitle}>Setup Provider & Model</p>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>AI Provider</label>
          <select className={styles.select} value={provider} onChange={handleProviderChange}>
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic (Claude)</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>API Key</label>
          <input 
            type="password" 
            className={styles.input} 
            placeholder={`Enter your ${provider === 'gemini' ? 'Gemini' : provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key`}
            value={key}
            onChange={e => { setKey(e.target.value); setTestStatus('idle'); setTestMessage(''); }}
          />
          <p className={styles.hint}>Keys are stored locally in your browser and sent securely only during generation.</p>
        </div>

        <div className={styles.formGroup}>
          <div className={styles.labelRow}>
            <label className={styles.label}>Model</label>
            {key && (
              <button 
                type="button" 
                onClick={fetchModels} 
                disabled={isFetchingModels}
                className={styles.fetchBtn}
                title="Fetch models from API"
              >
                {isFetchingModels ? '🔄 Loading...' : '🔄 Load from API'}
              </button>
            )}
          </div>
          {availableModels.length > 0 ? (
            <select 
              className={styles.input} 
              value={model}
              onChange={e => { setModel(e.target.value); setTestStatus('idle'); setTestMessage(''); }}
            >
              {!availableModels.includes(model) && <option value={model}>{model} (Current)</option>}
              {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <input 
              type="text" 
              className={styles.input} 
              placeholder="e.g. gpt-4o, gemini-1.5-pro"
              value={model}
              onChange={e => { setModel(e.target.value); setTestStatus('idle'); setTestMessage(''); }}
            />
          )}
        </div>

        <div className={styles.actions}>
          <div className={styles.testSection}>
            <button 
              className={styles.testBtn} 
              onClick={handleTest}
              disabled={testStatus === 'testing'}
            >
              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
            {testMessage && (
              <span className={`${styles.testMessage} ${styles[testStatus]}`}>
                {testMessage}
              </span>
            )}
          </div>

          <button className={styles.saveBtn} onClick={handleSave}>
            {showSaved ? '✓ Saved!' : 'Save & Close'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

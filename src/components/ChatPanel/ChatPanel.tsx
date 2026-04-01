import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { SettingsModal } from './SettingsModal'
import styles from './ChatPanel.module.css'

const generateWidgetName = (prompt: string) => {
  const words = prompt.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean);
  let name = words.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  if (!name || name.length < 3) return 'AiWidget' + Math.floor(Math.random() * 1000);
  return name + 'Widget';
};

export function ChatPanel() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isMetaExpanded, setIsMetaExpanded] = useState(false)
  const messages = useStore(s => s.messages)
  const addMessage = useStore(s => s.addMessage)
  const isAiTyping = useStore(s => s.isAiTyping)
  const setAiTyping = useStore(s => s.setAiTyping)
  
  // States to pass to backend
  const globalProvider = useStore(s => s.aiProvider)
  const globalKey = useStore(s => s.aiApiKey)
  const globalModel = useStore(s => s.aiModel)
  const widgetName = useStore(s => s.widgetName)
  const description = useStore(s => s.description)
  const setWidgetMetaData = useStore(s => s.setWidgetMetaData)
  const setXmlCode = useStore(s => s.setXmlCode)
  const setTsxCode = useStore(s => s.setTsxCode)
  const setCssCode = useStore(s => s.setCssCode)
  const setDepsJson = useStore(s => s.setDepsJson)

  const bundleWidget = useStore(s => s.bundleWidget)
  
  const widgetPlatform = useStore(s => s.widgetPlatform)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAiTyping])

  const handleSend = async (text: string) => {
    if (!text.trim() || isAiTyping) return
    
    // Add user message
    addMessage({
      role: 'user',
      content: text,
      tags: undefined
    })
    
    setInputValue('')
    setAiTyping(true)
    
    // Switch to generate mode and show build log immediately
    useStore.getState().setAppMode('generate');
    useStore.getState().setActiveTab('buildlog');
    useStore.getState().clearBuild();
    useStore.getState().addLog({ tag: 'INFO', message: 'Starting AI generation phase...' });

    try {
      // Use existing widgetName or derive if it's default
      const effectiveWidgetName = widgetName === 'MyCustomWidget' ? generateWidgetName(text) : widgetName;
      if (widgetName === 'MyCustomWidget') {
        setWidgetMetaData(effectiveWidgetName, text);
      }
      // Get all previous user messages to build a continuous context constraint constraints
      const prevMesages = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' ');
      const combinedPrompt = prevMesages ? `${prevMesages} AND IMPORTANT: ${text}` : text;

      const payload = {
        widgetName: effectiveWidgetName,
        description: combinedPrompt,
        platform: widgetPlatform,
        aiProvider: globalProvider,
        apiKey: globalKey,
        aiModel: globalModel
      };

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || errorData?.details || `Server responded with ${res.status}`);
      }

      const aiResponse = await res.json();
      
      // Update store editors
      setXmlCode(aiResponse.aiXml || '');
      setTsxCode(aiResponse.aiTsx || '');
      setCssCode(aiResponse.aiCss || '');
      setDepsJson(JSON.stringify(aiResponse.dependencies || {}, null, 2));

      addMessage({
        role: 'ai',
        content: `✅ Code generated for **${effectiveWidgetName}**. Starting build and bundle process...`
      });

      // Trigger bundling — bundleWidget re-throws on failure
      try {
        await bundleWidget();
        addMessage({
          role: 'ai',
          content: `🎉 **${effectiveWidgetName}** built and downloaded successfully!`
        });
      } catch (bundleErr: any) {
        addMessage({
          role: 'ai',
          content: `❌ Build failed: ${bundleErr.message}\n\nThe AI-generated code is loaded in the Bundle tab editors. You can fix the code there and re-bundle manually.`
        });
      }

    } catch (err: any) {
      console.error('Generation Error:', err);
      useStore.getState().addLog({ tag: 'ERR', message: `Generation failed: ${err.message}` });
      useStore.getState().setActiveTab('errors');
      
      addMessage({
        role: 'ai',
        content: `❌ Generation failed: ${err.message}\n\nPlease check the "Errors" tab for details.`
      });

    } finally {
      setAiTyping(false);
    }
  }


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(inputValue)
    }
  }

  return (
    <aside className={styles.panel}>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>⚡</span>
          <h2 className={styles.headerTitle}>AI Widget Builder</h2>
        </div>
        <button className={styles.settingsBtn} onClick={() => setIsSettingsOpen(true)} title="AI Configuration">
          ⚙️
        </button>
      </div>

      <div className={styles.metaToggle} onClick={() => setIsMetaExpanded(!isMetaExpanded)}>
        <span className={styles.metaToggleLabel}>Widget Metadata (Optional)</span>
        <span className={`${styles.metaChevron} ${isMetaExpanded ? styles.metaChevronDown : ''}`}>
          ▼
        </span>
      </div>

      <div className={`${styles.metaTransitionContainer} ${isMetaExpanded ? styles.metaExpanded : ''}`}>
        <div className={styles.metaBoxInner}>
          <div className={styles.metaBox}>
            <div className={styles.metaRow}>
              <label>Widget Name</label>
              <input 
                type="text" 
                value={widgetName} 
                onChange={e => setWidgetMetaData(e.target.value, description)} 
                placeholder="e.g. MyWidget"
              />
            </div>
            <div className={styles.metaRow}>
              <label>Description</label>
              <input 
                type="text" 
                value={description} 
                onChange={e => setWidgetMetaData(widgetName, e.target.value)} 
                placeholder="What should it do?"
              />
            </div>
          </div>
        </div>
      </div>


      <div className={styles.chatArea}>

        {messages.map((msg, idx) => (
           <div key={msg.id || idx} className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.messageUser : styles.messageAi}`}>
             <div className={styles.messageAvatar}>
               {msg.role === 'user' ? 'U' : '🤖'}
             </div>
             <div className={styles.messageContentBlock}>
               <div className={styles.messageContent}>{msg.content}</div>
               {msg.tags && msg.tags.length > 0 && (
                 <div className={styles.tagsContainer}>
                   {msg.tags.map((tag, tidx) => (
                     <button 
                       key={tidx} 
                       className={`${styles.tagBtn} ${styles['tagColor_' + tag.color]}`}
                       onClick={() => handleSend(tag.prompt)}
                     >
                       {tag.label}
                     </button>
                   ))}
                 </div>
               )}
             </div>
           </div>
        ))}
        
        {isAiTyping && (
          <div className={`${styles.messageWrapper} ${styles.messageAi}`}>
             <div className={styles.messageAvatar}>🤖</div>
             <div className={styles.messageContentBlock}>
               <div className={styles.typingIndicator}>
                 <span>.</span><span>.</span><span>.</span>
               </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          <textarea
            className={styles.textarea}
            placeholder="Describe your widget (e.g. 'A beautiful data grid...')"
            rows={2}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            className={styles.sendBtn} 
            disabled={!inputValue.trim() || isAiTyping}
            onClick={() => handleSend(inputValue)}
          >
            {isAiTyping ? '...' : '➤'}
          </button>
        </div>
      </div>
    </aside>
  )
}

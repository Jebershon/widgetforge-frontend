import { useState, useEffect, MouseEvent } from 'react'
import styles from './App.module.css'
import { AppHeader } from './components/AppHeader'
import { Sidebar } from './components/Sidebar'
import { MainPanel } from './components/MainPanel'
import { ArtifactsPanel } from './components/ArtifactsPanel'
import { DocsView } from './components/DocsView'
import { useStore } from './store/useStore'

export default function App() {
  const [sidebarWidth, setSidebarWidth] = useState(480)
  const [isResizing, setIsResizing] = useState(false)
  const [isDocsOpen, setIsDocsOpen] = useState(false)

  const widgetPlatform = useStore(s => s.widgetPlatform)

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const handleDoubleClick = () => {
    setSidebarWidth(480)
  }

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!isResizing) return
      let newWidth = e.clientX
      // Set bounds: min 300px, max 65vw
      const maxW = window.innerWidth * 0.65
      if (newWidth < 300) newWidth = 300
      if (newWidth > maxW) newWidth = maxW
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  return (
    <div className={styles.app} style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}>
      <AppHeader onToggleDocs={() => setIsDocsOpen(true)} />
      {widgetPlatform === 'native' ? (
        <div className={styles.nativeSplash}>
          <div className={styles.nativeSplashContent}>
            <div className={styles.nativeSplashIcon}>📱</div>
            <h2 className={styles.nativeSplashTitle}>Native Mobile Support</h2>
            <p className={styles.nativeSplashText}>
              Native widget generation is currently in development (Phase 2).
              <br />
              It will bring Mendix pluggable widgets to iOS and Android utilizing React Native.
            </p>
            <div className={styles.nativeSplashFeatures}>
              <span>✓ React Native Scaffolding</span>
              <span>✓ Platform-specific JSX</span>
              <span>✓ StyleSheet Engine</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.workspace}>
          <Sidebar />
          <div 
            className={`${styles.resizer} ${isResizing ? styles.resizerActive : ''}`} 
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            title="Drag to resize, double-click to reset"
          />
          <MainPanel />
          <ArtifactsPanel />
        </div>
      )}
      {isDocsOpen && <DocsView onClose={() => setIsDocsOpen(false)} />}
    </div>
  )
}

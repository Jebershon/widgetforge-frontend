import { useStore } from '@/store/useStore'
import styles from './Sidebar.module.css'
import clsx from 'clsx'
import { ChatPanel } from '../ChatPanel'
import { BundlePanel } from '../BundlePanel'

export function Sidebar() {
  const appMode = useStore((s) => s.appMode)
  const setAppMode = useStore((s) => s.setAppMode)

  return (
    <aside className={styles.sidebar}>
      {/* Persistent Mode Switcher Bar */}
      <div className={styles.modeBar}>
        <div className={styles.modeSwitcher}>
          <button
            className={clsx(styles.modeBtn, appMode === 'bundle' && styles.modeBtnActive)}
            onClick={() => setAppMode('bundle')}
          >
            <span>📦</span> Manual Bundle
          </button>
          <button
            className={clsx(styles.modeBtn, appMode === 'generate' && styles.modeBtnActive)}
            onClick={() => setAppMode('generate')}
          >
            <span>⚡</span> AI Generate
          </button>
        </div>
      </div>

      {/* Dynamic Content */}
      <div className={styles.content}>
        {appMode === 'generate' ? <ChatPanel /> : <BundlePanel />}
      </div>
    </aside>
  )
}

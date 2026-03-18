import { useStore } from '@/store/useStore'
import styles from './AppHeader.module.css'
import clsx from 'clsx'

interface AppHeaderProps {
  onToggleDocs: () => void
}

export function AppHeader({ onToggleDocs }: AppHeaderProps) {
  const buildStatus = useStore((s) => s.buildStatus)

  const engineLabel =
    buildStatus === 'idle'        ? 'Engine Ready' :
    buildStatus === 'generating'  ? 'Generating…'  :
    buildStatus === 'building'    ? 'Building…'    :
    buildStatus === 'packaging'   ? 'Packaging…'   :
    buildStatus === 'done'        ? 'Build Done'   :
    'Error'

  const dotClass = clsx(styles.dot, {
    [styles.dotGreen]:  buildStatus === 'idle' || buildStatus === 'done',
    [styles.dotBlue]:   buildStatus === 'generating' || buildStatus === 'building',
    [styles.dotWarn]:   buildStatus === 'packaging',
    [styles.dotDanger]: buildStatus === 'error',
  })

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" fill="url(#lg)" />
            <path d="M8 5L11 6.75V10.25L8 12L5 10.25V6.75L8 5Z" fill="rgba(255,255,255,0.3)" />
            <defs>
              <linearGradient id="lg" x1="2" y1="1" x2="14" y2="15" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2563eb" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className={styles.logoText}>Widget<em>Forge</em></span>
      </div>

      <div className={styles.divider} />
      <span className={styles.tagline}>AI Mendix Widget Generator</span>

      <div className={styles.spacer} />

      {/* Removed mode switcher */}

      <div className={styles.enginePill}>
        <span className={dotClass} />
        {engineLabel}
      </div>

      <button className={styles.headerBtn} onClick={onToggleDocs}>Docs</button>
    </header>
  )
}

import { useState } from 'react'
import { useStore } from '@/store/useStore'
import styles from './ArtifactsPanel.module.css'
import clsx from 'clsx'
import type { BuildRun } from '@/types'

export function ArtifactsPanel() {
  const currentBuild = useStore((s) => s.currentBuild)
  const history = useStore((s) => s.history)

  return (
    <aside className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.headerDot} />
        Artifacts
      </div>

      {currentBuild && <ArtifactCard build={currentBuild} isNew />}

      <div className={styles.sectionHeader}>
        <span className={styles.headerDot} style={{ background: 'var(--text-muted)' }} />
        History
        <span className={styles.histCount}>{history.length}</span>
      </div>

      <div className={styles.historyList}>
        {history.length === 0 ? (
          <div className={styles.emptyHistory}>
            <div className={styles.emptyHistIcon}>📜</div>
            <p>Your build history will appear here</p>
          </div>
        ) : (
          history.map((run) => (
            <HistoryItem key={run.id} run={run} />
          ))
        )}
      </div>
    </aside>
  )
}

function ArtifactCard({ build, isNew }: { build: BuildRun; isNew?: boolean }) {
  const [downloaded, setDownloaded] = useState(false)
  const mpkBlobUrl = useStore(s => s.mpkBlobUrl)

  const handleDownload = () => {
    if (mpkBlobUrl && isNew) {
      const a = document.createElement('a')
      a.href = mpkBlobUrl
      a.setAttribute('download', `${build.widgetName}.mpk`)
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => document.body.removeChild(a), 100)
    }
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 3000)
  }

  const timeAgo = formatTimeAgo(build.builtAt)

  return (
    <div className={clsx(styles.artifactCard, isNew && styles.artifactCardNew)}>
      <div className={styles.artifactIconRow}>
        <div className={styles.mpkIcon}>MPK</div>
        <div>
          <div className={styles.artifactName}>{build.widgetName}</div>
          <div className={styles.artifactVersion}>v{build.version}</div>
        </div>
        <span className={clsx(styles.statusBadge, styles[`status_${build.status}`])}>
          {build.status === 'success' ? '✓' : build.status === 'warn' ? '⚠' : '✗'}
        </span>
      </div>

      <div className={styles.artifactMeta}>
        <MetaRow label="Size" value={`${build.sizeKb} kB`} />
        <MetaRow label="Duration" value={`${(build.durationMs / 1000).toFixed(1)}s`} />
        <MetaRow label="Mendix" value="9.x / 10.x" />
        <MetaRow label="Built" value={timeAgo} />
      </div>

      <div className={styles.artifactActions}>
        <button
          className={clsx(styles.downloadBtn, downloaded && styles.downloadedBtn)}
          onClick={handleDownload}
        >
          {downloaded ? '✓ Downloaded' : '↓ Download .mpk'}
        </button>
        <button className={styles.moreBtn} title="More options">
          <DotsIcon />
        </button>
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metaRow}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  )
}

function HistoryItem({ run }: { run: BuildRun }) {
  const timeAgo = formatTimeAgo(run.builtAt)
  return (
    <div className={styles.histItem}>
      <div className={styles.histTop}>
        <span className={clsx(styles.histBadge, styles[`status_${run.status}`])}>
          {run.status.toUpperCase()}
        </span>
        <span className={styles.histTime}>{timeAgo}</span>
      </div>
      <div className={styles.histName}>{run.widgetName}</div>
      <div className={styles.histMeta}>
        v{run.version} · {run.sizeKb} kB · {(run.durationMs / 1000).toFixed(0)}s
      </div>
    </div>
  )
}

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
    </svg>
  )
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 10)  return 'just now'
  if (seconds < 60)  return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60)  return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)    return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7)      return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

import styles from './ChatPanel.module.css'

export function ChatPanel() {
  return (
    <aside className={styles.panel}>
      <div className={styles.comingSoon}>
        <div className={styles.glowIcon}>⚡</div>
        <h2 className={styles.title}>AI Generation Flow</h2>
        <p className={styles.subtitle}>Phase 2: Coming Soon!</p>
        <div className={styles.featureList}>
          <div className={styles.featureItem}>
            <span className={styles.dot}></span>
            Natural Language to Mendix Widget
          </div>
          <div className={styles.featureItem}>
            <span className={styles.dot}></span>
            Automated .mpk Scaffolding
          </div>
          <div className={styles.featureItem}>
            <span className={styles.dot}></span>
            AI-Driven Styling & Logic
          </div>
        </div>
        <p className={styles.footerNote}>
          Currently focusing on <strong>Module 1: Real-time Live Preview</strong> and Manual Bundling.
        </p>
      </div>
    </aside>
  )
}

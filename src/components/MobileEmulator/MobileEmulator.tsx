import React from 'react';
import styles from './MobileEmulator.module.css';
import clsx from 'clsx';

interface MobileEmulatorProps {
  children: React.ReactNode;
  platform?: 'android' | 'ios';
}

export function MobileEmulator({ children, platform = 'android' }: MobileEmulatorProps) {
  return (
    <div className={styles.container}>
      {/* Device Frame */}
      <div className={clsx(styles.device, platform === 'android' ? styles.android : styles.ios)}>
        {/* Hardware Elements */}
        <div className={styles.bezel}>
          <div className={styles.screen}>
            {/* Status Bar */}
            <div className={styles.statusBar}>
              <div className={styles.time}>14:42</div>
              <div className={styles.statusIcons}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="16" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/></svg>
              </div>
            </div>

            {/* Content Area */}
            <div className={styles.content}>
              {children}
            </div>

            {/* Navigation Bar / Home Indicator */}
            <div className={styles.navBar}>
              <div className={styles.homeIndicator} />
            </div>
          </div>
        </div>

        {/* Physical Buttons */}
        <div className={styles.volumeUp} />
        <div className={styles.volumeDown} />
        <div className={styles.powerBtn} />
      </div>

      <div className={styles.shadow} />
    </div>
  );
}

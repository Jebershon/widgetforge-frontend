import React from 'react';

/**
 * A basic ANSI escape code to React component parser.
 * Handles common color and style codes for terminal-style error messages.
 */
export function SafeAnsi({ text }: { text: string }) {
  if (!text) return null;

  // Regex for ANSI escape codes: \u001b[ followed by numbers and semi-colons, ending with 'm'
  const ansiRegex = /\u001b\[([0-9;]*)m/g;
  const parts = text.split(ansiRegex);

  const elements: React.ReactNode[] = [];
  let currentStyles: React.CSSProperties = {};
  let key = 0;

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Direct text part
      if (parts[i]) {
        elements.push(
          <span key={key++} style={{ ...currentStyles }}>
            {parts[i]}
          </span>
        );
      }
    } else {
      // ANSI code part (e.g., "31", "1;33", etc.)
      const codes = parts[i].split(';').map(Number);
      
      for (const code of codes) {
        if (code === 0) {
          // Reset
          currentStyles = {};
        } else if (code === 1) {
          // Bold
          currentStyles.fontWeight = '700';
        } else if (code === 2 || code === 22) {
          // Faint / Normal
          currentStyles.fontWeight = '400';
          currentStyles.opacity = code === 2 ? 0.6 : 1;
        } else if (code === 4) {
          // Underline
          currentStyles.textDecoration = 'underline';
        } else if (code === 7) {
            // Inverse (swap bg and fg)
            // Simplified: just use a high-contrast background
            currentStyles.backgroundColor = 'var(--text-primary)';
            currentStyles.color = 'var(--bg-base)';
        } else if (code >= 30 && code <= 37) {
          // Foreground colors
          const map: Record<number, string> = {
            30: '#000000', // Black
            31: '#ef4444', // Red
            32: '#10b981', // Green
            33: '#f59e0b', // Yellow
            34: '#3b82f6', // Blue
            35: '#8b5cf6', // Magenta
            36: '#06b6d4', // Cyan
            37: '#ffffff', // White
          };
          currentStyles.color = map[code];
        } else if (code >= 90 && code <= 97) {
          // Bright foreground colors
          const map: Record<number, string> = {
            90: '#6b7280', // Gray
            91: '#fca5a5', // Bright Red
            92: '#6ee7b7', // Bright Green
            93: '#fcd34d', // Bright Yellow
            94: '#93c5fd', // Bright Blue
            95: '#c4b5fd', // Bright Magenta
            96: '#67e8f9', // Bright Cyan
            97: '#f3f4f6', // Bright White
          };
          currentStyles.color = map[code];
        } else if (code === 39) {
          // Default foreground
          delete currentStyles.color;
        } else if (code === 49) {
          // Default background
          delete currentStyles.backgroundColor;
        }
      }
    }
  }

  return <>{elements}</>;
}

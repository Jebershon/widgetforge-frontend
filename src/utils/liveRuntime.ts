import { transform } from 'sucrase';

export interface RuntimeResult {
  url: string;
  error: string | null;
}

/**
 * Transpiles TSX code and resolves imports to ESM CDNs (esm.sh).
 * Returns a Blob URL that can be imported as a native ES module.
 */
export function prepareLiveModule(jsxCode: string): RuntimeResult {
  try {
    // 1. Transpile TSX to JS
    // We use Sucrase because it is extremely fast and works well in the browser.
    const transpiled = transform(jsxCode, {
      transforms: ['typescript', 'jsx'],
      production: false,
    });

    // 2. Resolve imports to esm.sh
    // Regex matches: import ... from 'package' or import 'package'
    // We ignore relative imports (./ or ../) and already resolved URLs.
    const resolvedCode = transpiled.code.replace(
      /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g,
      (match, imports, path) => {
        if (path.startsWith('.') || path.startsWith('/') || path.startsWith('http')) {
          return match;
        }
        
        // Use esm.sh for npm packages. 
        // We pin React to version 19 to match the widget environment.
        if (path === 'react' || path === 'react-dom') {
          return `import ${imports} from 'https://esm.sh/${path}@19'`;
        }
        
        return `import ${imports} from 'https://esm.sh/${path}'`;
      }
    );

    // 3. Ensure 'React' is defined for the hyperscript transform
    // If the code uses JSX, Sucrase replaces it with React.createElement.
    // We inject a global React import at the top to ensure it's available.
    const reactImport = `import * as React from 'https://esm.sh/react@19';\n`;
    const finalCode = reactImport + resolvedCode.replace(/import\s+['"]\.?\/[^'"]+\.css['"];?/g, '');

    // 4. Create Blob URL
    const blob = new Blob([finalCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);

    return { url, error: null };
  } catch (err: any) {
    console.error('Live Runtime Error:', err);
    return { url: '', error: err.message };
  }
}

/**
 * Injects styles into the document. 
 * If 'win' is provided, injects into that window (for iframes).
 */
export function injectLiveStyles(css: string, win: Window = window) {
  const id = 'wf-live-styles';
  const doc = win.document;
  let styleTag = doc.getElementById(id) as HTMLStyleElement;
  
  if (!styleTag) {
    styleTag = doc.createElement('style');
    styleTag.id = id;
    doc.head.appendChild(styleTag);
  }
  
  styleTag.textContent = css;
}

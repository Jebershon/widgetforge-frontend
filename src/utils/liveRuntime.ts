import { transform } from 'sucrase';

export interface RuntimeResult {
  url: string;
  error: string | null;
}

/**
 * Transpiles purely utility code (e.g. math.ts) stripping TypeScript syntax.
 */
export function transpileUtil(jsCode: string, filename: string = 'util'): string {
  try {
    const transpiled = transform(jsCode, {
      transforms: ['typescript', 'jsx'],
      production: false,
    });
    return transpiled.code;
  } catch (err: any) {
    console.error(`Sucrase Transpilation Error in ${filename}:`, err);
    // Return code that throws the error in the preview console instead of raw TS
    const escapedMsg = (err?.message || 'Unknown transpilation error').replace(/[`\\$]/g, '\\$&');
    return `throw new SyntaxError(\`[WidgetForge] Failed to transpile ${filename}: ${escapedMsg}\`);`;
  }
}

/**
 * Transpiles TSX code and resolves imports to ESM CDNs (esm.sh).
 * Returns a Blob URL that can be imported as a native ES module.
 */
export function prepareLiveModule(tsxCode: string): RuntimeResult {
  try {
    // 1. Transpile TSX to JS
    // We use Sucrase because it is extremely fast and works well in the browser.
    const transpiled = transform(tsxCode, {
      transforms: ['typescript', 'jsx'],
      jsxPragma: '_WidgetForgeReact.createElement',
      jsxFragmentPragma: '_WidgetForgeReact.Fragment',
      production: false,
    });


    // 2. Resolve imports to esm.sh
    // Regex matches: import ... from 'package' or import 'package'
    // We ignore relative imports (./ or ../) and already resolved URLs.
    const resolvedCode = transpiled.code.replace(
      /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g,
      (match, imports, path) => {
        // Phase 3: Route relative utility imports to our virtual importmap domain
        if (path.startsWith('./utils/')) {
          return `import ${imports} from 'https://widgetforge.local/${path.replace('./', '')}'`;
        }

        if (path.startsWith('.') || path.startsWith('/') || path.startsWith('http')) {
          return match;
        }
        
        // We pin React to version 18 because react-native-web relies on unmountComponentAtNode
        if (path === 'react' || path === 'react-dom') {
          return `import ${imports} from 'https://esm.sh/${path}@18'`;
        }
        
        // Phase 2: Map react-native to react-native-web for browser preview
        if (path === 'react-native') {
          return `import ${imports} from 'react-native'`;
        }
        
        return `import ${imports} from 'https://esm.sh/${path}?deps=react@18,react-dom@18&external=react-native'`;
      }
    );

    // 3. Inject our isolated React reference for JSX
    const reactImport = `import * as _WidgetForgeReact from 'https://esm.sh/react@18';\n`;

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

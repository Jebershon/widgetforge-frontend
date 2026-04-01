
/**
 * Utility for Automatic Type Acquisition (ATA) in Monaco Editor.
 * Fetches .d.ts files from CDNs and injects them into Monaco's TypeScript language service.
 */

const typeCache = new Set<string>();

export async function acquireTypes(monaco: any, packages: string[]) {
  const filtered = packages.filter(pkg => !typeCache.has(pkg) && pkg !== 'react' && pkg !== 'react-dom');
  
  if (filtered.length === 0) return;

  await Promise.all(filtered.map(pkg => fetchAndInjectType(monaco, pkg)));
}

async function fetchAndInjectType(monaco: any, pkg: string) {
  try {
    
    // 1. Try to find the d.ts via esm.sh which handles types very well
    const response = await fetch(`https://esm.sh/${pkg}`, { method: 'HEAD' });
    const typesUrl = response.headers.get('X-Typescript-Types');

    if (typesUrl) {
      const dtsRes = await fetch(typesUrl);
      const dtsContent = await dtsRes.text();
      
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        dtsContent,
        `file:///node_modules/@types/${pkg}/index.d.ts`
      );
      
      typeCache.add(pkg);
      return;
    }

    // 2. Fallback: Try @types/pkg from unpkg
    const typesPkg = pkg.startsWith('@') 
      ? pkg.slice(1).replace('/', '__') 
      : pkg;
      
    const fallbackUrl = `https://unpkg.com/@types/${typesPkg}/index.d.ts`;
    const fbRes = await fetch(fallbackUrl);
    
    if (fbRes.ok) {
      const fbContent = await fbRes.text();
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        fbContent,
        `file:///node_modules/@types/${pkg}/index.d.ts`
      );
      typeCache.add(pkg);
    } else {
      // 3. Last attempt: check for index.d.ts in the package itself on unpkg
      const selfDtsUrl = `https://unpkg.com/${pkg}/index.d.ts`;
      const selfRes = await fetch(selfDtsUrl);
      if (selfRes.ok) {
        const selfContent = await selfRes.text();
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
          selfContent,
          `file:///node_modules/@types/${pkg}/index.d.ts`
        );
        typeCache.add(pkg);
      }
    }
  } catch (err) {
    console.error(`[ATA] Failed to acquire types for ${pkg}:`, err);
  }
}

// Pre-load React types (special case as they are standard)
export async function injectReactTypes(monaco: any) {
    const reactTypes = [
        { name: 'react', url: 'https://unpkg.com/@types/react/index.d.ts' },
        { name: 'react-dom', url: 'https://unpkg.com/@types/react-dom/index.d.ts' }
    ];

    for (const type of reactTypes) {
        if (typeCache.has(type.name)) continue;
        try {
            const res = await fetch(type.url);
            if (res.ok) {
                const content = await res.text();
                monaco.languages.typescript.typescriptDefaults.addExtraLib(
                    content,
                    `file:///node_modules/@types/${type.name}/index.d.ts`
                );
                typeCache.add(type.name);
            }
        } catch (e) {
            console.error(`[ATA] Failed to load React types:`, e);
        }
    }
}

// Phase 2: React Native Types
export async function injectReactNativeTypes(monaco: any) {
    if (typeCache.has('react-native')) return;
    
    try {
        // We use esm.sh to get the types for react-native
        const res = await fetch('https://unpkg.com/@types/react-native/index.d.ts');
        if (res.ok) {
            const content = await res.text();
            monaco.languages.typescript.typescriptDefaults.addExtraLib(
                content,
                'file:///node_modules/@types/react-native/index.d.ts'
            );
            typeCache.add('react-native');
        }
    } catch (e) {
        console.error(`[ATA] Failed to load React Native types:`, e);
    }
}

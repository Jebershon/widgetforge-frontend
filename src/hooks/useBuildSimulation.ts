import { useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { MOCK_GENERATED_FILES } from '@/utils/mockData'

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const ts = () => {
  const d = new Date()
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
}

export function useBuildSimulation() {
  const { addLog, setStep, setBuildStatus, finishBuild, addMessage, setAiTyping, setGeneratedFiles } =
    useStore()

  const runBuild = useCallback(async (widgetName: string, prompt: string) => {
    const safeName = widgetName.replace(/\s+/g, '') + 'Widget'
    setBuildStatus('generating')

    // ── STEP 1: AI Prompt / Intent ────────────────────────────
    setStep('prompt', 'running')
    addLog({ timestamp: ts(), tag: 'AI', message: `Classifying intent for: "${prompt.slice(0, 60)}${prompt.length > 60 ? '…' : ''}"` })
    await delay(700)
    addLog({ timestamp: ts(), tag: 'OK', message: `Intent → NEW_WIDGET | Base template: ui-display-base` })
    setStep('prompt', 'done', 700)

    // ── STEP 2: Template ──────────────────────────────────────
    setStep('template', 'running')
    addLog({ timestamp: ts(), tag: 'INFO', message: `Loading template scaffolds…` })
    await delay(500)
    addLog({ timestamp: ts(), tag: 'OK', message: `Template selected: ui-display-base | Mendix 9.x / 10.x compatible` })
    setStep('template', 'done', 500)

    // ── STEP 3: XML Generation ─────────────────────────────────
    setStep('xml', 'running')
    addLog({ timestamp: ts(), tag: 'AI', message: `Generating widget.xml — inferring Mendix property schema…` })
    await delay(900)
    addLog({ timestamp: ts(), tag: 'XSD', message: `Validating against Mendix Widget XSD schema v9.24` })
    await delay(400)
    addLog({ timestamp: ts(), tag: 'OK', message: `widget.xml valid ✓  |  3 properties: value (Integer), color (String), statusText (String)` })
    setStep('xml', 'done', 1300)

    // ── STEP 4: JSX / TSX Generation ──────────────────────────
    setStep('jsx', 'running')
    addLog({ timestamp: ts(), tag: 'AI', message: `Generating ${safeName}.tsx — SVG ring component + hooks…` })
    await delay(1100)
    addLog({ timestamp: ts(), tag: 'TS', message: `TypeScript strict mode — inferring prop types from widget.xml` })
    await delay(600)
    addLog({ timestamp: ts(), tag: 'AI', message: `Generating editorConfig.tsx + editorPreview.tsx…` })
    await delay(700)
    addLog({ timestamp: ts(), tag: 'OK', message: `${safeName}.tsx — 118 lines | editorConfig.tsx | editorPreview.tsx ✓` })
    setStep('jsx', 'done', 2400)
    setGeneratedFiles(MOCK_GENERATED_FILES(safeName))

    // ── STEP 5: npm run build ─────────────────────────────────
    setBuildStatus('building')
    setStep('build', 'running')
    addLog({ timestamp: ts(), tag: 'NPM', message: `npm install — resolving 247 packages…` })
    await delay(1500)
    addLog({ timestamp: ts(), tag: 'OK', message: `Packages installed | 0 vulnerabilities | cache hit 94%` })
    addLog({ timestamp: ts(), tag: 'NPM', message: `npm run build — webpack 5 bundling…` })
    await delay(800)
    addLog({ timestamp: ts(), tag: 'INFO', message: `Compiling ${safeName}.tsx → ESModule target` })
    await delay(600)
    addLog({ timestamp: ts(), tag: 'INFO', message: `Tree-shaking — removed 14.2 kB unused exports` })
    await delay(700)
    addLog({ timestamp: ts(), tag: 'OK', message: `Build succeeded ✓  |  dist/widget.js (32.4 kB gzipped)` })
    setStep('build', 'done', 3600)

    // ── STEP 6: dist/ ─────────────────────────────────────────
    setStep('dist', 'running')
    addLog({ timestamp: ts(), tag: 'INFO', message: `Writing dist/widget.js | dist/widget.js.map | dist/widget.css` })
    await delay(400)
    addLog({ timestamp: ts(), tag: 'OK', message: `dist/ ready — 3 files, 48.7 kB total` })
    setStep('dist', 'done', 400)

    // ── STEP 7: Package MPK ───────────────────────────────────
    setBuildStatus('packaging')
    setStep('package', 'running')
    addLog({ timestamp: ts(), tag: 'PKG', message: `Packaging ${safeName}_1.0.0.mpk…` })
    await delay(800)
    addLog({ timestamp: ts(), tag: 'PKG', message: `Compressing widget bundle + XML manifest…` })
    await delay(500)
    addLog({ timestamp: ts(), tag: 'OK', message: `${safeName}_1.0.0.mpk ready  |  48.7 kB  |  Mendix-compatible ✓` })
    setStep('package', 'done', 1300)

    // ── STEP 8: Download ready ────────────────────────────────
    setStep('download', 'done')
    addLog({ timestamp: ts(), tag: 'OK', message: `▶  Build complete in ~12s — widget ready for import into Mendix Studio Pro` })

    finishBuild({
      id: `build_${Date.now()}`,
      widgetName: safeName,
      version: '1.0.0',
      sizeKb: 48.7,
      durationMs: 12000,
      status: 'success',
      builtAt: new Date(),
      mpkUrl: '#',
    })

    // AI response in chat
    setAiTyping(false)
    addMessage({
      role: 'ai',
      content: `✓ **${safeName} v1.0.0** built successfully!\n\n- widget.xml — 3 Mendix properties\n- ${safeName}.tsx — 118 lines, strict TypeScript\n- editorConfig.tsx + editorPreview.tsx\n- Bundled: 32.4 kB · Packaged: 48.7 kB\n\nReady to import. Switch to the **Code** tab to inspect generated files, or download the .mpk from the Artifacts panel.`,
    })
  }, [addLog, setStep, setBuildStatus, finishBuild, addMessage, setAiTyping, setGeneratedFiles])

  return { runBuild }
}

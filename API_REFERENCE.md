# WidgetForge — API Reference & Project Documentation

## Overview

**WidgetForge** is a full-stack platform that generates and bundles custom Mendix plug-in widgets. It exposes two backend APIs:

- **`/api/generate`** — Fully AI-driven: describe a widget in plain English, the server generates the XML/JSX/CSS and returns a ready-to-import `.mpk`.
- **`/api/bundle`** — Manual: you supply the XML, JSX, and optional CSS yourself, and the server compiles and packages it.

Both APIs return a downloadable `.mpk` file and provide detailed terminal logs with ANSI color support for easier debugging in the frontend.

---

## Project Structure

```
widgetforge/
├── API_REFERENCE.md          ← This file
├── index.html                ← Frontend entry point (Vite)
├── vite.config.ts
├── tsconfig.app.json
├── package.json              ← Root: frontend deps (React, Vite)
│
├── src/                      ← Frontend (React + Vite)
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/           ← UI panels (GeneratePanel, BundlePanel, etc.)
│   ├── hooks/
│   ├── store/                ← Zustand global state
│   ├── styles/
│   ├── types/
│   └── utils/
│
└── server/                   ← Backend (Node.js + Express + TypeScript)
    ├── package.json          ← Server deps (express, adm-zip, openai, etc.)
    ├── tsconfig.json
    ├── .env                  ← AI keys and config (not committed)
    ├── dist/                 ← Compiled JS output (tsc)
    ├── temp/                 ← Ephemeral widget build dirs (auto-cleaned)
    └── src/
        ├── index.ts          ← Main Express server + build orchestration
        └── services/
            ├── aiService.ts       ← Gemini / OpenAI / Anthropic provider
            └── scaffoldWidget.ts  ← Mendix widget project scaffolding
```

---

## Environment Variables (`server/.env`)

| Variable          | Description                                        | Example              |
|-------------------|----------------------------------------------------|----------------------|
| `PORT`            | Server port                                        | `8000`               |
| `AI_PROVIDER`     | Which AI to use: `gemini`, `openai`, `anthropic`   | `gemini`             |
| `GEMINI_API_KEY`  | Google Gemini API key                              | `AIza...`            |
| `OPENAI_API_KEY`  | OpenAI API key                                     | `sk-...`             |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key                         | `sk-ant-...`         |

---

## Running the Server

```powershell
# 1. Build
cd server
.\node_modules\.bin\tsc

# 2. Create dist/package.json (forces CommonJS — run once)
node -e "require('fs').writeFileSync('dist/package.json', JSON.stringify({type:'commonjs'}))"

# 3. Start
node dist/index.js
```

Server starts on `http://localhost:8000`.

---

## API Endpoints

### `GET /api/health`
Returns server status.

```bash
curl http://localhost:8000/api/health
```

---

### `GET /api/ai/status`
Tests connectivity to the configured AI provider.

```bash
curl http://localhost:8000/api/ai/status
```

---

### `POST /api/generate` — AI Generation Mode

**Body:**
| Field         | Type   | Required | Description                             |
|---------------|--------|----------|-----------------------------------------|
| `widgetName`  | string | ✅       | PascalCase widget name                  |
| `description` | string | ✅       | Plain-English widget description for AI |

**Returns:** A `.mpk` file download.

```bash
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "widgetName": "NeonStory",
    "description": "A widget that displays a simple h1 tag containing some small story, styled with a modern dark theme and a neon pink glow."
  }' \
  --output NeonStory.mpk
```

---

### `POST /api/bundle` — Manual Bundle Mode

**Body:**
| Field          | Type   | Required | Description                                          |
|----------------|--------|----------|------------------------------------------------------|
| `widgetName`   | string | ✅       | PascalCase widget name                               |
| `description`  | string | ✅       | Human-readable description                           |
| `aiXml`        | string | ✅       | Full Mendix widget XML definition                    |
| `aiJsx`        | string | ✅       | Full React TSX component (must export named fn)      |
| `aiCss`        | string | ❌       | CSS to bundle and inject into the `.mpk`             |
| `dependencies` | object | ❌       | Extra npm packages `{"pkg": "^version"}`             |

**Returns:** A `.mpk` file download.

> **Widget ID Convention:** Must follow `com.widgetforge.<widgetnamelowercase>.<WidgetName>`  
> The server auto-corrects this if needed.

---

## Example Payloads

All examples below can be run directly as `curl` commands.

---

### 1. NeonCalculator — Dark neon calculator

```bash
curl -X POST http://localhost:8000/api/bundle \
  -H "Content-Type: application/json" \
  -d '{
  "widgetName": "NeonCalculator",
  "description": "A dark, neon-themed beautiful calculator.",
  "aiXml": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<widget id=\"com.widgetforge.neoncalculator.NeonCalculator\" pluginWidget=\"true\" needsEntityContext=\"false\" offlineCapable=\"true\" supportedPlatform=\"Web\" xmlns=\"http://www.mendix.com/widget/1.0/\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.mendix.com/widget/1.0/ ../node_modules/mendix/custom_widget.xsd\">\n    <name>Neon Calculator</name>\n    <description>A dark, neon-themed beautiful calculator.</description>\n    <properties>\n        <propertyGroup caption=\"General\">\n            <property key=\"themeColor\" type=\"string\" required=\"false\" defaultValue=\"#ff00ff\">\n                <caption>Neon Color</caption>\n                <description>Color of the neon glow.</description>\n            </property>\n        </propertyGroup>\n    </properties>\n</widget>",
  "aiCss": ".neon-calc-container { background: #111; padding: 20px; border-radius: 12px; border: 2px solid var(--neon-color, #f0f); box-shadow: 0 0 15px var(--neon-color, #f0f); color: white; max-width: 300px; margin: auto; font-family: 'Inter', sans-serif; }\n.neon-calc-display { padding: 15px; font-size: 2rem; text-align: right; background: #222; border-radius: 8px; margin-bottom: 20px; }\n.neon-calc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }\n.neon-calc-btn { background: #222; border: 1px solid #333; color: white; font-size: 1.2rem; padding: 15px; border-radius: 8px; cursor: pointer; transition: all 0.3s; }\n.neon-calc-btn:hover { background: #333; box-shadow: 0 0 10px var(--neon-color, #f0f); }\n.neon-calc-btn.op { color: var(--neon-color, #f0f); font-weight: bold; }",
  "aiJsx": "import { useState } from 'react';\n\nexport interface Props {\n  themeColor?: string;\n}\n\nexport function NeonCalculator({ themeColor = '#ff00ff' }: Props) {\n  const [display, setDisplay] = useState('0');\n\n  const calculate = (expr: string) => {\n    try {\n      const tokens = expr.match(/(\\d+\\.?\\d*)|[\\+\\-\\*\\/]/g);\n      if (!tokens) return '0';\n      let res = parseFloat(tokens[0]);\n      for (let i = 1; i < tokens.length; i += 2) {\n        const op = tokens[i]; const val = parseFloat(tokens[i+1]);\n        if (op === '+') res += val; else if (op === '-') res -= val;\n        else if (op === '*') res *= val; else if (op === '/') res /= val;\n      }\n      return String(res);\n    } catch { return 'Error'; }\n  };\n\n  const handleBtn = (val: string) => {\n    if (val === 'C') setDisplay('0');\n    else if (val === '=') setDisplay(prev => calculate(prev));\n    else setDisplay(prev => prev === '0' ? val : prev + val);\n  };\n\n  return (\n    <div className=\"neon-calc-container\" style={{ '--neon-color': themeColor } as any}>\n      <div className=\"neon-calc-display\">{display}</div>\n      <div className=\"neon-calc-grid\">\n        {['C', '/', '*', '-'].map(b => <button key={b} className=\"neon-calc-btn op\" onClick={() => handleBtn(b)}>{b}</button>)}\n        {['7','8','9','+'].map(b => <button key={b} className={`neon-calc-btn ${b==='+'?'op':''}`} onClick={() => handleBtn(b)}>{b}</button>)}\n        {['4','5','6'].map(b => <button key={b} className=\"neon-calc-btn\" onClick={() => handleBtn(b)}>{b}</button>)}\n        {['1','2','3','0','.'].map(b => <button key={b} className=\"neon-calc-btn\" onClick={() => handleBtn(b)}>{b}</button>)}\n        <button className=\"neon-calc-btn op\" style={{ gridRow: 'span 3' }} onClick={() => handleBtn('=')}>=</button>\n      </div>\n    </div>\n  );\n}"
}' \
  --output NeonCalculator.mpk
```

---

### 2. NeonWeather — Live weather from Open-Meteo

```bash
curl -X POST http://localhost:8000/api/bundle \
  -H "Content-Type: application/json" \
  -d '{
  "widgetName": "NeonWeather",
  "description": "A beautiful weather widget fetching data from open-meteo.",
  "aiXml": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<widget id=\"com.widgetforge.neonweather.NeonWeather\" pluginWidget=\"true\" needsEntityContext=\"false\" offlineCapable=\"true\" supportedPlatform=\"Web\" xmlns=\"http://www.mendix.com/widget/1.0/\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.mendix.com/widget/1.0/ ../node_modules/mendix/custom_widget.xsd\">\n    <name>Neon Weather</name>\n    <description>A weather widget with neon styling.</description>\n    <properties>\n        <propertyGroup caption=\"General\">\n            <property key=\"themeColor\" type=\"string\" required=\"false\" defaultValue=\"#00ffff\">\n                <caption>Neon Color</caption>\n                <description>Color of the neon glow.</description>\n            </property>\n        </propertyGroup>\n    </properties>\n</widget>",
  "aiCss": ".neon-weather-container { background: rgba(10,10,15,0.9); padding: 30px; border-radius: 16px; border: 1px solid var(--neon-color, #0ff); box-shadow: 0 0 20px rgba(0,255,255,0.4); color: #e0e0e0; min-width: 250px; text-align: center; font-family: sans-serif; }\n.neon-weather-temp { font-size: 4rem; font-weight: bold; color: var(--neon-color, #0ff); text-shadow: 0 0 10px var(--neon-color, #0ff); }\n.neon-weather-label { font-size: 1.1rem; text-transform: uppercase; letter-spacing: 2px; color: #aaa; }\n.neon-weather-loading { color: var(--neon-color, #0ff); animation: pulse 1.5s infinite; }\n@keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }",
  "aiJsx": "import { useState, useEffect } from 'react';\n\nexport interface Props { themeColor?: string; }\n\nexport function NeonWeather({ themeColor = '#00ffff' }: Props) {\n  const [temp, setTemp] = useState<number | null>(null);\n  const [loading, setLoading] = useState(true);\n\n  useEffect(() => {\n    fetch('https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true')\n      .then(r => r.json())\n      .then(d => { setTemp(d.current_weather.temperature); setLoading(false); })\n      .catch(() => setLoading(false));\n  }, []);\n\n  return (\n    <div className=\"neon-weather-container\" style={{ '--neon-color': themeColor } as React.CSSProperties}>\n      <div className=\"neon-weather-label\">BERLIN, DE</div>\n      {loading ? <div className=\"neon-weather-loading\">Loading...</div> : <div className=\"neon-weather-temp\">{temp !== null ? `${temp}°C` : 'N/A'}</div>}\n      <div className=\"neon-weather-label\">Current Temp</div>\n    </div>\n  );\n}"
}' \
  --output NeonWeather.mpk
```

---

### 3. NeonFlames — Interactive FLAMES game

```bash
curl -X POST http://localhost:8000/api/bundle \
  -H "Content-Type: application/json" \
  -d '{
  "widgetName": "NeonFlames",
  "description": "A complex, interactive FLAMES game widget with neon UI.",
  "aiXml": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<widget id=\"com.widgetforge.neonflames.NeonFlames\" pluginWidget=\"true\" needsEntityContext=\"false\" offlineCapable=\"true\" supportedPlatform=\"Web\" xmlns=\"http://www.mendix.com/widget/1.0/\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.mendix.com/widget/1.0/ ../node_modules/mendix/custom_widget.xsd\">\n    <name>Neon Flames</name>\n    <description>FLAMES relationship calculator with neon UI.</description>\n    <properties>\n        <propertyGroup caption=\"General\">\n            <property key=\"themeColor\" type=\"string\" required=\"false\" defaultValue=\"#ff3366\">\n                <caption>Neon Color</caption>\n                <description>Color of the neon glow.</description>\n            </property>\n        </propertyGroup>\n    </properties>\n</widget>",
  "aiCss": ".flames-container { background: #080808; padding: 40px; border-radius: 20px; border: 2px solid var(--neon-color, #ff3366); box-shadow: 0 0 25px var(--neon-color, #ff3366); color: #fff; max-width: 400px; text-align: center; font-family: sans-serif; }\n.flames-title { font-size: 2.5rem; font-weight: 800; letter-spacing: 5px; color: var(--neon-color, #ff3366); text-shadow: 0 0 10px var(--neon-color, #ff3366); margin-bottom: 30px; }\n.flames-input { background: transparent; border: 1px solid #444; color: #fff; padding: 15px; width: calc(100% - 30px); border-radius: 8px; font-size: 1.1rem; margin-bottom: 20px; outline: none; transition: 0.3s; }\n.flames-input:focus { border-color: var(--neon-color, #ff3366); }\n.flames-btn { background: #111; color: var(--neon-color, #ff3366); border: 1px solid var(--neon-color, #ff3366); padding: 15px 30px; font-size: 1.2rem; border-radius: 30px; cursor: pointer; width: 100%; transition: 0.4s; }\n.flames-btn:hover { background: var(--neon-color, #ff3366); color: #000; }\n.flames-result { margin-top: 30px; font-size: 2.5rem; font-weight: bold; animation: pop 0.5s ease-out; }\n@keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }",
  "aiJsx": "import { useState } from 'react';\n\nexport interface Props { themeColor?: string; }\n\nexport function NeonFlames({ themeColor = '#ff3366' }: Props) {\n  const [name1, setName1] = useState('');\n  const [name2, setName2] = useState('');\n  const [result, setResult] = useState('');\n\n  const calculate = () => {\n    let n1 = name1.toLowerCase().replace(/\\s/g, '').split('');\n    let n2 = name2.toLowerCase().replace(/\\s/g, '').split('');\n    for (let i = 0; i < n1.length; i++)\n      for (let j = 0; j < n2.length; j++)\n        if (n1[i] === n2[j] && n1[i] !== '*') { n1[i] = '*'; n2[j] = '*'; break; }\n    const count = n1.filter(c => c !== '*').length + n2.filter(c => c !== '*').length;\n    if (count === 0) { setResult('Same Name!'); return; }\n    let flames = ['Friends','Lovers','Affection','Marriage','Enemies','Siblings'];\n    let index = 0;\n    while (flames.length > 1) { index = (index + count - 1) % flames.length; flames.splice(index, 1); }\n    setResult(flames[0]);\n  };\n\n  return (\n    <div className=\"flames-container\" style={{ '--neon-color': themeColor } as React.CSSProperties}>\n      <div className=\"flames-title\">FLAMES</div>\n      <input className=\"flames-input\" placeholder=\"Your Name\" value={name1} onChange={e => setName1(e.target.value)} />\n      <input className=\"flames-input\" placeholder=\"Partner Name\" value={name2} onChange={e => setName2(e.target.value)} />\n      <button className=\"flames-btn\" onClick={calculate}>Reveal Destiny</button>\n      {result && <div className=\"flames-result\">{result}</div>}\n    </div>\n  );\n}"
}' \
  --output NeonFlames.mpk
```

---

### 4. NeonCarousel — Auto-playing embla carousel (external deps)

> Uses `embla-carousel-react` and `embla-carousel-autoplay`. Pass them via `dependencies`.

```bash
curl -X POST http://localhost:8000/api/bundle \
  -H "Content-Type: application/json" \
  -d '{
  "widgetName": "NeonCarousel",
  "description": "A slick modern neon carousel using an external library.",
  "dependencies": {
    "embla-carousel-react": "^8.0.0",
    "embla-carousel-autoplay": "^8.0.0"
  },
  "aiXml": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<widget id=\"com.widgetforge.neoncarousel.NeonCarousel\" pluginWidget=\"true\" needsEntityContext=\"false\" offlineCapable=\"true\" supportedPlatform=\"Web\" xmlns=\"http://www.mendix.com/widget/1.0/\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.mendix.com/widget/1.0/ ../node_modules/mendix/custom_widget.xsd\">\n    <name>Neon Carousel</name>\n    <description>A slick modern neon carousel.</description>\n    <properties>\n        <propertyGroup caption=\"General\">\n            <property key=\"themeColor\" type=\"string\" required=\"false\" defaultValue=\"#bc13fe\">\n                <caption>Neon Color</caption>\n                <description>Color of the neon glow.</description>\n            </property>\n        </propertyGroup>\n    </properties>\n</widget>",
  "aiCss": ".embla { overflow: hidden; background: #050505; padding: 40px; border-radius: 24px; border: 1px solid var(--neon-color, #bc13fe); box-shadow: 0 0 30px rgba(188,19,254,0.2); max-width: 600px; margin: auto; }\n.embla__container { display: flex; }\n.embla__slide { flex: 0 0 100%; min-width: 0; padding-left: 10px; }\n.neon-slide { display: flex; align-items: center; justify-content: center; height: 300px; background: #1a1a1a; border-radius: 16px; color: #fff; font-size: 2rem; font-weight: bold; border: 2px dashed #444; transition: 0.3s; cursor: grab; }\n.neon-slide:hover { border-color: var(--neon-color, #bc13fe); box-shadow: inset 0 0 20px var(--neon-color, #bc13fe); color: var(--neon-color, #bc13fe); }",
  "aiJsx": "import useEmblaCarousel from 'embla-carousel-react';\nimport Autoplay from 'embla-carousel-autoplay';\n\nexport interface Props { themeColor?: string; }\n\nexport function NeonCarousel({ themeColor = '#bc13fe' }: Props) {\n  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay()]);\n  return (\n    <div className=\"embla\" ref={emblaRef} style={{ '--neon-color': themeColor } as React.CSSProperties}>\n      <div className=\"embla__container\">\n        {[1,2,3,4,5].map(n => (\n          <div className=\"embla__slide\" key={n}>\n            <div className=\"neon-slide\">Slide {n}</div>\n          </div>\n        ))}\n      </div>\n    </div>\n  );\n}"
}' \
  --output NeonCarousel.mpk
```

---

### 5. ConfettiButton — Canvas confetti on click (external dep)

> Uses `canvas-confetti`. Note: no `aiCss` needed — styles are inline.

```bash
curl -X POST http://localhost:8000/api/bundle \
  -H "Content-Type: application/json" \
  -d '{
  "widgetName": "ConfettiButton",
  "description": "A button that triggers a confetti explosion using the canvas-confetti library.",
  "dependencies": {
    "canvas-confetti": "^1.9.3",
    "@types/canvas-confetti": "^1.6.4"
  },
  "aiXml": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<widget id=\"com.widgetforge.confettibutton.ConfettiButton\" pluginWidget=\"true\" needsEntityContext=\"false\" offlineCapable=\"true\" supportedPlatform=\"Web\" xmlns=\"http://www.mendix.com/widget/1.0/\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.mendix.com/widget/1.0/ ../node_modules/mendix/custom_widget.xsd\">\n    <name>Confetti Button</name>\n    <description>Triggers confetti on click</description>\n    <properties>\n        <propertyGroup caption=\"General\">\n            <property key=\"buttonLabel\" type=\"string\" defaultValue=\"Celebrate!\">\n                <caption>Button Label</caption>\n                <description>The text to display on the button</description>\n            </property>\n        </propertyGroup>\n    </properties>\n</widget>",
  "aiJsx": "import confetti from 'canvas-confetti';\n\nexport interface Props { buttonLabel?: string; }\n\nexport function ConfettiButton({ buttonLabel = 'Celebrate!' }: Props) {\n  const handleClick = () => confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });\n  return (\n    <button onClick={handleClick} style={{ padding: '12px 24px', fontSize: '16px', fontWeight: '600', color: '#fff', background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>\n      {buttonLabel}\n    </button>\n  );\n}"
}' \
  --output ConfettiButton.mpk
```

---

## Key Architecture Notes

### CSS in Mendix Widgets
Mendix build tools (`mx-widget-tools`) do not automatically include `.css` files in the bundled `.mpk`. The server works around this with a post-build step that:
1. Reads the CSS buffer from `src/ui/WidgetName.css`
2. Uses `adm-zip` to inject it directly into the `.mpk` archive
3. Updates the `package.xml` manifest to reference the file

### ANSI Log Rendering
The frontend automatically converts backend terminal escape codes into colored, styled React elements. This ensures that Rollup/TypeScript errors are easily readable in the "Build Log" and "Errors" tabs.

### Widget ID Convention
IDs must follow the pattern: `com.widgetforge.<widgetnamelowercase>.<WidgetName>`  
Example: `com.widgetforge.neoncalculator.NeonCalculator`

The server auto-corrects non-conforming IDs at build time.

### Environment & Cleanup
- Subdirectories created in `server/temp/` during the build process are automatically cleaned up after the download completes or upon error.
- The server is built using `npm run build` which populates the `dist/` directory.

---

*Last Updated: March 2026*

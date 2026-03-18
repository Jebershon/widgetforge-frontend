# WidgetForge AI Prompt Template

Use this prompt with any AI (Gemini, Claude, ChatGPT, or even smaller local models) to generate code for WidgetForge's **Manual Bundle** mode.

---

## 🤖 The Ultimate Prompt

Copy the text below exactly. Replace the brackets `[...]` with your own widget ideas.

> "ACT AS a Senior Mendix & React Developer. Your mission is to generate a professional, production-ready Mendix Pluggable Widget based on these requirements:
> 
> **Widget Name:** [Name, e.g., ColorPicker]
> **Function:** [What it does, e.g., A radial color selector for Mendix forms]
> 
> ---
> ### 📋 OUTPUT RULES (FOR THE AI):
> 1. Provide **4 separate code blocks** (XML, TSX, CSS, JSON).
> 2. Use **React 19** and functional components.
> 3. **NO** imports from `@mendix/*` or `mendix/*`.
> 4. **NO** use of `createElement`. Use JSX.
> 5. **XML ID** must be: `com.widgetforge.[widgetnamelowercase].[WidgetName]`
> 
> ---
> ### 📝 STRUCTURE TO FOLLOW:
> [XML BLOCK]
> [TSX BLOCK]
> [CSS BLOCK]
> [JSON DEPENDENCIES BLOCK]
> 
> ---
> ### 📦 BLOCK 1: Mendix XML (widget.xml)
> Generate the `<widget>` XML. Include properties for [list your props, e.g., initialColor, opacity].
> 
> ### ⚛️ BLOCK 2: React TSX ([WidgetName].tsx)
> Generate the React component. Use `export function [WidgetName](props: [WidgetName]Props)`.
> Include `import "./ui/[WidgetName].css";` at the top.
> 
> ### 🎨 BLOCK 3: CSS ([WidgetName].css)
> Generate modern CSS. Use Flexbox/Grid. Avoid fixed widths.
> 
> ### 📄 BLOCK 4: Dependencies (JSON)
> Provide a JSON object of npm packages needed, e.g., `{"lucide-react": "latest"}`. If none, return `{}`."

---

## 🛠️ How to use the output in WidgetForge

1.  **Switch to Manual Mode**: In the dashboard, click the "Manual Bundle" tab.
2.  **Paste & Build**:
    - **XML**: Copy the XML block into the XML editor.
    - **TSX**: Copy the TSX block into the TSX editor.
    - **CSS**: Copy the CSS block into the CSS tab.
    - **JSON**: Copy the JSON object into the Dependencies field.
3.  **Click Bundle**: WidgetForge will compile and give you a `.mpk` file.

---

## ⚙️ How it Works (The Backend Logic)

When you click **Bundle**, WidgetForge performs the following steps to ensure a valid Mendix widget:

1.  **Scaffolding**: It creates a clean, professional Mendix widget project structure using a custom programmatic scaffold (replacing the standard CLI to ensure speed and stability).
2.  **Code Correction**: 
    - **XML**: It automatically fixes your Widget ID to match Mendix requirements.
    - **TSX**: It removes accidental `createElement` imports and ensures React 19 compatibility.
3.  **Automated Build**: It runs `npm install` for your specific dependencies and executes the actual Mendix `pluggable-widgets-tools` build process.
4.  **CSS Injection**: Since standard Mendix tools often omit CSS, WidgetForge manually injects your `.css` file into the final `.mpk` archive and updates the `package.xml` manifest so it loads correctly in Mendix.
5.  **Artifact Generation**: The final `.mpk` is served for download, and the temporary build environment is securely wiped.

## 💡 Pro Tips for Small Models:
- If the model gets confused, try asking for **one block at a time**.
- If it includes `mendix` imports, delete those lines manually before bundling; WidgetForge handles the environment for you!

---

## 🚫 Known Limitations

To ensure the best results, keep these current limitations in mind:

1.  **Web Platform Only**: Currently, WidgetForge is optimized for **Web** widgets. Native (Mobile) widget support is coming in Phase 2.
2.  **React 19**: The build environment is pinned to **React 19**. Code using older React patterns (like `class` components or legacy lifecycle methods) may fail to compile.
3.  **No Direct Mendix Data Access**: The **Preview** tab in WidgetForge uses mock data (JSON). It cannot connect to your live Mendix database or microflows. Real data binding only happens after you import the `.mpk` into Studio Pro.
4.  **Internet Required**: Because the server runs `npm install` for your custom dependencies, an active internet connection is required during the bundling process.
5.  **Build Timeouts**: Very large widgets with dozens of heavy npm dependencies may exceed the server's 10-minute build timeout.
6.  **Property Mapping**: While the tool generates the widget, you still need to manually configure the matching attributes and data sources in Mendix Studio Pro after importing the `.mpk`.

# WidgetForge Release Notes

We are thrilled to announce the latest updates to WidgetForge! This release focuses on major architectural upgrades, significantly expanding our AI capabilities, and improving the developer experience with a more stable, secure, and user-friendly interface.

## 🚀 Major Features

*   **Full Transition to TSX:** We've completely refactored the widget generation pipeline to support TSX (TypeScript React) as the new standard. This ensures stricter type-safety, better alignment with modern enterprise development standards, and more robust generated widget code.
*   **Multi-Provider AI Engine & Dynamic Models:** You are no longer restricted to a single AI provider. We've introduced seamless support for **Gemini, OpenAI, and Anthropic**. 
    *   *Dynamic Model Fetching:* The system now dynamically fetches available models for each provider, significantly reducing configuration typos and ensuring immediate access to the latest AI models.
    *   *Frontend API Configuration:* API keys and provider selections are now securely managed directly from the frontend UI (Settings Modal) rather than relying on backend `.env` files. Keys are handled securely and passed only during generation requests.
*   **Platform State Management (Web vs. Native):** We've introduced complete separation of state between Web and Native platforms. Data flows, code, and dependencies are now distinct, with intelligent backup and restoration of your codebase when toggling between web and native generation modes to ensure zero cross-contamination.

## ✨ Improvements & UI Enhancements

*   **Dedicated AI Chat Interface:** We've overhauled the AI interaction experience by building a dedicated Chat Interface, replacing cumbersome backend tools and providing a seamless, real-time code generation dialogue.
*   **Refined Prompting Experience:** Generating basic applications is faster than ever with our new "Quick-Access" prompt buttons in the UI. We've also updated and standardized the system prompts to rigorously enforce `createElement` syntax over standard JSX where necessary, stop the hallucination of non-existent Mendix libraries, and improve generation outcomes.
*   **Enhanced Error Reporting:** Build failures and errors are now surfaced clearly and comprehensively directly within the application UI, speeding up the troubleshooting loop without requiring you to comb through deep server logs.
*   **Expanded Documentation:** We've thoroughly updated the WidgetForge documentation to cover the new system architecture, the updated build pipeline, and how to utilize the newly supported utility files.
*   **Source Branding:** Implemented a non-intrusive watermark to tag server logs and track generated code lineage.

## 🐛 Bug Fixes & Stability

*   **XML Generation & Normalization Fixes:** Resolved persistent, disruptive XML schema errors. We implemented robust server-side XML normalization to gracefully handle malformed properties and orphaned tags during the Mendix widget packaging process.
*   **Model Selection Adherence:** Fixed a critical bug where the AI backend ignored the user's selected model configuration and defaulted to standard providers.
*   **Codebase Cleanup:** General stability optimizations including the removal of internal testing logic and debug endpoints from the production build pipeline, leaving a safer, cleaner server environment.

---

*Thank you for your continued support as we build the premier AI-driven Mendix widget generator!*

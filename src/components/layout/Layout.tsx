import { useState } from "react";
import Header from "./Header";
import ComponentExplorer from "./ComponentExplorer";
import CanvasArea from "./CanvasArea";
import GeminiAgent from "./GeminiAgent";

/**
 * Main application layout (VS Code style).
 *
 * ┌────────────────────────────────────────────────────────┐
 * │  🔷 SimuIDE                                  [⚙️ ☰]   │
 * ├──────────────┬─────────────────────────────┬──────────┤
 * │              │                             │          │
 * │ 🔧Components │     Canvas / Workspace      │  Gemini  │
 * │              │                             │   Chat   │
 * │ [Search]     │                             │          │
 * │ [Basic ▼]    │                             │ [Build]  │
 * │ [Power ▼]    │                             │          │
 * │ [Inputs ▼]   │                             │          │
 * │              │                             │          │
 * └──────────────┴─────────────────────────────┴──────────┘
 */
export default function Layout() {
  const [agentOpen, setAgentOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-vs-dark-500 text-gray-300">
      {/* Top toolbar */}
      <Header />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Component Explorer */}
        <ComponentExplorer />

        {/* Center: Canvas */}
        <CanvasArea />

        {/* Right: AI Agent */}
        <GeminiAgent open={agentOpen} onToggle={() => setAgentOpen((o) => !o)} />
      </div>
    </div>
  );
}

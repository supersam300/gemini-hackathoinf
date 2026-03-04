import { useState } from "react";
import Header from "./Header";
import ComponentExplorer from "./ComponentExplorer";
import CanvasArea from "./CanvasArea";
import GeminiAgent from "./GeminiAgent";
import CodeEditor from "../editor/CodeEditor";

/**
 * Main application layout (VS Code style).
 *
 * ┌────────────────────────────────────────────────────────┐
 * │  ◇ SimuIDE        [⬡ Canvas | </> IDE]      [⚙️ ☰]   │
 * ├──────────────┬─────────────────────────────┬──────────┤
 * │              │                             │          │
 * │ 🔧Components │  Canvas  —or—  Code Editor  │  Gemini  │
 * │              │                             │   Chat   │
 * └──────────────┴─────────────────────────────┴──────────┘
 */
export default function Layout() {
  const [agentOpen, setAgentOpen] = useState(true);
  const [view, setView] = useState<"canvas" | "ide">("canvas");

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-vs-dark-500 text-gray-300">
      {/* Top toolbar */}
      <Header view={view} onViewChange={setView} />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Component Explorer */}
        <ComponentExplorer />

        {/* Center: Canvas or IDE */}
        {view === "canvas" ? (
          <CanvasArea />
        ) : (
          <div className="flex-1 overflow-hidden">
            <CodeEditor />
          </div>
        )}

        {/* Right: AI Agent */}
        <GeminiAgent open={agentOpen} onToggle={() => setAgentOpen((o) => !o)} />
      </div>
    </div>
  );
}

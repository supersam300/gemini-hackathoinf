import { useState } from "react";
import Header from "./Header";
import ComponentExplorer from "./ComponentExplorer";
import CanvasArea from "./CanvasArea";
import GeminiAgent from "./GeminiAgent";
import CodeEditor from "../editor/CodeEditor";
import OutputConsole from "../arduino/OutputConsole";
import { useArduinoStore } from "../../store/arduinoStore";

/**
 * Main application layout (VS Code style).
 *
 * ┌────────────────────────────────────────────────────────┐
 * │  ◇ SimuIDE        [⬡ Canvas | </> IDE]      [⚙️ ☰]   │
 * ├──────────────┬─────────────────────────────┬──────────┤
 * │              │  Arduino toolbar            │          │
 * │ 🔧Components │  Editor toolbar             │  Gemini  │
 * │              │  Monaco editor              │   Chat   │
 * │              ├─────────────────────────────┤          │
 * │              │  Output console (toggle)    │          │
 * └──────────────┴─────────────────────────────┴──────────┘
 */
export default function Layout() {
  const [agentOpen, setAgentOpen] = useState(true);
  const [view, setView] = useState<"canvas" | "ide">("canvas");
  const { consoleOpen } = useArduinoStore();

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
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Editor takes remaining space */}
            <div className="flex-1 overflow-hidden">
              <CodeEditor />
            </div>

            {/* Output console — toggled by ArduinoToolbar */}
            {consoleOpen && (
              <div
                className="shrink-0 border-t border-gray-700"
                style={{ height: "200px" }}
              >
                <OutputConsole />
              </div>
            )}
          </div>
        )}

        {/* Right: AI Agent */}
        <GeminiAgent open={agentOpen} onToggle={() => setAgentOpen((o) => !o)} />
      </div>
    </div>
  );
}

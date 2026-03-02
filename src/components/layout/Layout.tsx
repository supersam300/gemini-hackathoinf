import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import CanvasArea from "./CanvasArea";
import GeminiAgent from "./GeminiAgent";

/**
 * Main application layout.
 *
 * ┌────────────────────────────────────────────────────────┐
 * │  [+ Upload] [Debug]                                    │
 * ├────────────────────────────────────────────────────────┤
 * │  Components: [Search] | [Wire][Ground][VCC] | [R][C]… │
 * ├─────────────────────────────────────────┬─────────────┤
 * │                                         │ Gemini  [☰] │
 * │          Canvas / Workspace             │  Chat area  │
 * │          (full width)                   │  [Build]    │
 * └─────────────────────────────────────────┴─────────────┘
 */
export default function Layout() {
  const [agentOpen, setAgentOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-cream-50 text-gray-800">
      {/* Row 1: Top toolbar */}
      <Header />

      {/* Row 2: Main body — left content + right agent */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Components bar + Canvas stacked vertically */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Sidebar />
          <CanvasArea />
        </div>

        {/* Right: Gemini Live Agent (full height, toggleable) */}
        <GeminiAgent open={agentOpen} onToggle={() => setAgentOpen((o) => !o)} />
      </div>
    </div>
  );
}

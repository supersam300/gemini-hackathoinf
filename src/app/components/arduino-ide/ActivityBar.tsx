import React from "react";
import {
  Files,
  Search,
  GitBranch,
  Puzzle,
  Cpu,
  BarChart2,
  Settings,
  ChevronRight,
  BookOpen,
} from "lucide-react";

type Panel = "explorer" | "search" | "source-control" | "extensions" | "boards" | "libraries";

interface ActivityBarProps {
  activePanel: Panel | null;
  onPanelChange: (panel: Panel | null) => void;
  darkMode?: boolean;
}

const topItems: { id: Panel; icon: React.ReactNode; tooltip: string }[] = [
  { id: "explorer", icon: <Files size={22} />, tooltip: "Explorer (Ctrl+Shift+E)" },
  { id: "search", icon: <Search size={22} />, tooltip: "Search (Ctrl+Shift+F)" },
  { id: "source-control", icon: <GitBranch size={22} />, tooltip: "Source Control (Ctrl+Shift+G)" },
  { id: "extensions", icon: <Puzzle size={22} />, tooltip: "Extensions (Ctrl+Shift+X)" },
  { id: "boards", icon: <Cpu size={22} />, tooltip: "Board Manager" },
  { id: "libraries", icon: <BookOpen size={22} />, tooltip: "Library Manager" },
];

export function ActivityBar({ activePanel, onPanelChange, darkMode = true }: ActivityBarProps) {
  const dm = darkMode;
  return (
    <div
      className="flex flex-col items-center justify-between select-none"
      style={{
        width: "48px",
        background: dm ? "#181825" : "#f0f0f2",
        borderRight: dm ? "1px solid #313244" : "1px solid #c8c8c8",
        flexShrink: 0,
      }}
    >
      <div className="flex flex-col items-center w-full">
        {topItems.map((item) => (
          <button
            key={item.id}
            title={item.tooltip}
            onClick={() => onPanelChange(activePanel === item.id ? null : item.id)}
            className="relative flex items-center justify-center w-full transition-colors"
            style={{
              height: "48px",
              color: activePanel === item.id ? (dm ? "#cdd6f4" : "#1565c0") : (dm ? "#585b70" : "#888"),
              borderLeft: activePanel === item.id ? `2px solid ${dm ? '#89b4fa' : '#1565c0'}` : "2px solid transparent",
              background: activePanel === item.id ? (dm ? "rgba(137,180,250,0.08)" : "rgba(21,101,192,0.08)") : "transparent",
            }}
            onMouseEnter={(e) => {
              if (activePanel !== item.id) e.currentTarget.style.color = dm ? "#a6adc8" : "#555";
            }}
            onMouseLeave={(e) => {
              if (activePanel !== item.id) e.currentTarget.style.color = dm ? "#585b70" : "#888";
            }}
          >
            {item.icon}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center w-full pb-2">
        <button
          title="Settings"
          className="flex items-center justify-center w-full transition-colors"
          style={{ height: "48px", color: dm ? "#585b70" : "#888" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = dm ? "#a6adc8" : "#555")}
          onMouseLeave={(e) => (e.currentTarget.style.color = dm ? "#585b70" : "#888")}
        >
          <Settings size={22} />
        </button>
      </div>
    </div>
  );
}
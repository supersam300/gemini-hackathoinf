import React from "react";
import {
  GitBranch,
  AlertCircle,
  Cpu,
  Wifi,
  Bell,
  RefreshCw,
  Layers,
} from "lucide-react";

interface StatusBarProps {
  board: string;
  port: string;
  activeFile: string | null;
  errors: number;
  warnings: number;
  darkMode?: boolean;
}

export function StatusBar({ board, port, activeFile, errors, warnings, darkMode = true }: StatusBarProps) {
  const dm = darkMode;
  return (
    <div
      className="flex items-center justify-between px-2 select-none flex-shrink-0"
      style={{
        background: dm ? "#181825" : "#f0f0f0",
        height: "22px",
        color: dm ? "#585b70" : "#888",
        fontSize: "12px",
        borderTop: dm ? "1px solid #313244" : "1px solid #d0d0d0",
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-0">
        <button
          className={`flex items-center gap-1 px-2 h-full transition-colors ${dm ? 'hover:bg-[#313244]' : 'hover:bg-[#e0e0e0]'}`}
          style={{ height: "22px", color: dm ? "#89b4fa" : "#1565c0" }}
        >
          <GitBranch size={13} />
          <span>main</span>
        </button>
        <button
          className={`flex items-center gap-1 px-2 transition-colors ${dm ? 'hover:bg-[#313244]' : 'hover:bg-[#e0e0e0]'}`}
          style={{ height: "22px" }}
        >
          <RefreshCw size={12} />
        </button>
        <div className="flex items-center gap-1 px-2">
          <AlertCircle size={13} style={{ color: errors > 0 ? "#f38ba8" : (dm ? "#585b70" : "#888") }} />
          <span>{errors}</span>
          <span style={{ marginLeft: "4px", color: warnings > 0 ? "#f9e2af" : (dm ? "#585b70" : "#888") }}>
            ⚠ {warnings}
          </span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-0">
        {activeFile && (
          <div className="px-2" style={{ color: dm ? "#585b70" : "#888" }}>
            C++/Arduino
          </div>
        )}
        <div className="px-2" style={{ color: dm ? "#585b70" : "#888" }}>UTF-8</div>
        <button
          className={`flex items-center gap-1 px-2 transition-colors ${dm ? 'hover:bg-[#313244]' : 'hover:bg-[#e0e0e0]'}`}
          style={{ height: "22px", color: dm ? "#89b4fa" : "#1565c0" }}
          title={`Board: ${board}`}
        >
          <Cpu size={13} />
          <span>{board}</span>
        </button>
        <button
          className={`flex items-center gap-1 px-2 transition-colors ${dm ? 'hover:bg-[#313244]' : 'hover:bg-[#e0e0e0]'}`}
          style={{ height: "22px", color: dm ? "#585b70" : "#888" }}
          title={`Port: ${port}`}
        >
          <Wifi size={13} />
          <span>{port}</span>
        </button>
        <button
          className={`flex items-center gap-1 px-2 transition-colors ${dm ? 'hover:bg-[#313244]' : 'hover:bg-[#e0e0e0]'}`}
          style={{ height: "22px" }}
        >
          <Bell size={13} />
        </button>
      </div>
    </div>
  );
}
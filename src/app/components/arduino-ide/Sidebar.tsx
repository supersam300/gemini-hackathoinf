import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Search,
  X,
  GitBranch,
  Plus,
  RefreshCw,
  Download,
  Check,
  Puzzle,
  Cpu,
  BookOpen,
  Filter,
} from "lucide-react";
import { fileTree, FileNode, OpenTab } from "./arduinoData";
import { LIBRARIES, BOARD_PACKAGES } from "./data";

type Panel = "explorer" | "search" | "source-control" | "extensions" | "boards" | "libraries";

interface SidebarProps {
  panel: Panel;
  openTabs: OpenTab[];
  activeTabId: string | null;
  onOpenFile: (node: FileNode) => void;
  darkMode?: boolean;
}

// --- Explorer ---
function FileTreeNode({
  node,
  depth,
  onOpen,
}: {
  node: FileNode;
  depth: number;
  onOpen: (node: FileNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0 || depth === 1);

  const extColors: Record<string, string> = {
    ino: "#00979D",
    h: "#569CD6",
    cpp: "#CE9178",
    md: "#85C1E9",
  };

  if (node.type === "folder") {
    return (
      <div>
        <button
          className="flex items-center w-full text-left hover:bg-[#2a2d2e] group"
          style={{ paddingLeft: `${depth * 12 + 8}px`, height: "22px" }}
          onClick={() => setExpanded(!expanded)}
        >
          <span style={{ color: "#858585", marginRight: "4px", flexShrink: 0 }}>
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
          <span style={{ marginRight: "5px", color: "#DCAD5B", flexShrink: 0 }}>
            {expanded ? <FolderOpen size={14} /> : <Folder size={14} />}
          </span>
          <span style={{ fontSize: "13px", color: "#cccccc" }}>{node.name}</span>
        </button>
        {expanded &&
          node.children?.map((child) => (
            <FileTreeNode key={child.id} node={child} depth={depth + 1} onOpen={onOpen} />
          ))}
      </div>
    );
  }

  const ext = node.extension || "";
  return (
    <button
      className="flex items-center w-full text-left hover:bg-[#2a2d2e] group"
      style={{ paddingLeft: `${depth * 12 + 8}px`, height: "22px" }}
      onClick={() => onOpen(node)}
    >
      <span style={{ marginRight: "5px", color: extColors[ext] || "#858585", flexShrink: 0 }}>
        <File size={14} />
      </span>
      <span style={{ fontSize: "13px", color: "#cccccc" }}>{node.name}</span>
      {ext === "ino" && (
        <span
          style={{ fontSize: "10px", color: "#00979D", marginLeft: "6px", opacity: 0.7 }}
        >
          ino
        </span>
      )}
    </button>
  );
}

function ExplorerPanel({ onOpen }: { onOpen: (node: FileNode) => void }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-1"
        style={{ borderBottom: "1px solid #1e1e1e" }}
      >
        <span style={{ fontSize: "11px", color: "#bbbbbb", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            className="flex items-center justify-center rounded hover:bg-[#3c3c3c]"
            style={{ width: "20px", height: "20px", color: "#858585" }}
            title="New File"
          >
            <Plus size={13} />
          </button>
          <button
            className="flex items-center justify-center rounded hover:bg-[#3c3c3c]"
            style={{ width: "20px", height: "20px", color: "#858585" }}
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#424242 transparent" }}>
        {fileTree.map((node) => (
          <FileTreeNode key={node.id} node={node} depth={0} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

// --- Search Panel ---
function SearchPanel() {
  const [query, setQuery] = useState("");
  const results = query
    ? [
        { file: "Blink.ino", line: 3, text: `  ${query} found in setup()` },
        { file: "SensorHub.ino", line: 17, text: `  ${query} usage detected` },
      ]
    : [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 pt-2 pb-1" style={{ borderBottom: "1px solid #1e1e1e" }}>
        <span style={{ fontSize: "11px", color: "#bbbbbb", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Search
        </span>
      </div>
      <div className="px-2 pt-2">
        <div
          className="flex items-center gap-1 px-2"
          style={{ background: "#3c3c3c", border: "1px solid #555", height: "26px" }}
        >
          <Search size={12} style={{ color: "#858585" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: "13px", color: "#cccccc" }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ color: "#858585" }}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="overflow-y-auto flex-1 px-2 pt-2">
        {results.length > 0 ? (
          results.map((r, i) => (
            <div key={i} className="mb-1">
              <div style={{ fontSize: "12px", color: "#cccccc" }}>{r.file}</div>
              <div
                className="pl-2 hover:bg-[#2a2d2e] cursor-pointer"
                style={{ fontSize: "12px", color: "#858585" }}
              >
                <span style={{ color: "#888", marginRight: "6px" }}>{r.line}</span>
                {r.text}
              </div>
            </div>
          ))
        ) : query ? (
          <div style={{ fontSize: "12px", color: "#858585" }}>No results found.</div>
        ) : (
          <div style={{ fontSize: "12px", color: "#858585" }}>Type to search across files.</div>
        )}
      </div>
    </div>
  );
}

// --- Source Control ---
function SourceControlPanel() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-1"
        style={{ borderBottom: "1px solid #1e1e1e" }}
      >
        <span style={{ fontSize: "11px", color: "#bbbbbb", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Source Control
        </span>
      </div>
      <div className="px-3 pt-3">
        <div
          className="flex items-center gap-2 px-3"
          style={{ background: "#3c3c3c", border: "1px solid #555", height: "28px" }}
        >
          <input
            placeholder="Message (Ctrl+Enter to commit)"
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: "12px", color: "#cccccc" }}
          />
        </div>
        <div className="mt-2">
          <div style={{ fontSize: "11px", color: "#bbbbbb", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Changes (3)
          </div>
          {["Blink.ino", "SensorHub.ino", "config.h"].map((f, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-2 py-0.5 hover:bg-[#2a2d2e] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <File size={12} style={{ color: "#858585" }} />
                <span style={{ fontSize: "12px", color: "#cccccc" }}>{f}</span>
              </div>
              <span style={{ fontSize: "11px", color: i === 2 ? "#73C991" : "#e2c08d" }}>
                {i === 2 ? "U" : "M"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Extensions / Libraries ---
function LibrariesPanel() {
  const [query, setQuery] = useState("");
  const filtered = LIBRARIES.filter(
    (l) =>
      l.name.toLowerCase().includes(query.toLowerCase()) ||
      l.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-1"
        style={{ borderBottom: "1px solid #1e1e1e" }}
      >
        <span style={{ fontSize: "11px", color: "#bbbbbb", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Library Manager
        </span>
        <button style={{ color: "#858585" }} title="Filter">
          <Filter size={13} />
        </button>
      </div>
      <div className="px-2 pt-2">
        <div
          className="flex items-center gap-1 px-2"
          style={{ background: "#3c3c3c", border: "1px solid #555", height: "26px" }}
        >
          <Search size={12} style={{ color: "#858585" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search libraries..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: "13px", color: "#cccccc" }}
          />
        </div>
      </div>
      <div className="overflow-y-auto flex-1 px-2 pt-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#424242 transparent" }}>
        {filtered.map((lib, i) => (
          <div
            key={i}
            className="p-2 mb-1 hover:bg-[#2a2d2e] cursor-pointer rounded"
            style={{ borderBottom: "1px solid #2a2d2e" }}
          >
            <div className="flex items-center justify-between">
              <span style={{ fontSize: "13px", color: "#cccccc" }}>{lib.name}</span>
              <div className="flex items-center gap-1">
                <span style={{ fontSize: "11px", color: "#858585" }}>v{lib.version}</span>
                {lib.installed ? (
                  <span
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(0,151,157,0.15)", fontSize: "11px", color: "#00979D" }}
                  >
                    <Check size={10} /> Installed
                  </span>
                ) : (
                  <button
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                    style={{ background: "#007acc", fontSize: "11px", color: "white" }}
                  >
                    <Download size={10} /> Install
                  </button>
                )}
              </div>
            </div>
            <p style={{ fontSize: "11px", color: "#858585", marginTop: "2px" }}>{lib.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Board Manager ---
function BoardManagerPanel() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-1"
        style={{ borderBottom: "1px solid #1e1e1e" }}
      >
        <span style={{ fontSize: "11px", color: "#bbbbbb", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Board Manager
        </span>
      </div>
      <div className="px-2 pt-2">
        <div
          className="flex items-center gap-1 px-2"
          style={{ background: "#3c3c3c", border: "1px solid #555", height: "26px" }}
        >
          <Search size={12} style={{ color: "#858585" }} />
          <input
            placeholder="Search boards..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: "13px", color: "#cccccc" }}
          />
        </div>
      </div>
      <div className="overflow-y-auto flex-1 px-2 pt-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#424242 transparent" }}>
        {BOARD_PACKAGES.map((pkg, i) => (
          <div
            key={i}
            className="p-2 mb-1 hover:bg-[#2a2d2e] cursor-pointer"
            style={{ borderBottom: "1px solid #2a2d2e" }}
          >
            <div className="flex items-center justify-between">
              <span style={{ fontSize: "13px", color: "#cccccc" }}>{pkg.name}</span>
              {pkg.installed ? (
                <span
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(0,151,157,0.15)", fontSize: "11px", color: "#00979D" }}
                >
                  <Check size={10} /> Installed
                </span>
              ) : (
                <button
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                  style={{ background: "#007acc", fontSize: "11px", color: "white" }}
                >
                  <Download size={10} /> Install
                </button>
              )}
            </div>
            <p style={{ fontSize: "11px", color: "#858585", marginTop: "2px" }}>
              v{pkg.version} · Boards: {pkg.boards.join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Sidebar({ panel, openTabs, activeTabId, onOpenFile, darkMode = true }: SidebarProps) {
  const dm = darkMode;
  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: dm ? "#16213e" : "#f3f3f3",
        borderRight: dm ? "1px solid #0f3460" : "1px solid #d0d0d0",
        color: dm ? "#cccccc" : "#333333",
      }}
    >
      {panel === "explorer" && <ExplorerPanel onOpen={onOpenFile} />}
      {panel === "search" && <SearchPanel />}
      {panel === "source-control" && <SourceControlPanel />}
      {panel === "extensions" && <LibrariesPanel />}
      {panel === "libraries" && <LibrariesPanel />}
      {panel === "boards" && <BoardManagerPanel />}
    </div>
  );
}
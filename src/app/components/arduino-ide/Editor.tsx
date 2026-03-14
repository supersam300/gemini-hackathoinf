import React, { useState, useRef } from "react";
import { X, ChevronDown } from "lucide-react";
import { OpenTab } from "./arduinoData";
import { SyntaxHighlight } from "./syntaxHighlighter";

interface EditorProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onContentChange: (id: string, content: string) => void;
  darkMode?: boolean;
}

const EXT_ICON_COLORS: Record<string, string> = {
  ino: "#00979D",
  h: "#569CD6",
  cpp: "#CE9178",
  md: "#85C1E9",
  S: "#C586C0",
  asm: "#C586C0",
};

const FONT = "'JetBrains Mono', 'Consolas', 'Courier New', monospace";

function WelcomeScreen({ darkMode = true }: { darkMode?: boolean }) {
  const dm = darkMode;
  return (
    <div
      className="flex flex-col items-center justify-center h-full select-none"
      style={{ background: dm ? "#1e1e1e" : "#ffffff" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { label: "New Sketch", shortcut: "Ctrl+N" },
            { label: "Open Sketch...", shortcut: "Ctrl+O" },
            { label: "Recent Sketches", shortcut: "Ctrl+R" },
            { label: "Open Examples", shortcut: "Ctrl+Shift+E" },
          ].map((item) => (
            <button
              key={item.label}
              className={`text-left px-4 py-2 rounded transition-colors ${dm ? 'hover:bg-[#2a2d2e]' : 'hover:bg-[#e8ecf0]'}`}
              style={{ border: dm ? "1px solid #333" : "1px solid #d0d0d0", minWidth: "180px" }}
            >
              <div style={{ fontSize: "13px", color: dm ? "#cccccc" : "#333" }}>{item.label}</div>
              <div style={{ fontSize: "11px", color: dm ? "#858585" : "#888" }}>{item.shortcut}</div>
            </button>
          ))}
        </div>
        <div className="mt-3" style={{ fontSize: "12px", color: dm ? "#858585" : "#888" }}>
          Open a file from the Explorer to start editing
        </div>
      </div>
    </div>
  );
}

function LineNumbers({ lines, darkMode = true }: { lines: number; darkMode?: boolean }) {
  const dm = darkMode;
  return (
    <div
      className="select-none text-right pr-3 pt-3 flex-shrink-0"
      style={{
        minWidth: "48px",
        background: dm ? "#1e1e1e" : "#f8f8f8",
        color: dm ? "#858585" : "#999",
        fontSize: "13px",
        lineHeight: "20px",
        fontFamily: FONT,
        borderRight: dm ? "1px solid #2a2d2e" : "1px solid #e0e0e0",
      }}
    >
      {Array.from({ length: lines }, (_, i) => (
        <div key={i + 1} className={dm ? "hover:text-[#cccccc]" : "hover:text-[#333]"} style={{ height: "20px", cursor: "default" }}>
          {i + 1}
        </div>
      ))}
    </div>
  );
}

function CodeEditor({
  tab,
  onContentChange,
  darkMode = true,
}: {
  tab: OpenTab;
  onContentChange: (id: string, content: string) => void;
  darkMode?: boolean;
}) {
  const dm = darkMode;
  const lines = tab.content.split("\n").length;
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab key → insert 2 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newContent = tab.content.substring(0, start) + "  " + tab.content.substring(end);
      onContentChange(tab.id, newContent);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  const handleCursorChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const pos = ta.selectionStart;
    const before = tab.content.substring(0, pos);
    const lineNum = before.split("\n").length;
    const lastNL = before.lastIndexOf("\n");
    const colNum = pos - (lastNL === -1 ? 0 : lastNL + 1) + 1;
    setCursorLine(lineNum);
    setCursorCol(colNum);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: dm ? "#1e1e1e" : "#ffffff" }}>
      {/* Editor scroll area */}
      <div className="flex flex-1 overflow-auto" style={{ scrollbarWidth: "thin", scrollbarColor: dm ? "#424242 transparent" : "#c0c0c0 transparent" }}>
        <LineNumbers lines={lines} darkMode={darkMode} />
        {/* Overlay + textarea approach */}
        <div className="relative flex-1">
          {/* Syntax highlighted overlay */}
          <pre
            className="absolute inset-0 pointer-events-none pt-3 pl-4 pr-4"
            style={{
              fontFamily: FONT,
              fontSize: "13px",
              lineHeight: "20px",
              color: "#D4D4D4",
              whiteSpace: "pre",
              overflow: "hidden",
              tabSize: 2,
            }}
          >
            <SyntaxHighlight code={tab.content} />
          </pre>
          {/* Transparent textarea for editing */}
          <textarea
            ref={textareaRef}
            value={tab.content}
            onChange={(e) => onContentChange(tab.id, e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={handleCursorChange}
            onKeyUp={handleCursorChange}
            className="absolute inset-0 w-full h-full resize-none outline-none bg-transparent pt-3 pl-4 pr-4"
            style={{
              fontFamily: FONT,
              fontSize: "13px",
              lineHeight: "20px",
              color: "transparent",
              caretColor: "#aeafad",
              whiteSpace: "pre",
              overflow: "auto",
              scrollbarWidth: "none",
              tabSize: 2,
            }}
            spellCheck={false}
          />
        </div>
      </div>
      {/* Cursor position display */}
      <div
        className="flex items-center px-3 gap-2"
        style={{ height: "20px", background: dm ? "#007acc" : "#1565c0", borderTop: dm ? "1px solid #005a9e" : "1px solid #1256a0" }}
      >
        <span style={{ fontSize: "11px", color: "white" }}>
          Ln {cursorLine}, Col {cursorCol}
        </span>
        <span style={{ color: "rgba(255,255,255,0.5)", margin: "0 4px" }}>|</span>
        <span style={{ fontSize: "11px", color: "white" }}>UTF-8</span>
        <span style={{ color: "rgba(255,255,255,0.5)", margin: "0 4px" }}>|</span>
        <span style={{ fontSize: "11px", color: "white" }}>C++/Arduino</span>
      </div>
    </div>
  );
}

export function Editor({ tabs, activeTabId, onTabSelect, onTabClose, onContentChange, darkMode = true }: EditorProps) {
  const dm = darkMode;
  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  if (tabs.length === 0) {
    return <WelcomeScreen darkMode={darkMode} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: dm ? "#1e1e1e" : "#ffffff" }}>
      {/* Tab bar */}
      <div
        className="flex items-end overflow-x-auto flex-shrink-0"
        style={{
          background: dm ? "#2d2d2d" : "#ececec",
          borderBottom: dm ? "1px solid #1e1e1e" : "1px solid #d0d0d0",
          height: "35px",
          scrollbarWidth: "none",
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const color = EXT_ICON_COLORS[tab.extension] || "#858585";
          return (
            <div
              key={tab.id}
              className="flex items-center gap-1.5 px-3 h-full cursor-pointer select-none group flex-shrink-0"
              style={{
                background: isActive ? (dm ? "#1e1e1e" : "#ffffff") : "transparent",
                borderTop: isActive ? "1px solid #007acc" : "1px solid transparent",
                borderRight: dm ? "1px solid #1e1e1e" : "1px solid #d0d0d0",
                minWidth: "120px",
                maxWidth: "200px",
              }}
              onClick={() => onTabSelect(tab.id)}
            >
              <span style={{ color, flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <circle cx="5" cy="5" r="4" />
                </svg>
              </span>
              <span
                className="truncate"
                style={{ fontSize: "13px", color: isActive ? (dm ? "#cccccc" : "#333") : (dm ? "#969696" : "#888"), flex: 1 }}
              >
                {tab.isDirty && (
                  <span style={{ color: "#e2c08d", marginRight: "3px" }}>●</span>
                )}
                {tab.name}
              </span>
              <button
                className={`flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ${dm ? 'hover:bg-[#3c3c3c]' : 'hover:bg-[#d0d0d0]'}`}
                style={{ width: "16px", height: "16px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                <X size={11} style={{ color: "#858585" }} />
              </button>
            </div>
          );
        })}
        {/* Overflow button */}
        <button
          className={`flex items-center justify-center px-2 h-full flex-shrink-0 ${dm ? 'hover:bg-[#3c3c3c]' : 'hover:bg-[#d0d0d0]'}`}
          style={{ color: dm ? "#858585" : "#888" }}
        >
          <ChevronDown size={13} />
        </button>
      </div>

      {/* Breadcrumb */}
      {activeTab && (
        <div
          className="flex items-center gap-1 px-3 flex-shrink-0"
          style={{ height: "22px", background: dm ? "#1e1e1e" : "#ffffff", borderBottom: dm ? "1px solid #2a2d2e" : "1px solid #e0e0e0" }}
        >
          <span style={{ fontSize: "12px", color: dm ? "#858585" : "#999" }}>Workspace</span>
          <span style={{ fontSize: "12px", color: dm ? "#555" : "#ccc" }}>›</span>
          <span style={{ fontSize: "12px", color: dm ? "#cccccc" : "#333" }}>{activeTab.name}</span>
        </div>
      )}

      {/* Code area */}
      {activeTab ? (
        <CodeEditor tab={activeTab} onContentChange={onContentChange} darkMode={darkMode} />
      ) : (
        <WelcomeScreen darkMode={darkMode} />
      )}
    </div>
  );
}
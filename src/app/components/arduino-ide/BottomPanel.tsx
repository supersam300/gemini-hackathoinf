import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
  Send,
  Trash2,
  BarChart2,
  Terminal,
  AlertCircle,
  Info,
  CheckCircle2,
} from "lucide-react";
import { serialMessages, compilerOutput } from "./arduinoData";

type PanelTab = "problems" | "output" | "terminal" | "serial";

interface BottomPanelProps {
  isVisible: boolean;
  onClose: () => void;
  compileLogs: { type: string; text: string }[];
  isCompiling: boolean;
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  darkMode?: boolean;
}

function ProblemsTab() {
  const problems: { type: string; file: string; line: number; msg: string }[] = [];
  return (
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#424242 transparent" }}>
      {problems.map((p, i) => (
        <div
          key={i}
          className="flex items-start gap-2 px-3 py-1.5 hover:bg-[#2a2d2e] cursor-pointer"
          style={{ borderBottom: "1px solid #1a1a1a" }}
        >
          <span style={{ color: p.type === "warning" ? "#cca700" : "#75BEFF", flexShrink: 0, marginTop: "1px" }}>
            {p.type === "warning" ? <AlertCircle size={14} /> : <Info size={14} />}
          </span>
          <div>
            <span style={{ fontSize: "13px", color: "#cccccc" }}>{p.msg}</span>
            <span style={{ fontSize: "11px", color: "#858585", marginLeft: "8px" }}>
              {p.file}:{p.line}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function OutputTab({
  logs,
  isCompiling,
}: {
  logs: { type: string; text: string }[];
  isCompiling: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const COLOR: Record<string, string> = {
    info: "#9CDCFE",
    success: "#4EC9B0",
    error: "#F44747",
  };

  return (
    <div
      className="flex-1 overflow-y-auto p-2"
      style={{ fontFamily: "'Consolas','Courier New',monospace", fontSize: "13px", scrollbarWidth: "thin", scrollbarColor: "#424242 transparent" }}
    >
      {logs.map((log, i) => (
        <div key={i} style={{ color: COLOR[log.type] || "#cccccc", lineHeight: "20px" }}>
          {log.type === "success" && (
            <span style={{ color: "#4EC9B0", marginRight: "6px" }}>✓</span>
          )}
          {log.text}
        </div>
      ))}
      {isCompiling && (
        <div style={{ color: "#9CDCFE" }} className="animate-pulse">
          ▶ Compiling...
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function TerminalTab() {
  const [history, setHistory] = useState([
    { type: "prompt", text: "$ " },
    { type: "output", text: "Arduino IDE Terminal v2.3.2" },
    { type: "output", text: "Type 'help' for available commands." },
    { type: "prompt", text: "$ " },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleCommand = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      const cmd = input.trim();
      const responses: Record<string, string[]> = {
        help: ["Available commands: help, clear, version, list-boards, list-ports"],
        version: ["Arduino IDE v2.3.2 (VS Code Edition)"],
        "list-boards": ["Arduino Uno", "Arduino Nano", "Arduino Mega 2560", "ESP32 Dev Module"],
        "list-ports": ["COM3 (Arduino Uno)", "COM4", "/dev/ttyUSB0"],
        clear: [],
      };

      if (cmd === "clear") {
        setHistory([{ type: "prompt", text: "$ " }]);
      } else {
        const response = responses[cmd] || [`Command not found: ${cmd}`];
        setHistory((h) => [
          ...h,
          { type: "input", text: cmd },
          ...response.map((r) => ({ type: "output", text: r })),
          { type: "prompt", text: "$ " },
        ]);
      }
      setInput("");
    }
  };

  return (
    <div
      className="flex-1 overflow-y-auto p-2 flex flex-col"
      style={{
        fontFamily: "'Consolas','Courier New',monospace",
        fontSize: "13px",
        scrollbarWidth: "thin",
        scrollbarColor: "#424242 transparent",
      }}
    >
      {history.map((h, i) => {
        if (h.type === "prompt" && i === history.length - 1) {
          return (
            <div key={i} className="flex items-center">
              <span style={{ color: "#73C991" }}>$ </span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleCommand}
                className="flex-1 bg-transparent outline-none"
                style={{ color: "#cccccc", fontSize: "13px", fontFamily: "inherit", caretColor: "#aeafad" }}
                autoFocus
              />
            </div>
          );
        }
        return (
          <div key={i} style={{ color: h.type === "input" ? "#cccccc" : h.type === "prompt" ? "#73C991" : "#858585", lineHeight: "20px" }}>
            {h.type === "prompt" && <span style={{ color: "#73C991" }}>$ </span>}
            {h.text}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

function SerialMonitorTab() {
  const [messages, setMessages] = useState(serialMessages);
  const [input, setInput] = useState("");
  const [baud, setBaud] = useState("9600");
  const [autoscroll, setAutoscroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoscroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, autoscroll]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}`;
    setMessages((m) => [...m, { time, type: "sent", text: `> ${input}` }]);
    setInput("");
  };

  const TYPE_COLORS: Record<string, string> = {
    info: "#75BEFF",
    output: "#cccccc",
    error: "#F44747",
    sent: "#73C991",
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Controls */}
      <div
        className="flex items-center gap-2 px-2 py-1 flex-shrink-0"
        style={{ borderBottom: "1px solid #1e1e1e", background: "#252526" }}
      >
        <div className="flex items-center gap-1">
          <span style={{ fontSize: "11px", color: "#858585" }}>Baud:</span>
          <select
            value={baud}
            onChange={(e) => setBaud(e.target.value)}
            className="bg-transparent outline-none"
            style={{ fontSize: "11px", color: "#cccccc", border: "1px solid #555", background: "#3c3c3c", padding: "1px 4px" }}
          >
            {["300", "1200", "2400", "4800", "9600", "19200", "38400", "57600", "115200"].map((b) => (
              <option key={b} value={b} style={{ background: "#252526" }}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={autoscroll}
            onChange={(e) => setAutoscroll(e.target.checked)}
            style={{ accentColor: "#007acc" }}
          />
          <span style={{ fontSize: "11px", color: "#858585" }}>Autoscroll</span>
        </label>
        <div className="flex-1" />
        <button
          onClick={() => setMessages([])}
          className="flex items-center gap-1 px-2 py-0.5 hover:bg-[#3c3c3c] rounded"
          style={{ fontSize: "11px", color: "#858585" }}
          title="Clear"
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>
      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-2 py-1"
        style={{
          fontFamily: "'Consolas','Courier New',monospace",
          fontSize: "13px",
          scrollbarWidth: "thin",
          scrollbarColor: "#424242 transparent",
        }}
      >
        {messages.map((msg, i) => (
          <div key={i} className="flex gap-2" style={{ lineHeight: "20px" }}>
            <span style={{ color: "#555", flexShrink: 0, minWidth: "90px" }}>{msg.time}</span>
            <span style={{ color: TYPE_COLORS[msg.type] || "#cccccc" }}>{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {/* Input */}
      <div
        className="flex items-center gap-2 px-2 py-1 flex-shrink-0"
        style={{ borderTop: "1px solid #1e1e1e", background: "#252526" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Send message..."
          className="flex-1 bg-transparent outline-none"
          style={{
            fontSize: "13px",
            color: "#cccccc",
            fontFamily: "'Consolas','Courier New',monospace",
            border: "1px solid #555",
            background: "#3c3c3c",
            padding: "2px 8px",
          }}
        />
        <button
          onClick={sendMessage}
          className="flex items-center gap-1 px-3 py-1 rounded"
          style={{ background: "#007acc", color: "white", fontSize: "12px" }}
        >
          <Send size={12} /> Send
        </button>
      </div>
    </div>
  );
}

export function BottomPanel({
  isVisible,
  onClose,
  compileLogs,
  isCompiling,
  activeTab,
  onTabChange,
  darkMode = true,
}: BottomPanelProps) {
  if (!isVisible) return null;
  const dm = darkMode;

  const tabs: { id: PanelTab; label: string }[] = [
    { id: "problems", label: "Problems" },
    { id: "output", label: "Output" },
    { id: "terminal", label: "Terminal" },
    { id: "serial", label: "Serial Monitor" },
  ];

  return (
    <div
      className="flex flex-col"
      style={{ background: dm ? "#1e1e1e" : "#ffffff", borderTop: dm ? "1px solid #333" : "1px solid #d0d0d0" }}
    >
      {/* Panel Header */}
      <div
        className="flex items-center flex-shrink-0"
        style={{ background: dm ? "#252526" : "#f0f0f0", borderBottom: dm ? "1px solid #1e1e1e" : "1px solid #d0d0d0", height: "35px" }}
      >
        <div className="flex items-end h-full">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className="px-4 h-full text-sm transition-colors relative"
              style={{
                fontSize: "12px",
                color: activeTab === t.id ? (dm ? "#cccccc" : "#333") : (dm ? "#858585" : "#888"),
                borderBottom: activeTab === t.id ? "1px solid #007acc" : "1px solid transparent",
                background: activeTab === t.id ? (dm ? "#1e1e1e" : "#ffffff") : "transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center px-2 gap-1">
          <button
            onClick={onClose}
            className={`flex items-center justify-center rounded ${dm ? 'hover:bg-[#3c3c3c]' : 'hover:bg-[#e0e0e0]'}`}
            style={{ width: "20px", height: "20px", color: dm ? "#858585" : "#888" }}
            title="Close Panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex flex-col overflow-hidden" style={{ height: "200px" }}>
        {activeTab === "problems" && <ProblemsTab />}
        {activeTab === "output" && <OutputTab logs={compileLogs} isCompiling={isCompiling} />}
        {activeTab === "terminal" && <TerminalTab />}
        {activeTab === "serial" && <SerialMonitorTab />}
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import {
  Send, ChevronRight, Bot, User, Code2,
  Zap, Clipboard, RotateCcw, PanelRightClose, PanelRightOpen,
  Camera
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: string;
  isCode?: boolean;
}

interface AIPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, model?: string) => void;
  onVisualQA?: (prompt: string) => void;
  onBuild?: () => void;
  onCanvasJsonInteract?: (prompt: string, model?: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  darkMode?: boolean;
}

const suggestedPrompts = [
  'Wire components for me',
  'Generate C++ code',
  'Check for errors',
  'Explain this circuit',
];

const localModels = [
  { id: 'gemma3:latest', label: 'Gemma 3', tag: 'Local (Ollama)' },
  { id: 'gemma3:4b', label: 'Gemma 3 4B', tag: 'Local (Ollama)' },
  { id: 'gemma3:12b', label: 'Gemma 3 12B', tag: 'Local (Ollama)' },
];

export function AIPanel({ messages, onSendMessage, onVisualQA, onBuild, onCanvasJsonInteract, collapsed, onToggleCollapse, darkMode }: AIPanelProps) {
  const dm = darkMode;
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemma3:latest');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput('');
    setIsTyping(true);
    onSendMessage(trimmed, selectedModel);
    setTimeout(() => setIsTyping(false), 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Collapsed: just show a thin vertical tab to re-open
  if (collapsed) {
    return (
      <div className={`shrink-0 flex flex-col items-center border-l w-[36px] ${dm ? 'bg-[#1e1e1e] border-[#333]' : 'bg-[#f0f0f2] border-[#d0d0d0]'}`}>
        <button
          onClick={onToggleCollapse}
          className={`mt-2 p-1.5 rounded transition-colors ${dm ? 'hover:bg-[#333] text-[#999]' : 'hover:bg-[#e0e0e0] text-[#666]'}`}
          title="Open AI Panel"
        >
          <PanelRightOpen size={16} />
        </button>
        <div className="flex-1 flex items-center justify-center">
          <p className={`text-[11px] whitespace-nowrap ${dm ? 'text-[#777]' : 'text-[#aaa]'}`} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            Local AI Agent
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-[300px] shrink-0 flex flex-col overflow-hidden shadow-sm ${dm ? 'bg-[#1e1e1e] border-l border-[#333]' : 'bg-[#fafafa] border-l border-[#d0d0d0]'}`}
      style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
    >
      {/* Panel Header */}
      <div className={`flex items-center h-[34px] px-3 border-b shrink-0 ${dm ? 'bg-gradient-to-r from-[#2a2a2a] to-[#252525] border-[#333]' : 'bg-gradient-to-r from-[#f0f0f0] to-[#e8e8e8] border-[#c8c8c8]'}`}>
        <div className="flex items-center gap-2">
          <div className="w-[20px] h-[20px] rounded-full bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] flex items-center justify-center shadow-sm">
            <Bot size={11} className="text-white" />
          </div>
          <span className={`text-[12px] font-semibold ${dm ? 'text-[#e0e0e0]' : 'text-[#1a1a1a]'}`}>Local AI Agent</span>
          <div className="w-2 h-2 rounded-full bg-emerald-500 ml-0.5 animate-pulse" title="Online" />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            className={`p-1 rounded ${dm ? 'hover:bg-[#333] text-[#999]' : 'hover:bg-[#ddd] text-[#666]'}`}
            onClick={onToggleCollapse}
            title="Close Panel"
          >
            <PanelRightClose size={14} />
          </button>
        </div>
      </div>

      {/* Model/Context badge */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b shrink-0 ${dm ? 'bg-[#252525] border-[#333]' : 'bg-[#f5f5f7] border-[#e4e4e4]'}`}>
        <span className={`text-[10px] font-medium ${dm ? 'text-[#777]' : 'text-[#999]'}`}>Model:</span>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className={`text-[10px] border px-1.5 py-0.5 rounded shadow-sm outline-none cursor-pointer hover:border-[#1565c0] focus:border-[#1565c0] focus:ring-1 focus:ring-[#1565c0]/20 transition-colors ${dm ? 'bg-[#2a2a2a] border-[#444] text-[#ccc]' : 'bg-white border-[#d4d4d4] text-[#555]'}`}
        >
          {localModels.map(m => (
            <option key={m.id} value={m.id}>
              {m.label} ({m.tag})
            </option>
          ))}
        </select>

      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#c0c0c0 transparent' }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Role label */}
            <div className={`flex items-center gap-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'ai'
                    ? 'bg-gradient-to-br from-[#4285f4] to-[#8b5cf6]'
                    : 'bg-[#1565c0]'
                }`}
              >
                {msg.role === 'ai' ? <Bot size={10} className="text-white" /> : <User size={10} className="text-white" />}
              </div>
              <span className={`text-[10px] ${dm ? 'text-[#777]' : 'text-[#999]'}`}>{msg.timestamp}</span>
            </div>

            {/* Message bubble */}
            <div
              className={`max-w-[240px] px-3 py-2.5 text-[12px] leading-relaxed shadow-sm ${
                msg.role === 'ai'
                  ? dm ? 'bg-[#2a2a1e] border border-[#4a4520] text-[#e0d080] rounded-[8px] rounded-tl-[2px]' : 'bg-[#fffef5] border border-[#ece3a0] text-[#3a3200] rounded-[8px] rounded-tl-[2px]'
                  : 'bg-gradient-to-br from-[#1565c0] to-[#1255a3] text-white rounded-[8px] rounded-tr-[2px]'
              }`}
            >
              {msg.isCode ? (
                <pre className="font-mono text-[10px] overflow-x-auto whitespace-pre-wrap">{msg.content}</pre>
              ) : (
                msg.content
              )}
            </div>

            {/* AI message actions */}
            {msg.role === 'ai' && (
              <div className="flex items-center gap-2 ml-1">
                <button
                  className={`flex items-center gap-1 text-[10px] ${dm ? 'text-[#666] hover:text-[#ccc]' : 'text-[#aaa] hover:text-[#666]'}`}
                  title="Copy"
                  onClick={() => {
                    navigator.clipboard.writeText(msg.content);
                  }}
                >
                  <Clipboard size={10} />
                  Copy
                </button>
                <button className={`flex items-center gap-1 text-[10px] ${dm ? 'text-[#666] hover:text-[#ccc]' : 'text-[#aaa] hover:text-[#666]'}`} title="Regenerate">
                  <RotateCcw size={10} />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start gap-1.5">
            <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] flex items-center justify-center shrink-0">
              <Bot size={10} className="text-white" />
            </div>
            <div className={`border px-3 py-2 rounded-[4px] rounded-tl-none ${dm ? 'bg-[#2a2a1e] border-[#4a4520]' : 'bg-[#fefce8] border-[#e9d66b]'}`}>
              <div className="flex gap-1 items-center h-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#888] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#888] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#888] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts */}
      <div className={`px-3 pb-2 flex flex-wrap gap-1.5 shrink-0 border-t pt-2 ${dm ? 'border-[#333]' : 'border-[#e0e0e0]'}`}>
        <span className={`w-full text-[10px] mb-0.5 flex items-center gap-1 ${dm ? 'text-[#666]' : 'text-[#aaa]'}`}><Zap size={9} />Quick actions:</span>
        {suggestedPrompts.map((p) => (
          <button
            key={p}
            className={`text-[10px] px-2 py-0.5 border rounded-full transition-colors ${dm ? 'border-[#444] bg-[#2a2a2a] hover:bg-[#1e3a5f] hover:border-[#4285f4] hover:text-[#7abaff] text-[#999]' : 'border-[#ccc] bg-white hover:bg-[#e8f0fe] hover:border-[#4285f4] hover:text-[#1565c0] text-[#555]'}`}
            onClick={() => onSendMessage(p, selectedModel)}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className={`border-t px-2.5 pt-2.5 pb-2.5 shrink-0 ${dm ? 'border-[#333] bg-[#252525]' : 'border-[#d4d4d4] bg-[#f5f5f7]'}`}>
        <div className={`flex items-end gap-2 border rounded-lg px-3 py-2 focus-within:border-[#4285f4] focus-within:shadow-[0_0_0_2px_rgba(66,133,244,0.12)] transition-all duration-150 ${dm ? 'bg-[#2a2a2a] border-[#444]' : 'bg-white border-[#c8c8c8]'}`}>
          <button
            onClick={() => {
               if (onVisualQA) onVisualQA(input.trim() || "Please analyze this circuit.");
               setInput("");
            }}
            title="Analyze screenshot of circuit with local model"
            className={`shrink-0 flex items-center justify-center p-1.5 rounded-md transition-colors duration-150 ${dm ? 'text-[#888] hover:text-[#fff] hover:bg-[#444]' : 'text-[#888] hover:text-[#333] hover:bg-[#e8e8e8]'}`}
          >
            <Camera size={14} />
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            className={`flex-1 bg-transparent outline-none text-[12px] resize-none ${dm ? 'text-[#ccc] placeholder-[#666]' : 'text-[#1a1a1a] placeholder-[#bbb]'}`}
            placeholder="Ask local Gemma..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ maxHeight: '80px', minHeight: '20px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] transition-all duration-150 font-medium ${
              input.trim()
                ? 'bg-[#1565c0] text-white hover:bg-[#1254a3] shadow-sm'
                : dm ? 'bg-[#333] text-[#666] cursor-not-allowed' : 'bg-[#e8e8e8] text-[#bbb] cursor-not-allowed'
            }`}
          >
            <Send size={12} />
            Send
          </button>
        </div>
        <p className={`text-[10px] mt-1.5 text-center ${dm ? 'text-[#555]' : 'text-[#ccc]'}`}>Shift+Enter for new line</p>
      </div>

      {/* Builder action buttons */}
      <div className="px-3 pb-3 pt-1.5 shrink-0 space-y-2">
        <button
          onClick={() => {
            if (!onCanvasJsonInteract) return;
            onCanvasJsonInteract(input.trim() || 'Analyze canvas JSON and apply required wiring/code changes.', selectedModel);
            setInput('');
          }}
          className="w-full h-[34px] flex items-center justify-center gap-2 bg-gradient-to-b from-[#1f3a2d] to-[#173025] text-white text-[12px] font-semibold rounded-lg hover:from-[#28523e] hover:to-[#1f4634] transition-all duration-150 shadow-md"
          title="Use dedicated canvas JSON interaction"
        >
          <Code2 size={13} className="text-[#8cf5be]" />
          Canvas JSON Agent
        </button>
        <button
          onClick={onBuild}
          className="w-full h-[36px] flex items-center justify-center gap-2 bg-gradient-to-b from-[#1a1a2e] to-[#16213e] text-white text-[13px] font-semibold rounded-lg hover:from-[#2a2a3e] hover:to-[#26314e] transition-all duration-150 shadow-md group"
        >
          <Code2 size={14} className="text-[#7fdbff]" />
          Build Project
        </button>
      </div>
    </div>
  );
}

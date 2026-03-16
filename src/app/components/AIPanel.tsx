import { useState, useRef, useEffect } from 'react';
import {
  Send, ChevronRight, User, Code2,
  Zap, Clipboard, RotateCcw, PanelRightClose, PanelRightOpen,
  Camera, Plus, Sparkles, MoreHorizontal, History
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
  onClearChat?: () => void;
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
  { id: 'gemma3:latest', label: 'Gemma 3', tag: 'Local' },
  { id: 'gemma3:4b', label: 'Gemma 3 4B', tag: 'Local' },
  { id: 'gemma3:12b', label: 'Gemma 3 12B', tag: 'Local' },
];

export function AIPanel({ 
  messages, onSendMessage, onVisualQA, onBuild, 
  onCanvasJsonInteract, onClearChat, collapsed, 
  onToggleCollapse, darkMode 
}: AIPanelProps) {
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

  if (collapsed) {
    return (
      <div className={`shrink-0 flex flex-col items-center border-l w-[44px] transition-all duration-300 ${dm ? 'bg-[#0f0f10] border-[#222]' : 'bg-[#f8f9fa] border-[#e0e0e0]'}`}>
        <button
          onClick={onToggleCollapse}
          className={`mt-4 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group relative
            ${dm ? 'hover:bg-[#222]' : 'hover:bg-[#eee]'}`}
          title="Open Gemini AI"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
          <Sparkles size={20} className="text-blue-500 group-hover:scale-110 transition-transform" />
        </button>
        <div className="flex-1 flex items-center justify-center pt-4">
          <p className={`text-[10px] font-bold tracking-[0.2em] whitespace-nowrap ${dm ? 'text-[#333]' : 'text-[#ccc]'}`} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            GEMINI AI
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-[320px] shrink-0 flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${dm ? 'bg-[#0f0f10] border-l border-[#222]' : 'bg-[#ffffff] border-l border-[#e5e7eb]'}`}
      style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}
    >
      {/* Premium Header */}
      <div className={`flex items-center justify-between h-[56px] px-4 shrink-0 border-b ${dm ? 'border-[#222]' : 'border-[#f1f1f1]'}`}>
        <div className="flex items-center gap-2.5">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
            <div className={`relative w-[28px] h-[28px] flex items-center justify-center`}>
              <Sparkles size={20} className="text-blue-500 group-hover:text-blue-400 transition-colors" />
            </div>
            <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border-2 border-black" />
          </div>
          <div className="flex flex-col">
            <span className={`text-[13px] font-bold tracking-tight ${dm ? 'text-white' : 'text-[#1a1a1b]'}`}>Gemini AI</span>
            <div className="flex items-center gap-1">
               <span className="text-[9px] font-medium text-emerald-500 uppercase tracking-widest">Active</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onClearChat}
            className={`p-2 rounded-lg transition-all duration-200 ${dm ? 'hover:bg-[#222] text-[#888] hover:text-white' : 'hover:bg-[#f3f4f6] text-[#666] hover:text-[#111]'}`}
            title="Start New Chat"
          >
            <Plus size={16} />
          </button>
          <button
            className={`p-2 rounded-lg transition-all duration-200 ${dm ? 'hover:bg-[#222] text-[#888] hover:text-white' : 'hover:bg-[#f3f4f6] text-[#666] hover:text-[#111]'}`}
            onClick={onToggleCollapse}
            title="Collapse"
          >
            <PanelRightClose size={16} />
          </button>
        </div>
      </div>

      {/* Modern Model Selector */}
      <div className={`px-4 py-2 flex items-center justify-between ${dm ? 'bg-[#161618]/50' : 'bg-gray-50/50'}`}>
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${dm ? 'bg-[#222] border-[#333] text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
            {selectedModel.split(':')[0]}
          </div>
        </div>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className={`text-[11px] font-medium bg-transparent outline-none cursor-pointer ${dm ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}
        >
          {localModels.map(m => (
            <option key={m.id} value={m.id} className={dm ? 'bg-[#161618]' : 'bg-white'}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Messages area with Glassmorphism influence */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-6"
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className={`flex items-center gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`w-[22px] h-[22px] rounded-full flex items-center justify-center ring-2 shrink-0 ${
                  msg.role === 'ai'
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 ring-blue-500/20'
                    : 'bg-[#333] ring-gray-500/20'
                }`}
              >
                {msg.role === 'ai' ? <Sparkles size={11} className="text-white" /> : <User size={11} className="text-white" />}
              </div>
              <span className={`text-[10px] font-medium ${dm ? 'text-[#555]' : 'text-[#999]'}`}>{msg.timestamp}</span>
            </div>

            <div
              className={`relative group px-4 py-3 text-[13px] leading-[1.6] shadow-sm max-w-[90%] ${
                msg.role === 'ai'
                  ? dm 
                    ? 'bg-[#161618] border border-white/5 text-[#d1d5db] rounded-2xl rounded-tl-none' 
                    : 'bg-white border border-gray-100 text-[#374151] rounded-2xl rounded-tl-none ring-1 ring-black/[0.02]'
                  : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-none shadow-blue-500/10'
              }`}
            >
              {msg.isCode ? (
                <div className="relative">
                  <pre className={`font-mono text-[11px] overflow-x-auto p-3 rounded-lg my-1 ${dm ? 'bg-black/40' : 'bg-gray-900 text-gray-100'}`}>
                    <code>{msg.content}</code>
                  </pre>
                  <button 
                    onClick={() => navigator.clipboard.writeText(msg.content)}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <Clipboard size={12} className="text-white/70" />
                  </button>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
              
              {msg.role === 'ai' && (
                <div className="absolute -bottom-6 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 left-0">
                  <button onClick={() => navigator.clipboard.writeText(msg.content)} className={`p-1 hover:text-blue-500 transition-colors ${dm ? 'text-gray-600' : 'text-gray-400'}`}>
                    <Clipboard size={12} />
                  </button>
                  <button className={`p-1 hover:text-blue-500 transition-colors ${dm ? 'text-gray-600' : 'text-gray-400'}`}>
                    <RotateCcw size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center ring-2 ring-blue-500/20">
                <Sparkles size={11} className="text-white" />
              </div>
            </div>
            <div className={`w-[60px] h-[34px] flex items-center justify-center rounded-2xl rounded-tl-none ${dm ? 'bg-[#161618] border border-white/5' : 'bg-white border border-gray-100'}`}>
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60 animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60 animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60 animate-bounce" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Glass-inspired Input Area */}
      <div className={`p-4 mt-auto border-t space-y-4 ${dm ? 'border-[#222] bg-[#0f0f10]' : 'border-gray-100 bg-white'}`}>
        {/* Suggested Prompts */}
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((p) => (
            <button
              key={p}
              className={`text-[10px] px-3 py-1.5 rounded-full border transition-all duration-200 ${dm ? 'border-[#222] bg-[#161618] text-gray-400 hover:text-white hover:border-[#444]' : 'border-gray-200 bg-white text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50'}`}
              onClick={() => onSendMessage(p, selectedModel)}
            >
              {p}
            </button>
          ))}
        </div>

        <div className={`relative group p-1 rounded-2xl transition-all duration-300 ${dm ? 'bg-[#1a1a1c] ring-1 ring-white/5' : 'bg-gray-50 ring-1 ring-black/[0.05] hover:ring-blue-100'}`}>
          <textarea
            ref={inputRef}
            rows={1}
            className={`w-full bg-transparent px-4 pt-3 pb-12 outline-none text-[13px] leading-relaxed resize-none ${dm ? 'text-gray-200 placeholder-gray-600' : 'text-gray-800 placeholder-gray-400'}`}
            placeholder="Describe your design..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ maxHeight: '120px', minHeight: '44px' }}
          />
          
          <div className="absolute bottom-3 left-3 flex gap-1">
            <button
               onClick={() => {
                  if (onVisualQA) onVisualQA(input.trim() || "Please analyze this circuit.");
                  setInput("");
               }}
               className={`p-2 rounded-xl transition-all ${dm ? 'hover:bg-[#222] text-[#666] hover:text-white' : 'hover:bg-white text-gray-400 hover:text-blue-600 shadow-sm'}`}
            >
              <Camera size={16} />
            </button>
            <div className={`w-[1px] my-1 ${dm ? 'bg-[#222]' : 'bg-gray-200'}`} />
            <button
              onClick={() => {
                if (!onCanvasJsonInteract) return;
                onCanvasJsonInteract(input.trim() || 'Analyze and update canvas state', selectedModel);
                setInput('');
              }}
              className={`p-2 rounded-xl transition-all ${dm ? 'hover:bg-[#222] text-[#666] hover:text-white' : 'hover:bg-white text-gray-400 hover:text-emerald-500 shadow-sm'}`}
              title="Canvas JSON Mode"
            >
              <History size={16} />
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={`absolute bottom-3 right-3 p-2.5 rounded-xl transition-all duration-300 ${
              input.trim()
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 hover:scale-105 active:scale-95'
                : dm ? 'bg-[#222] text-[#444] shadow-none' : 'bg-gray-200 text-gray-400 opacity-50'
            }`}
          >
            <Send size={16} />
          </button>
        </div>
        
        <div className="flex gap-2 pb-2">
            <button
              onClick={onBuild}
              className={`flex-1 h-[38px] flex items-center justify-center gap-2 rounded-xl text-[12px] font-bold transition-all duration-300 ${dm ? 'bg-[#161618] border border-white/5 text-gray-400 hover:text-white hover:bg-[#222]' : 'bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-100 shadow-sm hover:shadow-md'}`}
            >
              <Code2 size={14} />
              Build Project
            </button>
        </div>
      </div>
    </div>
  );
}

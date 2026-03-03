import { useState, useRef, useEffect, type FormEvent } from "react";
import { AGENT_PANEL_WIDTH } from "../../constants/config";

interface ChatMessage {
  role: "agent" | "user";
  text: string;
  timestamp: number;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "agent",
    text: "👋 Welcome! I'm here to help you design circuits, debug issues, and generate code.",
    timestamp: Date.now(),
  },
];

const SUGGESTED_PROMPTS = [
  { icon: "⚡", text: "Design a LED circuit" },
  { icon: "💻", text: "Generate code" },
  { icon: "🔍", text: "Check for errors" },
  { icon: "✨", text: "Optimize circuit" },
];

export default function GeminiAgent({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: FormEvent, text?: string) => {
    e.preventDefault();
    const messageText = (text || input).trim();
    if (!messageText || isLoading) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: messageText, timestamp: Date.now() },
    ]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => {
      const responses = [
        "Great question! I'd recommend connecting the positive terminal to pin 5 and ground to GND.",
        "Perfect! Here's the C++ code for your circuit:\n\nvoid setup() { pinMode(5, OUTPUT); }\nvoid loop() { digitalWrite(5, HIGH); delay(1000); digitalWrite(5, LOW); }",
        "Your circuit looks good! The connection is correct and voltage is stable at 5V.",
        "Good idea! Adding a 10K pull-up resistor will improve signal stability.",
      ];

      const randomIndex = Math.floor(Math.random() * responses.length);
      const randomResponse = responses[randomIndex] as string;

      setMessages((prev) => [
        ...prev,
        { role: "agent", text: randomResponse, timestamp: Date.now() },
      ]);
      setIsLoading(false);
    }, 1200);
  };

  const handleClearChat = () => {
    setMessages(INITIAL_MESSAGES);
    setInput("");
  };

  return (
    <aside
      style={{ width: open ? AGENT_PANEL_WIDTH : 50 }}
      className="flex flex-col h-full bg-vs-dark-600 border-l border-gray-800 shrink-0 transition-all duration-300 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-800 shrink-0">
        {open && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">🤖</span>
            <div className="min-w-0">
              <h2 className="text-xs font-semibold text-gray-100 truncate">Gemini AI</h2>
              <p className="text-[10px] text-gray-500 truncate">Assistant</p>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors"
        >
          {open ? "✕" : "◄"}
        </button>
      </div>

      {/* Content */}
      {open && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 flex flex-col">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "agent" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded text-xs leading-relaxed break-words ${
                    msg.role === "agent"
                      ? "bg-gray-800 text-gray-300 border border-gray-700"
                      : "bg-accent-blue text-white"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded bg-gray-800 border border-gray-700">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-accent-blue rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-accent-blue rounded-full animate-pulse delay-100"></div>
                    <div className="w-2 h-2 bg-accent-blue rounded-full animate-pulse delay-200"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length === 1 && !isLoading && (
            <div className="px-3 py-2 space-y-2 border-t border-gray-800">
              <p className="text-[10px] font-semibold text-gray-500 uppercase">Suggestions</p>
              {SUGGESTED_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={(e) => handleSend(e, p.text)}
                  className="w-full text-left text-xs px-2 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                >
                  {p.icon} {p.text}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSend} className="px-3 py-2 border-t border-gray-800 shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask…"
                disabled={isLoading}
                className="flex-1 px-2 py-1.5 text-xs rounded bg-gray-800 border border-gray-700
                           text-gray-100 placeholder-gray-500
                           focus:outline-none focus:ring-1 focus:ring-accent-blue
                           disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-2 py-1.5 text-xs font-semibold text-white bg-accent-blue hover:bg-accent-blue-hover rounded transition-colors disabled:opacity-50"
              >
                {isLoading ? "…" : "↑"}
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="px-3 py-2 border-t border-gray-800 shrink-0 space-y-2">
            <button
              onClick={handleClearChat}
              className="w-full py-1.5 text-xs font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
            >
              Clear
            </button>
            <button className="w-full py-1.5 text-xs font-semibold text-white bg-accent-blue hover:bg-accent-blue-hover rounded transition-colors">
              🔨 Build
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

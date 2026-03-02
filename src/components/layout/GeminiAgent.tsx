import { useState, type FormEvent } from "react";
import { AGENT_PANEL_WIDTH } from "../../constants/config";

interface ChatMessage {
  role: "agent" | "user";
  text: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "agent",
    text: "Hello! I can help you wire these components or generate the C++ code for your blocks.",
  },
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

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    // Placeholder auto-reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: "I'm thinking about that... (Gemini API will be connected here)" },
      ]);
    }, 600);
  };

  return (
    <aside
      style={{ width: open ? AGENT_PANEL_WIDTH : 40 }}
      className="flex flex-col h-full bg-white border-l border-surface-border shrink-0 transition-all duration-300 overflow-hidden"
    >
      {/* Header — always visible; shows title only when open */}
      <div className={`flex items-center ${open ? "justify-between px-4" : "justify-center"} py-3 border-b border-surface-border shrink-0`}>
        {open && <h2 className="text-sm font-bold text-gray-700 whitespace-nowrap">Gemini Live Agent</h2>}
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
          title="Toggle agent panel"
        >
          ☰
        </button>
      </div>

      {/* Content only when open */}
      {open && (
        <>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`
              max-w-[90%] px-3 py-2 rounded-lg text-xs leading-relaxed
              ${
                msg.role === "agent"
                  ? "bg-cream-200 text-gray-600 self-start mr-auto"
                  : "bg-blue-50 text-gray-700 self-end ml-auto"
              }
            `}
          >
            {msg.text}
          </div>
        ))}
      </div>

      {/* Chat input */}
      <form onSubmit={handleSend} className="px-4 py-2 border-t border-surface-border shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Gemini…"
            className="flex-1 px-3 py-1.5 text-xs rounded bg-cream-50 border border-gray-300
                       text-gray-700 placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors"
          >
            Send
          </button>
        </div>
      </form>

      {/* Build button */}
      <div className="px-4 py-3 border-t border-surface-border shrink-0">
        <button className="w-full py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors">
          Build Project
        </button>
      </div>
      </>
      )}
    </aside>
  );
}

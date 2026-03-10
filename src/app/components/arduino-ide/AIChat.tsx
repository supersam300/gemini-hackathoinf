import React, { useState, useRef, useEffect } from "react";
import {
  X, Send, Paperclip, Trash2, Zap, Code, AlertCircle,
  Cpu, ChevronDown, Bot, User, FileCode, Image, File,
  Sparkles, Loader, MessageSquare, Mic, MoreHorizontal,
  Plus, History, Settings,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: AttachedFile[];
  timestamp: Date;
  isStreaming?: boolean;
}

interface AttachedFile {
  name: string;
  type: string;
  size: string;
}

const SUGGESTIONS = [
  { icon: "🔌", label: "Design a LED circuit",  prompt: "Help me design a simple LED blinking circuit with Arduino Uno and a 220Ω resistor" },
  { icon: "📄", label: "Generate code",           prompt: "Generate Arduino code for reading a DHT22 temperature sensor and displaying values on Serial Monitor" },
  { icon: "🔴", label: "Check for errors",        prompt: "What are common mistakes when connecting components to Arduino that could damage the board?" },
  { icon: "⚡", label: "Optimize circuit",        prompt: "How can I optimize power consumption in my Arduino project running on battery?" },
  { icon: "🔧", label: "Debug help",              prompt: "My LED is not turning on even though the code looks correct. What should I check?" },
  { icon: "📚", label: "Library guide",           prompt: "Which libraries should I use for an Arduino project with OLED display, WiFi, and sensor data logging?" },
];

const MOCK_RESPONSES: Record<string, string> = {
  default: `I'm your Arduino AI assistant! I can help you:

• **Design circuits** — Component selection, wiring diagrams, safety checks
• **Write code** — Sketch generation, library recommendations, debugging
• **Optimize** — Power consumption, timing, memory usage
• **Troubleshoot** — Common errors, wiring mistakes, serial debugging

What would you like to build today? 🚀`,

  led: `Here's a simple LED blink circuit:

**Components needed:**
- Arduino Uno
- LED (any color)
- 220Ω resistor
- Breadboard + jumper wires

**Wiring:**
1. Connect resistor to Arduino **D13**
2. Connect LED **anode (+)** to resistor
3. Connect LED **cathode (−)** to **GND**

**Generated Code:**
\`\`\`cpp
#define LED_PIN 13

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH); // ON
  delay(1000);
  digitalWrite(LED_PIN, LOW);  // OFF
  delay(1000);
}
\`\`\`

💡 Tip: Use the Canvas to drag components and auto-generate this code!`,

  servo: `**Servo Motor Control**

\`\`\`cpp
#include <Servo.h>

Servo myServo;
const int SERVO_PIN = 9;

void setup() {
  myServo.attach(SERVO_PIN);
  Serial.begin(9600);
}

void loop() {
  // Sweep 0° to 180°
  for (int pos = 0; pos <= 180; pos++) {
    myServo.write(pos);
    delay(15);
  }
  // Sweep back
  for (int pos = 180; pos >= 0; pos--) {
    myServo.write(pos);
    delay(15);
  }
}
\`\`\`

**Pin connections:**
- Signal (orange) → D9
- VCC (red) → 5V
- GND (brown) → GND

⚠️ Use external power supply for heavy servos!`,

  sensor: `**DHT22 Temperature & Humidity Sensor**

\`\`\`cpp
#include <DHT.h>

#define DHT_PIN  2
#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
  Serial.println("DHT22 Ready!");
}

void loop() {
  float humidity    = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("[ERROR] Sensor read failed!");
    return;
  }

  Serial.print("Temp: ");
  Serial.print(temperature, 1);
  Serial.print("°C  Humidity: ");
  Serial.print(humidity, 1);
  Serial.println("%");
  delay(2000);
}
\`\`\`

Install **DHT sensor library** by Adafruit from Library Manager.`,

  motor: `**DC Motor with L298N Driver**

\`\`\`cpp
// Motor A pins
const int IN1 = 5;
const int IN2 = 6;
const int ENA = 9; // PWM

void setMotor(int dir, int speed) {
  analogWrite(ENA, speed);
  digitalWrite(IN1, dir == 1 ? HIGH : LOW);
  digitalWrite(IN2, dir == 1 ? LOW  : HIGH);
}

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENA, OUTPUT);
}

void loop() {
  setMotor(1,  200);  // Forward, 78% speed
  delay(2000);
  setMotor(-1, 200);  // Backward
  delay(2000);
  setMotor(0,  0);    // Stop
  delay(1000);
}
\`\`\``,

  debug: `**Common Arduino Debugging Tips:**

🔍 **LED not working?**
1. Check polarity — long leg (anode) to positive
2. Verify resistor value (150–330Ω for 5V)
3. Test LED with 3V coin battery directly
4. Check pin number in code matches wiring

🔋 **Power issues?**
- Never exceed 40mA per pin (200mA total)
- Use external power for motors/servos
- Add 100µF capacitor on power rails

📡 **Serial Monitor tips:**
\`\`\`cpp
Serial.begin(9600);  // Must match Monitor baud rate
Serial.println(value);
Serial.print("Label: "); Serial.println(value);
\`\`\`

🔌 **I2C scanner to find device addresses:**
\`\`\`cpp
#include <Wire.h>
void setup() {
  Wire.begin();
  Serial.begin(9600);
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (!Wire.endTransmission())
      Serial.println(addr, HEX);
  }
}
void loop() {}
\`\`\``,

  optimize: `**Arduino Power Optimization:**

⚡ **Sleep modes:**
\`\`\`cpp
#include <avr/sleep.h>
#include <avr/power.h>

void enterSleep() {
  set_sleep_mode(SLEEP_MODE_POWER_DOWN);
  sleep_enable();
  sleep_mode();         // CPU sleeps here
  sleep_disable();      // Wakes on interrupt
}
\`\`\`

**Power savings checklist:**
- ✅ Use \`SLEEP_MODE_POWER_DOWN\` (saves ~20mA)
- ✅ Disable unused peripherals: \`power_adc_disable()\`
- ✅ Lower clock speed with clock prescaler
- ✅ Use **3.3V Pro Mini** instead of Uno (saves 15mA)
- ✅ Remove power LED and voltage regulator
- ✅ Use **pull-up** inputs instead of pull-down

**Expected battery life (2000mAh):**
| Mode       | Current | Runtime |
|------------|---------|---------|
| Active     | 50mA    | ~40 hrs |
| Idle sleep | 15mA    | ~133 hrs|
| Power down | 0.36mA  | ~230 days|`,

  library: `**Essential Arduino Libraries:**

📦 **Sensors:**
- \`DHT sensor library\` — Temperature/humidity
- \`Adafruit BME280\` — Temp/humidity/pressure
- \`NewPing\` — Ultrasonic distance sensor

📡 **Communication:**
- \`PubSubClient\` — MQTT for IoT
- \`ArduinoJson\` — JSON parsing
- \`Wire\` (built-in) — I2C protocol

🖥️ **Displays:**
- \`Adafruit GFX\` + \`SSD1306\` — OLED 128x64
- \`LiquidCrystal_I2C\` — LCD with I2C backpack
- \`TFT_eSPI\` — TFT color displays

🎮 **Actuators:**
- \`Servo\` (built-in) — Servo motors
- \`FastLED\` — WS2812B LED strips
- \`AccelStepper\` — Stepper motors

Install via: **Tools → Manage Libraries** or use the Library Manager panel on the left! 📚`,
};

function getMockResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("led") || lower.includes("blink") || lower.includes("light"))
    return MOCK_RESPONSES.led;
  if (lower.includes("servo") || lower.includes("motor") || lower.includes("rotate"))
    return lower.includes("dc") ? MOCK_RESPONSES.motor : MOCK_RESPONSES.servo;
  if (lower.includes("sensor") || lower.includes("dht") || lower.includes("temp") || lower.includes("humid"))
    return MOCK_RESPONSES.sensor;
  if (lower.includes("debug") || lower.includes("error") || lower.includes("not work") || lower.includes("fix"))
    return MOCK_RESPONSES.debug;
  if (lower.includes("optim") || lower.includes("power") || lower.includes("battery") || lower.includes("sleep"))
    return MOCK_RESPONSES.optimize;
  if (lower.includes("librar") || lower.includes("package") || lower.includes("install"))
    return MOCK_RESPONSES.library;
  return MOCK_RESPONSES.default;
}

function renderContent(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let codeLang = "";

  const processInline = (str: string, key: number): React.ReactNode => {
    const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return (
      <span key={key}>
        {parts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i} style={{ color: "#cdd6f4" }}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith("`") && part.endsWith("`")) {
            return (
              <code key={i} style={{ background: "#45475a", color: "#89b4fa", padding: "1px 4px", borderRadius: "3px", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>
                {part.slice(1, -1)}
              </code>
            );
          }
          return part;
        })}
      </span>
    );
  };

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (!inCode) {
        inCode = true;
        codeLang = line.slice(3);
        codeLines = [];
      } else {
        elements.push(
          <pre key={`code-${i}`} style={{ background: "#11111b", border: "1px solid #313244", borderRadius: "6px", padding: "10px", margin: "6px 0", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "#cdd6f4", overflowX: "auto", lineHeight: "1.6" }}>
            <div style={{ color: "#585b70", marginBottom: "4px", fontSize: "10px" }}>{codeLang || "code"}</div>
            {codeLines.join("\n")}
          </pre>
        );
        inCode = false;
      }
      return;
    }
    if (inCode) { codeLines.push(line); return; }

    if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(<div key={i} style={{ color: "#bac2de", marginTop: "8px", marginBottom: "2px", fontSize: "12px" }}>{processInline(line, i)}</div>);
    } else if (line.startsWith("- ") || line.startsWith("• ") || line.startsWith("✅") || line.startsWith("⚠️") || line.startsWith("🔍") || line.startsWith("🔋") || line.startsWith("📡") || line.startsWith("🔌")) {
      elements.push(<div key={i} style={{ color: "#a6adc8", paddingLeft: "4px", lineHeight: "1.6", fontSize: "12px" }}>{processInline(line, i)}</div>);
    } else if (line.startsWith("|")) {
      elements.push(<div key={i} style={{ color: "#a6adc8", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", lineHeight: "1.7" }}>{line}</div>);
    } else if (line === "") {
      elements.push(<div key={i} style={{ height: "4px" }} />);
    } else {
      elements.push(<div key={i} style={{ color: "#a6adc8", lineHeight: "1.6", fontSize: "12px" }}>{processInline(line, i)}</div>);
    }
  });

  return <div>{elements}</div>;
}

interface AIChatProps {
  onClose: () => void;
  onBuild?: () => void;
  darkMode?: boolean;
}

export function AIChat({ onClose, onBuild, darkMode = true }: AIChatProps) {
  const dm = darkMode;
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your **Arduino AI assistant**. I can help you design circuits, write code, debug issues, and optimize your projects.\n\nWhat would you like to build?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text?: string) => {
    const content = (text || input).trim();
    if (!content && attachments.length === 0) return;

    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      timestamp: new Date(),
    };

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setAttachments([]);
    setIsTyping(true);
    setShowSuggestions(false);

    const responseText = getMockResponse(content);
    const delay = 800 + Math.random() * 600;

    setTimeout(() => {
      const assistantMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
      };
      setMessages((m) => [...m, assistantMsg]);
      setIsTyping(false);
    }, delay);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: AttachedFile[] = Array.from(files).map((f) => ({
      name: f.name,
      type: f.type,
      size: (f.size / 1024).toFixed(1) + " KB",
    }));
    setAttachments((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const getFileIcon = (type: string) => {
    if (type.includes("image")) return <Image size={12} />;
    if (type.includes("pdf") || type.includes("text")) return <FileCode size={12} />;
    return <File size={12} />;
  };

  const clearChat = () => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your **Arduino AI assistant**. I can help you design circuits, write code, debug issues, and optimize your projects.\n\nWhat would you like to build?",
      timestamp: new Date(),
    }]);
    setShowSuggestions(true);
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: dm ? "#1e1e2e" : "#fafafa", borderLeft: dm ? "1px solid #313244" : "1px solid #d0d0d0" }}
    >
      {/* ── Header — VS Code Copilot style ── */}
      <div
        className="flex items-center justify-between px-3 flex-shrink-0"
        style={{
          background: dm ? "#1e1e2e" : "#fafafa",
          borderBottom: dm ? "1px solid #313244" : "1px solid #d0d0d0",
          height: "35px",
        }}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: "#cba6f7" }} />
          <span style={{ fontSize: "11px", color: dm ? "#cdd6f4" : "#333", fontWeight: 600, letterSpacing: "0.02em" }}>
            Copilot
          </span>
          <div
            className="flex items-center gap-1 px-1.5 rounded-full"
            style={{ background: dm ? "#313244" : "#e0e0e0", fontSize: "10px", color: dm ? "#a6adc8" : "#666" }}
          >
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#a6e3a1" }} />
            Live
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={clearChat}
            className={`flex items-center justify-center rounded transition-colors ${dm ? 'hover:bg-[#313244]' : 'hover:bg-[#e0e0e0]'}`}
            style={{ width: "24px", height: "24px", color: dm ? "#585b70" : "#888" }}
            title="New chat"
          >
            <Plus size={14} />
          </button>
          <button
            className={`flex items-center justify-center rounded transition-colors ${dm ? 'hover:bg-[#313244]' : 'hover:bg-[#e0e0e0]'}`}
            style={{ width: "24px", height: "24px", color: dm ? "#585b70" : "#888" }}
            title="History"
          >
            <History size={14} />
          </button>
          <button
            onClick={onClose}
            className={`flex items-center justify-center rounded transition-colors ${dm ? 'hover:bg-[#313244]' : 'hover:bg-[#e0e0e0]'}`}
            style={{ width: "24px", height: "24px", color: dm ? "#585b70" : "#888" }}
            title="Close panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Messages area ── */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: dm ? "#313244 transparent" : "#c0c0c0 transparent" }}
      >
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-1">
            {/* Role label */}
            <div className="flex items-center gap-1.5">
              {msg.role === "assistant" ? (
                <>
                  <div
                    className="flex items-center justify-center rounded flex-shrink-0"
                    style={{
                      width: "18px",
                      height: "18px",
                      background: "linear-gradient(135deg, #cba6f7, #89b4fa)",
                      borderRadius: "4px",
                    }}
                  >
                    <Sparkles size={10} style={{ color: "#1e1e2e" }} />
                  </div>
                  <span style={{ fontSize: "12px", color: dm ? "#cdd6f4" : "#333", fontWeight: 600 }}>Copilot</span>
                </>
              ) : (
                <>
                  <div
                    className="flex items-center justify-center rounded flex-shrink-0"
                    style={{
                      width: "18px",
                      height: "18px",
                      background: dm ? "#45475a" : "#d0d0d0",
                      borderRadius: "4px",
                    }}
                  >
                    <User size={10} style={{ color: dm ? "#cdd6f4" : "#333" }} />
                  </div>
                  <span style={{ fontSize: "12px", color: dm ? "#cdd6f4" : "#333", fontWeight: 600 }}>You</span>
                </>
              )}
              <span style={{ fontSize: "10px", color: "#585b70" }}>
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {/* Attachments */}
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="flex flex-wrap gap-1 ml-6 mb-1">
                {msg.attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1 px-2 py-0.5 rounded"
                    style={{ background: "#313244", fontSize: "10px", color: "#a6adc8" }}
                  >
                    {getFileIcon(att.type)}
                    <span>{att.name}</span>
                    <span style={{ color: "#585b70" }}>{att.size}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="ml-6" style={{ fontSize: "12px" }}>
              {renderContent(msg.content)}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div
                className="flex items-center justify-center rounded flex-shrink-0"
                style={{
                  width: "18px",
                  height: "18px",
                  background: "linear-gradient(135deg, #cba6f7, #89b4fa)",
                  borderRadius: "4px",
                }}
              >
                <Sparkles size={10} style={{ color: "#1e1e2e" }} />
              </div>
              <span style={{ fontSize: "12px", color: "#cdd6f4", fontWeight: 600 }}>Copilot</span>
            </div>
            <div className="ml-6 flex items-center gap-1.5">
              <Loader size={12} style={{ color: "#cba6f7", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "12px", color: "#585b70" }}>Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Suggestions ── */}
      {showSuggestions && (
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="grid grid-cols-2 gap-1.5">
            {SUGGESTIONS.slice(0, 4).map((s) => (
              <button
                key={s.label}
                onClick={() => sendMessage(s.prompt)}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-left transition-colors ${dm ? 'hover:bg-[#313244]' : 'hover:bg-[#e8e8e8]'}`}
                style={{ border: dm ? "1px solid #313244" : "1px solid #d0d0d0" }}
              >
                <span style={{ fontSize: "13px" }}>{s.icon}</span>
                <span style={{ fontSize: "11px", color: dm ? "#a6adc8" : "#666", lineHeight: "1.3" }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Attachments preview ── */}
      {attachments.length > 0 && (
        <div className="px-3 pb-1 flex flex-wrap gap-1 flex-shrink-0">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-1 px-2 py-0.5 rounded"
              style={{ background: "#313244", fontSize: "11px", color: "#a6adc8", border: "1px solid #45475a" }}
            >
              <FileCode size={10} />
              <span>{att.name}</span>
              <button
                onClick={() => setAttachments((a) => a.filter((_, j) => j !== i))}
                style={{ color: "#585b70", marginLeft: "2px" }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Input area — VS Code Copilot style ── */}
      <div
        className="flex flex-col gap-2 p-3 flex-shrink-0"
        style={{ borderTop: dm ? "1px solid #313244" : "1px solid #d0d0d0" }}
      >
        <div
          className="flex flex-col rounded-lg overflow-hidden"
          style={{ border: dm ? "1px solid #45475a" : "1px solid #c0c0c0", background: dm ? "#313244" : "#f0f0f0" }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask Copilot or type / for commands"
            rows={2}
            className="flex-1 bg-transparent outline-none px-3 py-2 resize-none"
            style={{
              fontSize: "12px",
              color: dm ? "#cdd6f4" : "#333",
              fontFamily: "inherit",
              scrollbarWidth: "none",
              caretColor: dm ? "#cba6f7" : "#7c3aed",
            }}
          />
          <div className="flex items-center justify-between px-2 pb-1.5">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center rounded hover:bg-[#45475a] transition-colors"
                style={{ width: "26px", height: "26px", color: "#585b70" }}
                title="Attach file"
              >
                <Paperclip size={14} />
              </button>
              <button
                className="flex items-center justify-center rounded hover:bg-[#45475a] transition-colors"
                style={{ width: "26px", height: "26px", color: "#585b70" }}
                title="Voice input"
              >
                <Mic size={14} />
              </button>
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() && attachments.length === 0}
              className="flex items-center justify-center rounded-md transition-colors"
              style={{
                width: "28px",
                height: "28px",
                background: input.trim() ? "#cba6f7" : "transparent",
                color: input.trim() ? "#1e1e2e" : "#585b70",
              }}
              title="Send (Enter)"
            >
              <Send size={13} />
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-1.5">
          <button
            onClick={onBuild}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors hover:opacity-90"
            style={{ background: "#cba6f7", fontSize: "11px", color: "#1e1e2e", fontWeight: 600 }}
          >
            <Zap size={11} /> Build & Verify
          </button>
          <button
            className="flex items-center justify-center rounded-md hover:bg-[#313244] transition-colors"
            style={{ width: "32px", border: "1px solid #313244", color: "#585b70" }}
            title="More actions"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".ino,.cpp,.h,.json,.txt,.pdf,.png,.jpg"
        onChange={handleFileAttach}
        style={{ display: "none" }}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

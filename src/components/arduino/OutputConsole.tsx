import { useEffect, useRef } from "react";
import { useArduinoStore } from "../../store/arduinoStore";
import type { OutputLine } from "../../types/arduino";

function lineClass(type: OutputLine["type"]): string {
    switch (type) {
        case "stderr": return "text-red-400";
        case "success": return "text-green-400 font-semibold";
        case "info": return "text-teal-400";
        default: return "text-gray-300";
    }
}

/**
 * Terminal-style output console that shows compile/upload logs.
 * Auto-scrolls to the latest line and supports clearing.
 */
export default function OutputConsole() {
    const { outputLog, clearLog } = useArduinoStore();
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll on new output
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [outputLog]);

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: "#0d1117" }}>
            {/* Console header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800 shrink-0">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider select-none">
                    🖥 Output Console
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600">
                        {outputLog.length} line{outputLog.length !== 1 ? "s" : ""}
                    </span>
                    <button
                        onClick={clearLog}
                        title="Clear console"
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-0.5
                       rounded hover:bg-gray-800"
                    >
                        ✕ Clear
                    </button>
                </div>
            </div>

            {/* Log lines */}
            <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed">
                {outputLog.length === 0 ? (
                    <span className="text-gray-600 italic">
                        No output yet. Hit Compile or Upload to start.
                    </span>
                ) : (
                    outputLog.map((line) => (
                        <div key={line.id} className={`whitespace-pre-wrap break-all ${lineClass(line.type)}`}>
                            {line.text}
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}

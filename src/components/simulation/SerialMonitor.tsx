import { useRef, useEffect } from "react";
import { useSimulationStore } from "../../store/simulationStore";

export default function SerialMonitor() {
  const { serialOutput, isRunning } = useSimulationStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [serialOutput]);

  if (!isRunning && !serialOutput) return null;

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      <div className="flex items-center justify-between px-3 py-1 bg-gray-800 border-b border-gray-700 shrink-0">
        <span className="text-xs font-bold text-emerald-400">
          Serial Monitor
        </span>
        {isRunning && (
          <span className="text-[10px] text-gray-400">9600 baud</span>
        )}
      </div>
      <div className="flex-1 overflow-auto p-2 font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {serialOutput || (
          <span className="text-gray-500 italic">
            Waiting for serial output...
          </span>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

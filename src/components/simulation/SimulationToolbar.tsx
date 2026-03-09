import { useSimulationStore } from "../../store/simulationStore";
import { useArduinoStore } from "../../store/arduinoStore";
import { useEditorStore } from "../../store/editorStore";
import { compileSketch } from "../../api/arduino";

export default function SimulationToolbar() {
  const { isRunning, startSimulation, stopSimulation, resetSimulation } =
    useSimulationStore();
  const { selectedBoard } = useArduinoStore();
  const code = useEditorStore((s) => s.code);

  const handleSimulate = async () => {
    if (isRunning) {
      stopSimulation();
      return;
    }

    // Only AVR boards can be simulated in-browser
    if (!selectedBoard.fqbn.startsWith("arduino:avr:")) {
      alert(
        `In-browser simulation is only available for AVR boards (Arduino Uno/Nano/Mega). ` +
          `Selected board "${selectedBoard.name}" requires server-side simulation.`
      );
      return;
    }

    try {
      const result = await compileSketch(code, selectedBoard.fqbn);
      if (!result.success) {
        alert("Compilation failed. Check the output console for errors.");
        return;
      }
      if (!result.hex) {
        alert(
          "Compilation succeeded but no .hex file was returned. Make sure arduino-cli is configured."
        );
        return;
      }
      startSimulation(result.hex);
    } catch (err) {
      alert(
        `Could not reach the compile server. Run: node server/index.js\n\n${err}`
      );
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-700 shrink-0"
         style={{ backgroundColor: "#1a1f2e" }}>
      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 shrink-0 select-none">
        <span className="text-base">▶</span> Simulation
      </span>

      <div className="w-px h-5 bg-gray-700 shrink-0" />

      <button
        onClick={handleSimulate}
        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
          isRunning
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-emerald-600 hover:bg-emerald-700 text-white"
        }`}
      >
        {isRunning ? "⏹ Stop" : "▶ Simulate"}
      </button>

      <button
        onClick={resetSimulation}
        disabled={!isRunning}
        className="px-3 py-1 text-xs font-medium rounded bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-40 transition-colors"
      >
        ↻ Reset
      </button>

      {isRunning && (
        <span className="text-xs text-emerald-400 animate-pulse ml-2">
          ● Running (AVR @ 16MHz)
        </span>
      )}
    </div>
  );
}

import { useCallback } from "react";

interface EditorToolbarProps {
  language: "c" | "cpp" | "python";
  onLanguageChange: (language: "c" | "cpp" | "python") => void;
}

/**
 * Editor toolbar component
 *
 * Provides controls for code editor (language selection, formatting, etc.)
 */
export default function EditorToolbar({
  language,
  onLanguageChange,
}: EditorToolbarProps) {
  const handleFormat = useCallback(() => {
    // TODO: Implement code formatting
    console.log("Format code");
  }, []);

  const handleCompile = useCallback(() => {
    // TODO: Implement code compilation
    console.log("Compile code");
  }, []);

  const handleRun = useCallback(() => {
    // TODO: Implement code execution
    console.log("Run code");
  }, []);

  const handleReset = useCallback(() => {
    // TODO: Implement code reset
    console.log("Reset code");
  }, []);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
      {/* Language selector */}
      <select
        value={language}
        onChange={(e) =>
          onLanguageChange(e.target.value as "c" | "cpp" | "python")
        }
        className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs
                   text-gray-100 cursor-pointer hover:border-gray-500 transition-colors"
      >
        <option value="c">C</option>
        <option value="cpp">C++</option>
        <option value="python">Python</option>
      </select>

      <div className="w-px h-6 bg-gray-600"></div>

      {/* Format button */}
      <button
        onClick={handleFormat}
        title="Format code (Shift+Alt+F)"
        className="px-2 py-1 text-xs font-medium rounded bg-gray-700 hover:bg-gray-600
                   text-gray-100 transition-colors"
      >
        Format
      </button>

      {/* Compile button */}
      <button
        onClick={handleCompile}
        title="Compile code"
        className="px-2 py-1 text-xs font-medium rounded bg-gray-700 hover:bg-gray-600
                   text-gray-100 transition-colors"
      >
        Compile
      </button>

      {/* Run button */}
      <button
        onClick={handleRun}
        title="Run simulation (Ctrl+Enter)"
        className="px-2 py-1 text-xs font-medium rounded bg-green-700 hover:bg-green-600
                   text-white transition-colors"
      >
        ▶ Run
      </button>

      <div className="w-px h-6 bg-gray-600"></div>

      {/* Reset button */}
      <button
        onClick={handleReset}
        title="Reset code"
        className="px-2 py-1 text-xs font-medium rounded bg-gray-700 hover:bg-gray-600
                   text-gray-100 transition-colors"
      >
        Reset
      </button>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Debug indicator */}
      <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-700 text-xs text-gray-400">
        <span className="w-2 h-2 rounded-full bg-red-500"></span>
        <span>Debug</span>
      </div>
    </div>
  );
}

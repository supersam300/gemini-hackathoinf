import { useCallback, useState } from "react";
import { useEditorStore } from "../../store/editorStore";

interface EditorToolbarProps {
  language: "c" | "cpp" | "python";
  onLanguageChange: (language: "c" | "cpp" | "python") => void;
  onFormat?: () => void;
  onCompile?: () => void;
  onRun?: () => void;
}

const LANGUAGE_LABELS: Record<"c" | "cpp" | "python", string> = {
  c: "C",
  cpp: "C++",
  python: "Python",
};

/**
 * Editor toolbar component
 *
 * Provides controls for code editor (language selection, formatting, etc.)
 */
export default function EditorToolbar({
  language,
  onLanguageChange,
  onFormat,
  onCompile,
  onRun,
}: EditorToolbarProps) {
  const { clearCode, hasChanges } = useEditorStore();
  const [isRunning, setIsRunning] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  const handleFormat = useCallback(() => {
    onFormat?.();
  }, [onFormat]);

  const handleCompile = useCallback(async () => {
    setIsCompiling(true);
    try {
      await onCompile?.();
    } finally {
      setIsCompiling(false);
    }
  }, [onCompile]);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    try {
      await onRun?.();
    } finally {
      setIsRunning(false);
    }
  }, [onRun]);

  const handleReset = useCallback(() => {
    if (hasChanges) {
      const confirmed = window.confirm(
        "Reset code? This will clear all your changes."
      );
      if (!confirmed) return;
    }
    clearCode();
  }, [clearCode, hasChanges]);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
      {/* Language selector */}
      <select
        value={language}
        onChange={(e) =>
          onLanguageChange(e.target.value as "c" | "cpp" | "python")
        }
        className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs
                   text-gray-100 cursor-pointer hover:border-gray-500 transition-colors focus:outline-none focus:border-blue-500"
      >
        {(Object.keys(LANGUAGE_LABELS) as Array<"c" | "cpp" | "python">).map(
          (lang) => (
            <option key={lang} value={lang}>
              {LANGUAGE_LABELS[lang]}
            </option>
          )
        )}
      </select>

      <div className="w-px h-6 bg-gray-600" />

      {/* Format button */}
      <button
        onClick={handleFormat}
        disabled={!onFormat}
        title="Format code (Shift+Alt+F)"
        className="px-2 py-1 text-xs font-medium rounded bg-gray-700 hover:bg-gray-600
                   text-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ⬡ Format
      </button>

      {/* Compile button */}
      <button
        onClick={handleCompile}
        disabled={isCompiling}
        title="Compile code"
        className="px-2 py-1 text-xs font-medium rounded bg-gray-700 hover:bg-gray-600
                   text-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isCompiling ? "⟳ Compiling…" : "⚙ Compile"}
      </button>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={isRunning}
        title="Run simulation (Ctrl+Enter)"
        className="px-2 py-1 text-xs font-medium rounded
                   bg-green-700 hover:bg-green-600 active:bg-green-800
                   text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isRunning ? "⟳ Running…" : "▶ Run"}
      </button>

      <div className="w-px h-6 bg-gray-600" />

      {/* Reset button */}
      <button
        onClick={handleReset}
        title="Reset code to blank"
        className="px-2 py-1 text-xs font-medium rounded bg-gray-700 hover:bg-red-700
                   text-gray-100 hover:text-white transition-colors"
      >
        ✕ Reset
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <span className="flex items-center gap-1 text-xs text-yellow-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
          Unsaved
        </span>
      )}
    </div>
  );
}

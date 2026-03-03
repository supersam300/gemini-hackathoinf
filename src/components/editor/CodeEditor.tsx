import { useCallback } from "react";
import { useEditorStore } from "../../store/editorStore";
import EditorToolbar from "./EditorToolbar";

/**
 * Monaco Editor wrapper component
 *
 * Integrates Monaco Editor for code editing
 * Supports C, C++, and Python
 */
export default function CodeEditor() {
  const { code, language, setCode, setLanguage } = useEditorStore();

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      setCode(value || "");
    },
    [setCode]
  );

  const handleLanguageChange = useCallback(
    (newLanguage: "c" | "cpp" | "python") => {
      setLanguage(newLanguage);
    },
    [setLanguage]
  );

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      {/* Toolbar */}
      <EditorToolbar
        language={language}
        onLanguageChange={handleLanguageChange}
      />

      {/* Editor placeholder */}
      <div className="flex-1 overflow-hidden p-4 font-mono text-sm">
        <p className="text-gray-400 mb-4">
          Monaco Editor integration - Coming soon...
        </p>
        <p className="text-gray-500 text-xs">
          Language: <span className="text-blue-400">{language}</span>
        </p>
        <p className="text-gray-500 text-xs mt-2">
          Code length: <span className="text-green-400">{code.length}</span> characters
        </p>

        {/* Textarea as temporary placeholder */}
        <textarea
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder="Write your code here..."
          className="w-full h-64 mt-4 p-3 bg-gray-800 border border-gray-700 rounded
                     text-gray-100 font-mono text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Status bar */}
      <div className="h-6 px-4 py-1 bg-gray-800 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
        <span>Line 1, Col 1</span>
        <span>{code.split("\n").length} lines</span>
      </div>
    </div>
  );
}

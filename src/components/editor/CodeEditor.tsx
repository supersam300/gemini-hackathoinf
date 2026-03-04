import { useCallback, useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEditorStore } from "../../store/editorStore";
import EditorToolbar from "./EditorToolbar";

/**
 * Monaco Editor wrapper component
 *
 * Integrates Monaco Editor for code editing
 * Supports C, C++, and Python
 */

const LANGUAGE_MAP: Record<"c" | "cpp" | "python", string> = {
  c: "c",
  cpp: "cpp",
  python: "python",
};

export default function CodeEditor() {
  const { code, language, setCode, setLanguage } = useEditorStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = useCallback((editorInstance) => {
    editorRef.current = editorInstance;
    editorInstance.focus();

    // Bind Ctrl+Enter to run
    editorInstance.addCommand(
      // Ctrl+Enter keybinding
      2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
      () => {
        console.log("Run triggered via Ctrl+Enter");
      }
    );
  }, []);

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      setCode(value ?? "");
    },
    [setCode]
  );

  const handleLanguageChange = useCallback(
    (newLanguage: "c" | "cpp" | "python") => {
      setLanguage(newLanguage);
    },
    [setLanguage]
  );

  /** Trigger Monaco's built-in document formatter (Shift+Alt+F) */
  const handleFormat = useCallback(() => {
    editorRef.current
      ?.getAction("editor.action.formatDocument")
      ?.run();
  }, []);

  const lineCount = code.split("\n").length;

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      {/* Toolbar */}
      <EditorToolbar
        language={language}
        onLanguageChange={handleLanguageChange}
        onFormat={handleFormat}
        onCompile={() => console.log("Compile:", language, code)}
        onRun={() => console.log("Run:", language, code)}
      />

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={LANGUAGE_MAP[language]}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily:
              "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Menlo, monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            lineNumbers: "on",
            glyphMargin: false,
            folding: true,
            wordWrap: "off",
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>

      {/* Status bar */}
      <div className="h-6 px-4 py-1 bg-gray-800 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
        <span>Monaco Editor</span>
        <span>
          {lineCount} {lineCount === 1 ? "line" : "lines"}
        </span>
      </div>
    </div>
  );
}

interface HeaderProps {
  view: "canvas" | "ide";
  onViewChange: (view: "canvas" | "ide") => void;
}

export default function Header({ view, onViewChange }: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-12 px-4 bg-vs-dark-600 border-b border-gray-800 select-none shrink-0">
      {/* Logo and Title */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-accent-blue flex items-center justify-center text-white font-bold text-sm">
          ◇
        </div>
        <h1 className="text-sm font-semibold text-gray-100">SimuIDE</h1>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => onViewChange("canvas")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${view === "canvas"
              ? "bg-accent-blue text-white shadow"
              : "text-gray-400 hover:text-gray-200"
            }`}
        >
          ⬡ Canvas
        </button>
        <button
          onClick={() => onViewChange("ide")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${view === "ide"
              ? "bg-accent-blue text-white shadow"
              : "text-gray-400 hover:text-gray-200"
            }`}
        >
          {"</>"}  IDE
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button className="p-1 text-gray-400 hover:text-gray-200 transition-colors">
          ⚙️
        </button>
        <button className="p-1 text-gray-400 hover:text-gray-200 transition-colors">
          ☰
        </button>
      </div>
    </header>
  );
}

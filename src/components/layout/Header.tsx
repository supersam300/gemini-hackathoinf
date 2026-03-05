import { useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import LoadDialog from "./LoadDialog";

interface HeaderProps {
  view: "canvas" | "ide";
  onViewChange: (view: "canvas" | "ide") => void;
}

export default function Header({ view, onViewChange }: HeaderProps) {
  const [loadOpen, setLoadOpen] = useState(false);
  const { saveToCloud, loadFromCloud, cloudSaving, cloudLoading, cloudCircuitId } =
    useProjectStore();

  const handleSave = async () => {
    const name = window.prompt("Project name:", "My Circuit");
    if (!name) return;

    const ok = await saveToCloud(name);
    if (ok) {
      console.log("✅ Saved to MongoDB");
    } else {
      alert("Save failed. Is the server running?");
    }
  };

  const handleLoad = async (id: string) => {
    const ok = await loadFromCloud(id);
    if (!ok) {
      alert("Load failed. Check console for details.");
    }
  };

  return (
    <>
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
            {"</>"} IDE
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Cloud indicator */}
          {cloudCircuitId && (
            <span className="text-[10px] text-green-400 flex items-center gap-1" title="Synced with cloud">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Saved
            </span>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={cloudSaving}
            title="Save circuit to MongoDB"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded
                       bg-accent-blue hover:bg-accent-blue-hover text-white transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cloudSaving ? "⟳" : "💾"} {cloudSaving ? "Saving…" : "Save"}
          </button>

          {/* Load */}
          <button
            onClick={() => setLoadOpen(true)}
            disabled={cloudLoading}
            title="Load circuit from MongoDB"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded
                       bg-gray-700 hover:bg-gray-600 text-gray-100 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cloudLoading ? "⟳" : "📂"} {cloudLoading ? "Loading…" : "Load"}
          </button>

          <div className="w-px h-5 bg-gray-700" />

          <button className="p-1 text-gray-400 hover:text-gray-200 transition-colors">
            ⚙️
          </button>
          <button className="p-1 text-gray-400 hover:text-gray-200 transition-colors">
            ☰
          </button>
        </div>
      </header>

      {/* Load dialog */}
      <LoadDialog open={loadOpen} onClose={() => setLoadOpen(false)} onLoad={handleLoad} />
    </>
  );
}

import { useEffect } from "react";
import { useArduinoStore } from "../../store/arduinoStore";
import { KNOWN_BOARDS } from "../../api/arduino";

/**
 * Arduino-specific toolbar: board selector, port selector, compile, upload.
 * Sits above the Monaco editor in IDE view.
 */
export default function ArduinoToolbar({ code }: { code: string }) {
    const {
        selectedBoard,
        setSelectedBoard,
        ports,
        selectedPort,
        setSelectedPort,
        portsLoading,
        refreshPorts,
        compileStatus,
        uploadStatus,
        consoleOpen,
        toggleConsole,
        compile,
        upload,
    } = useArduinoStore();

    const isCompiling = compileStatus === "running";
    const isUploading = uploadStatus === "running";
    const busy = isCompiling || isUploading;

    // Load ports on first mount
    useEffect(() => {
        refreshPorts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const statusBadge = () => {
        if (isCompiling) return { icon: "⟳", label: "Compiling…", cls: "text-yellow-400" };
        if (isUploading) return { icon: "⟳", label: "Uploading…", cls: "text-yellow-400" };
        if (compileStatus === "success" && uploadStatus !== "error") return { icon: "✓", label: "Ready", cls: "text-green-400" };
        if (compileStatus === "error" || uploadStatus === "error") return { icon: "✗", label: "Error", cls: "text-red-400" };
        return { icon: "●", label: "Idle", cls: "text-gray-500" };
    };
    const badge = statusBadge();

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-850 border-b border-gray-700 shrink-0 flex-wrap"
            style={{ backgroundColor: "#1a1f2e" }}>

            {/* Arduino logo pill */}
            <span className="flex items-center gap-1.5 text-xs font-bold text-teal-400 shrink-0 select-none">
                <span className="text-base">🔌</span> Arduino
            </span>

            <div className="w-px h-5 bg-gray-700 shrink-0" />

            {/* Board selector */}
            <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide select-none">Board</label>
                <select
                    value={selectedBoard.fqbn}
                    onChange={(e) => {
                        const board = KNOWN_BOARDS.find((b) => b.fqbn === e.target.value);
                        if (board) setSelectedBoard(board);
                    }}
                    disabled={busy}
                    className="px-2 py-1 text-xs rounded bg-gray-800 border border-gray-600 text-gray-100
                     focus:outline-none focus:border-teal-500 disabled:opacity-50 cursor-pointer
                     hover:border-gray-400 transition-colors min-w-[140px]"
                >
                    {KNOWN_BOARDS.map((b) => (
                        <option key={b.fqbn} value={b.fqbn}>{b.name}</option>
                    ))}
                </select>
            </div>

            {/* Port selector */}
            <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide select-none">Port</label>
                <select
                    value={selectedPort}
                    onChange={(e) => setSelectedPort(e.target.value)}
                    disabled={busy || ports.length === 0}
                    className="px-2 py-1 text-xs rounded bg-gray-800 border border-gray-600 text-gray-100
                     focus:outline-none focus:border-teal-500 disabled:opacity-50 cursor-pointer
                     hover:border-gray-400 transition-colors min-w-[160px]"
                >
                    {ports.length === 0 ? (
                        <option value="">— no ports —</option>
                    ) : (
                        ports.map((p) => (
                            <option key={p.address} value={p.address}>
                                {p.address} {p.label !== p.address ? `(${p.label})` : ""}
                            </option>
                        ))
                    )}
                </select>
                <button
                    onClick={refreshPorts}
                    disabled={portsLoading || busy}
                    title="Refresh serial ports"
                    className="p-1 rounded text-gray-400 hover:text-teal-400 hover:bg-gray-700
                     transition-colors disabled:opacity-40 text-sm"
                >
                    {portsLoading ? "⟳" : "🔄"}
                </button>
            </div>

            <div className="w-px h-5 bg-gray-700 shrink-0" />

            {/* Compile button */}
            <button
                onClick={() => compile(code)}
                disabled={busy}
                title="Compile sketch (verify only)"
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded
                   bg-gray-700 hover:bg-gray-600 text-white transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600
                   hover:border-gray-400"
            >
                <span>{isCompiling ? "⟳" : "⚙"}</span>
                {isCompiling ? "Compiling…" : "Compile"}
            </button>

            {/* Upload button */}
            <button
                onClick={() => upload(code)}
                disabled={busy || !selectedPort}
                title={!selectedPort ? "Select a port first" : "Compile and upload to board"}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded
                   bg-teal-700 hover:bg-teal-600 active:bg-teal-800
                   text-white transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed border border-teal-600"
            >
                <span>{isUploading ? "⟳" : "⬆"}</span>
                {isUploading ? "Uploading…" : "Upload"}
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Status badge */}
            <span className={`text-xs font-medium flex items-center gap-1 ${badge.cls}`}>
                <span className={isCompiling || isUploading ? "animate-spin inline-block" : ""}>{badge.icon}</span>
                {badge.label}
            </span>

            {/* Console toggle */}
            <button
                onClick={toggleConsole}
                title={consoleOpen ? "Hide output console" : "Show output console"}
                className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600
                   border border-gray-600 text-gray-300 transition-colors ml-1"
            >
                {consoleOpen ? "▼ Console" : "▲ Console"}
            </button>
        </div>
    );
}

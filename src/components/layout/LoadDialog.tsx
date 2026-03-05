import { useState, useEffect } from "react";
import { listCircuits, deleteCircuit } from "../../api/circuits";
import type { CircuitSummary } from "../../api/circuits";

interface LoadDialogProps {
    open: boolean;
    onClose: () => void;
    onLoad: (id: string) => void;
}

export default function LoadDialog({ open, onClose, onLoad }: LoadDialogProps) {
    const [circuits, setCircuits] = useState<CircuitSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        fetchList();
    }, [open]);

    const fetchList = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await listCircuits();
            setCircuits(res.circuits);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this circuit permanently?")) return;
        try {
            await deleteCircuit(id);
            setCircuits((prev) => prev.filter((c) => c._id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-[520px] max-h-[70vh] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
                    <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider flex items-center gap-2">
                        📂 Load Circuit
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200 transition-colors text-lg"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-3">
                    {loading && (
                        <div className="text-xs text-gray-400 text-center py-10">
                            Loading saved circuits…
                        </div>
                    )}

                    {error && (
                        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3">
                            ⚠ {error}
                        </div>
                    )}

                    {!loading && circuits.length === 0 && !error && (
                        <div className="text-xs text-gray-500 text-center py-10">
                            No saved circuits yet. Save your first circuit!
                        </div>
                    )}

                    {!loading &&
                        circuits.map((c) => (
                            <div
                                key={c._id}
                                className="flex items-center justify-between px-3 py-2.5 mb-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 transition-all cursor-pointer group"
                                onClick={() => {
                                    onLoad(c._id);
                                    onClose();
                                }}
                            >
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-gray-100 truncate">
                                        {c.projectName}
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                                        <span>{c.componentCount} components</span>
                                        <span>·</span>
                                        <span>{c.language?.toUpperCase()}</span>
                                        <span>·</span>
                                        <span>{new Date(c.updatedAt).toLocaleString()}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(c._id);
                                    }}
                                    title="Delete circuit"
                                    className="text-gray-600 hover:text-red-400 transition-colors text-sm opacity-0 group-hover:opacity-100 ml-2 p-1"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-700 flex justify-between items-center">
                    <button
                        onClick={fetchList}
                        disabled={loading}
                        className="text-xs text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
                    >
                        🔄 Refresh
                    </button>
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs font-medium rounded bg-gray-700 hover:bg-gray-600 text-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

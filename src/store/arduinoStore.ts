import { create } from "zustand";
import type { ArduinoPort, ArduinoBoard, BuildStatus, OutputLine } from "../types/arduino";
import { fetchPorts, compileSketch, uploadSketch, KNOWN_BOARDS } from "../api/arduino";

let lineIdCounter = 0;
function makeLines(text: string, type: OutputLine["type"]): OutputLine[] {
    return text
        .split("\n")
        .filter((l) => l.trim() !== "")
        .map((text) => ({
            id: ++lineIdCounter,
            text,
            type,
            timestamp: Date.now(),
        }));
}

interface ArduinoStore {
    // Board / port selection
    boards: ArduinoBoard[];
    selectedBoard: ArduinoBoard;
    ports: ArduinoPort[];
    selectedPort: string;

    // Status
    compileStatus: BuildStatus;
    uploadStatus: BuildStatus;
    portsLoading: boolean;

    // Output log
    outputLog: OutputLine[];
    consoleOpen: boolean;

    // Last compiled hex for simulation
    lastCompiledHex: string | null;

    // Actions
    setSelectedBoard: (board: ArduinoBoard) => void;
    setSelectedPort: (port: string) => void;
    refreshPorts: () => Promise<void>;
    compile: (files: string | { name: string; content: string }[]) => Promise<boolean>;
    upload: (files: string | { name: string; content: string }[]) => Promise<boolean>;
    clearLog: () => void;
    addLog: (text: string, type: OutputLine["type"]) => void;
    toggleConsole: () => void;
}

const DEFAULT_BOARD: ArduinoBoard = KNOWN_BOARDS[0] ?? { name: "Arduino Uno", fqbn: "arduino:avr:uno" };

export const useArduinoStore = create<ArduinoStore>((set, get) => ({
    boards: KNOWN_BOARDS,
    selectedBoard: DEFAULT_BOARD,
    ports: [],
    selectedPort: "",
    compileStatus: "idle",
    uploadStatus: "idle",
    portsLoading: false,
    outputLog: [],
    consoleOpen: false,

    lastCompiledHex: null,

    setSelectedBoard: (board) => set({ selectedBoard: board }),
    setSelectedPort: (port) => set({ selectedPort: port }),

    toggleConsole: () => set((s) => ({ consoleOpen: !s.consoleOpen })),

    clearLog: () => set({ outputLog: [] }),
    addLog: (text: string, type: OutputLine["type"]) =>
        set((s) => ({ outputLog: [...s.outputLog, ...makeLines(text, type)] })),

    refreshPorts: async () => {
        set({ portsLoading: true });
        const addLine = (text: string, type: OutputLine["type"]) =>
            set((s) => ({ outputLog: [...s.outputLog, ...makeLines(text, type)] }));

        try {
            const res = await fetchPorts();
            if (res.success) {
                set({ ports: res.ports, portsLoading: false });
                if (res.ports.length === 0) {
                    addLine("ℹ No serial ports detected. Plug in your Arduino and click Refresh.", "info");
                } else {
                    addLine(`ℹ Found ${res.ports.length} port(s).`, "info");
                    // Auto-select the first port if none selected
                    const firstPort = res.ports[0];
                    if (!get().selectedPort && firstPort) {
                        set({ selectedPort: firstPort.address });
                    }
                }
            } else {
                addLine(`✗ Failed to list ports: ${res.error}`, "stderr");
                set({ portsLoading: false });
            }
        } catch (err) {
            set({ portsLoading: false });
            const msg = err instanceof Error ? err.message : String(err);
            set((s) => ({
                outputLog: [
                    ...s.outputLog,
                    ...makeLines(`✗ Could not reach the Arduino server: ${msg}`, "stderr"),
                ],
            }));
        }
    },

    compile: async (files: string | { name: string; content: string }[]): Promise<boolean> => {
        const { selectedBoard } = get();
        set({ compileStatus: "running", consoleOpen: true });

        const addLines = (text: string, type: OutputLine["type"]) =>
            set((s) => ({ outputLog: [...s.outputLog, ...makeLines(text, type)] }));

        addLines(`⚙ Compiling for ${selectedBoard.name} (${selectedBoard.fqbn})…`, "info");

        try {
            const res = await compileSketch(files, selectedBoard.fqbn);
            if (res.output) addLines(res.output, "stdout");
            if (res.error) addLines(res.error, "stderr");

            if (res.success) {
                addLines("✓ Compiled successfully.", "success");
                set({ compileStatus: "success", lastCompiledHex: res.hex || null });
                return true;
            } else {
                addLines("✗ Compilation failed.", "stderr");
                set({ compileStatus: "error", lastCompiledHex: null });
                return false;
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            addLines(`✗ Server error: ${msg}`, "stderr");
            set({ compileStatus: "error" });
            return false;
        }
    },

    upload: async (files: string | { name: string; content: string }[]): Promise<boolean> => {
        const { selectedBoard, selectedPort } = get();
        set({ uploadStatus: "running", consoleOpen: true });

        const addLines = (text: string, type: OutputLine["type"]) =>
            set((s) => ({ outputLog: [...s.outputLog, ...makeLines(text, type)] }));

        if (!selectedPort) {
            addLines("✗ No port selected. Please select a port and try again.", "stderr");
            set({ uploadStatus: "error" });
            return false;
        }

        addLines(
            `⬆ Uploading to ${selectedBoard.name} on ${selectedPort}…`,
            "info"
        );

        try {
            const res = await uploadSketch(files, selectedBoard.fqbn, selectedPort);
            if (res.output) addLines(res.output, "stdout");
            if (res.error) addLines(res.error, "stderr");

            if (res.success) {
                addLines("✓ Upload complete! Your sketch is running.", "success");
                set({ uploadStatus: "success" });
                return true;
            } else {
                addLines("✗ Upload failed.", "stderr");
                set({ uploadStatus: "error" });
                return false;
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            addLines(`✗ Server error: ${msg}`, "stderr");
            set({ uploadStatus: "error" });
            return false;
        }
    },
}));

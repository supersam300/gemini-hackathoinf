import { create } from "zustand";
import { ArduinoSimulator } from "../services/simulation";

interface SimulationState {
  isRunning: boolean;
  serialOutput: string;
  pinStates: Record<string, boolean>;
  simulator: ArduinoSimulator | null;
  startSimulation: (hex: string) => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  setPin: (port: string, pin: number, high: boolean) => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  isRunning: false,
  serialOutput: "",
  pinStates: {},
  simulator: null,

  startSimulation: (hex: string) => {
    // Stop any existing simulation
    get().simulator?.stop();

    const sim = new ArduinoSimulator();

    sim.onSerialOutput = (char) => {
      set((s) => ({ serialOutput: s.serialOutput + char }));
    };

    sim.onPinChange = (port, pin, value) => {
      set((s) => ({
        pinStates: { ...s.pinStates, [`${port}${pin}`]: value },
      }));
    };

    sim.loadHex(hex);
    sim.start();
    set({ simulator: sim, isRunning: true, serialOutput: "", pinStates: {} });
  },

  stopSimulation: () => {
    get().simulator?.stop();
    set({ isRunning: false });
  },

  resetSimulation: () => {
    get().simulator?.reset();
    set({ isRunning: false, serialOutput: "", pinStates: {} });
  },

  setPin: (port, pin, high) => {
    get().simulator?.setPin(port, pin, high);
  },
}));

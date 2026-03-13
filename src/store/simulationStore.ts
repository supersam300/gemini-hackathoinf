import { create } from "zustand";
import { ArduinoSimulator } from "../services/simulation";

interface SimulationState {
  isRunning: boolean;
  serialOutput: string;
  pinStates: Record<string, boolean>;
  i2cData: { address: number; data: number[]; timestamp: number } | null;
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
  i2cData: null,
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

    sim.onI2CWrite = (address, data) => {
      set({ i2cData: { address, data, timestamp: Date.now() } });
    };

    // Only load and run AVR CPU if hex is provided (MCU mode)
    if (hex && hex.trim()) {
      sim.loadHex(hex);
      sim.start();
    }
    // Always mark as running so the CircuitCanvas simulation bridge activates
    set({ simulator: sim, isRunning: true, serialOutput: "", pinStates: {}, i2cData: null });
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

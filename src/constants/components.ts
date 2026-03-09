import type { ComponentDefinition } from "../types/components";

/** Available electronic components for the palette */
export const COMPONENTS: ComponentDefinition[] = [
  // Basic
  {
    id: "wire",
    name: "Wire",
    category: "basic",
    description: "Connects two points",
    icon: "⚡",
    inputs: 1,
    outputs: 1,
  },
  {
    id: "ground",
    name: "Ground",
    category: "basic",
    description: "Ground reference",
    icon: "⏚",
    inputs: 1,
    outputs: 0,
  },
  {
    id: "vcc",
    name: "VCC",
    category: "basic",
    description: "Power supply (5V)",
    icon: "🔋",
    inputs: 0,
    outputs: 1,
  },

  // Passive
  {
    id: "resistor",
    name: "Resistor",
    category: "passive",
    description: "Limits current flow",
    icon: "⊟",
    wokwiTag: "wokwi-resistor",
    inputs: 1,
    outputs: 1,
  },
  {
    id: "capacitor",
    name: "Capacitor",
    category: "passive",
    description: "Stores electrical energy",
    icon: "⊞",
    inputs: 1,
    outputs: 1,
  },
  {
    id: "inductor",
    name: "Inductor",
    category: "passive",
    description: "Stores energy in magnetic field",
    icon: "⊝",
    inputs: 1,
    outputs: 1,
  },

  // Active
  {
    id: "diode",
    name: "Diode",
    category: "active",
    description: "Allows current in one direction",
    icon: "▶",
    inputs: 1,
    outputs: 1,
  },
  {
    id: "led",
    name: "LED",
    category: "active",
    description: "Light emitting diode",
    icon: "💡",
    wokwiTag: "wokwi-led",
    inputs: 1,
    outputs: 1,
  },
  {
    id: "transistor-npn",
    name: "NPN Transistor",
    category: "active",
    description: "NPN bipolar junction transistor",
    icon: "🔀",
    inputs: 2,
    outputs: 1,
  },

  // ICs
  {
    id: "arduino-uno",
    name: "Arduino Uno",
    category: "ic",
    description: "ATmega328P microcontroller board",
    icon: "🖥️",
    wokwiTag: "wokwi-arduino-uno",
    inputs: 14,
    outputs: 14,
  },
  {
    id: "esp32",
    name: "ESP32",
    category: "ic",
    description: "WiFi + Bluetooth microcontroller",
    icon: "📡",
    wokwiTag: "wokwi-esp32-devkit-v1",
    inputs: 30,
    outputs: 30,
  },

  // Input
  {
    id: "push-button",
    name: "Push Button",
    category: "input",
    description: "Momentary push button switch",
    icon: "🔘",
    wokwiTag: "wokwi-pushbutton",
    inputs: 1,
    outputs: 1,
  },
  {
    id: "potentiometer",
    name: "Potentiometer",
    category: "input",
    description: "Variable resistor",
    icon: "🎛️",
    wokwiTag: "wokwi-slide-potentiometer",
    inputs: 1,
    outputs: 1,
  },

  // Output
  {
    id: "servo",
    name: "Servo Motor",
    category: "output",
    description: "Positional servo motor",
    icon: "⚙️",
    wokwiTag: "wokwi-servo",
    inputs: 1,
    outputs: 0,
  },
  {
    id: "buzzer",
    name: "Buzzer",
    category: "output",
    description: "Piezo buzzer",
    icon: "🔊",
    wokwiTag: "wokwi-buzzer",
    inputs: 1,
    outputs: 0,
  },
];

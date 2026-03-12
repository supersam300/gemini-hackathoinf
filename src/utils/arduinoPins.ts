/**
 * Mapping of Arduino Uno physical pin names (as seen in the UI handles)
 * to the AVR port/pin notation used by avr8js.
 */
export const UNO_PIN_MAP: Record<string, { port: string; pin: number }> = {
  // Digital Pins
  "0":  { port: "D", pin: 0 }, // RX
  "1":  { port: "D", pin: 1 }, // TX
  "2":  { port: "D", pin: 2 },
  "3":  { port: "D", pin: 3 },
  "4":  { port: "D", pin: 4 },
  "5":  { port: "D", pin: 5 },
  "6":  { port: "D", pin: 6 },
  "7":  { port: "D", pin: 7 },
  "8":  { port: "B", pin: 0 },
  "9":  { port: "B", pin: 1 },
  "10": { port: "B", pin: 2 },
  "11": { port: "B", pin: 3 },
  "12": { port: "B", pin: 4 },
  "13": { port: "B", pin: 5 },

  // Analog Pins (Digital mode)
  "A0": { port: "C", pin: 0 },
  "A1": { port: "C", pin: 1 },
  "A2": { port: "C", pin: 2 },
  "A3": { port: "C", pin: 3 },
  "A4": { port: "C", pin: 4 },
  "A5": { port: "C", pin: 5 },
};

/**
 * Returns the simulation state key (e.g., "B5") for a given Arduino pin name.
 */
export function getPinKey(pinName: string): string | null {
  const mapping = UNO_PIN_MAP[pinName];
  if (!mapping) return null;
  return `${mapping.port}${mapping.pin}`;
}

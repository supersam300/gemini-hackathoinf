/** A serial port detected on the system */
export interface ArduinoPort {
    address: string;  // e.g. /dev/cu.usbmodem14101
    label: string;    // Human-readable label
    protocol: string; // e.g. "serial"
}

/** A known Arduino-compatible board */
export interface ArduinoBoard {
    name: string;  // e.g. "Arduino Uno"
    fqbn: string;  // e.g. "arduino:avr:uno"
}

/** Build/upload operation status */
export type BuildStatus = "idle" | "running" | "success" | "error";

/** A single line in the output console */
export interface OutputLine {
    id: number;
    text: string;
    type: "stdout" | "stderr" | "info" | "success" | "warning" | "error";
    timestamp: number;
}

/** Response from backend compile / upload */
export interface ArduinoApiResponse {
    success: boolean;
    output: string;
    error?: string;
    hex?: string;
}

import type { ArduinoPort, ArduinoBoard, ArduinoApiResponse } from "../types/arduino";

const BASE = "/api/arduino";

const SERVER_NOT_RUNNING =
    "Arduino server is not running. Open a second terminal and run: node server/index.js";

/** Parse a fetch response as JSON, with a helpful error if the server is unreachable */
async function safeJson<T>(res: Response): Promise<T> {
    const text = await res.text();
    if (!text.trim()) {
        throw new Error(SERVER_NOT_RUNNING);
    }
    try {
        return JSON.parse(text) as T;
    } catch {
        if (!res.ok) {
            throw new Error(`${SERVER_NOT_RUNNING} (HTTP ${res.status})`);
        }
        throw new Error(`Unexpected response from server: ${text.slice(0, 120)}`);
    }
}

/** Fetch available serial ports */
export async function fetchPorts(): Promise<{ success: boolean; ports: ArduinoPort[]; error?: string }> {
    const res = await fetch(`${BASE}/ports`);
    return safeJson(res);
}

/** Compile a sketch */
export async function compileSketch(
    code: string,
    fqbn: string
): Promise<ArduinoApiResponse> {
    const res = await fetch(`${BASE}/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, fqbn }),
    });
    return safeJson(res);
}

/** Compile and upload a sketch to the given port */
export async function uploadSketch(
    code: string,
    fqbn: string,
    port: string
): Promise<ArduinoApiResponse> {
    const res = await fetch(`${BASE}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, fqbn, port }),
    });
    return safeJson(res);
}

/** Well-known boards available in the toolbar */
export const KNOWN_BOARDS: ArduinoBoard[] = [
    { name: "Arduino Uno", fqbn: "arduino:avr:uno" },
    { name: "Arduino Nano", fqbn: "arduino:avr:nano" },
    { name: "Arduino Mega 2560", fqbn: "arduino:avr:mega" },
    { name: "Arduino Leonardo", fqbn: "arduino:avr:leonardo" },
    { name: "ESP32 Dev Module", fqbn: "esp32:esp32:esp32" },
    { name: "ESP8266 NodeMCU", fqbn: "esp8266:esp8266:nodemcuv2" },
];

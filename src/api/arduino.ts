import type { ArduinoPort, ArduinoBoard, ArduinoApiResponse } from "../types/arduino";

const BASE = "/api/arduino";
const HEALTH = "/health";
const START_HINT = "Start full stack with: npm run dev:full";

const SERVER_NOT_RUNNING = `Arduino server is not running. ${START_HINT}`;

function parseMaybeJson(text: string): any | null {
    if (!text.trim()) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function offlineError(status?: number): Error {
    const suffix = typeof status === "number" ? ` (HTTP ${status})` : "";
    return new Error(`${SERVER_NOT_RUNNING}${suffix}`);
}

function normalizeServerError(
    status: number,
    payload: any | null,
    fallbackText: string
): Error {
    if (status === 503 || status === 502 || status === 504) {
        return offlineError(status);
    }
    const backendMsg =
        (payload && typeof payload === "object" ? payload.error || payload.message : "") ||
        fallbackText;
    const text = String(backendMsg || "").trim();
    if (!text) return new Error(`Arduino API request failed (HTTP ${status})`);
    return new Error(`${text} (HTTP ${status})`);
}

/** Parse a fetch response as JSON, with a helpful error if the server is unreachable */
async function safeJson<T>(res: Response): Promise<T> {
    const text = await res.text();
    const payload = parseMaybeJson(text);

    if (!res.ok) {
        throw normalizeServerError(res.status, payload, text.slice(0, 200));
    }

    if (!text.trim()) {
        throw offlineError();
    }

    if (payload !== null) {
        return payload as T;
    }

    if (res.status === 503) {
        throw offlineError(res.status);
    }

    throw new Error(`Unexpected response from server: ${text.slice(0, 120)}`);
}

async function fetchWithOfflineHandling(url: string, init?: RequestInit): Promise<Response> {
    try {
        return await fetch(url, init);
    } catch {
        throw offlineError();
    }
}

/** Probe backend reachability before compile/upload operations */
export async function ensureArduinoServerReachable(): Promise<void> {
    const res = await fetchWithOfflineHandling(HEALTH);
    if (!res.ok) {
        throw offlineError(res.status);
    }
    const body = await res.text();
    const payload = parseMaybeJson(body);
    if (!payload || typeof payload !== "object" || payload.ok !== true) {
        throw new Error(`Unexpected response from server: ${body.slice(0, 120)}`);
    }
}

/** Fetch available serial ports */
export async function fetchPorts(): Promise<{ success: boolean; ports: ArduinoPort[]; error?: string }> {
    const res = await fetchWithOfflineHandling(`${BASE}/ports`);
    return safeJson(res);
}

/** Compile a sketch */
export async function compileSketch(
    files: string | { name: string; content: string }[],
    fqbn: string
): Promise<ArduinoApiResponse> {
    const body = typeof files === "string" 
        ? JSON.stringify({ code: files, fqbn })
        : JSON.stringify({ files, fqbn });

    const res = await fetchWithOfflineHandling(`${BASE}/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
    });
    return safeJson(res);
}

/** Compile and upload a sketch to the given port */
export async function uploadSketch(
    files: string | { name: string; content: string }[],
    fqbn: string,
    port: string
): Promise<ArduinoApiResponse> {
    const body = typeof files === "string"
        ? JSON.stringify({ code: files, fqbn, port })
        : JSON.stringify({ files, fqbn, port });

    const res = await fetchWithOfflineHandling(`${BASE}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
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

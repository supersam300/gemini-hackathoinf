/** Circuit summary returned by the list endpoint */
export interface CircuitSummary {
    _id: string;
    projectName: string;
    language: string;
    componentCount: number;
    createdAt: string;
    updatedAt: string;
}

/** Full circuit document returned by the load endpoint */
export interface CircuitDocument {
    _id: string;
    projectName: string;
    code: string;
    language: "c" | "cpp" | "python";
    components: {
        nodeId: string;
        type: string;
        componentType: string;
        label: string;
        position: { x: number; y: number };
        properties: Record<string, unknown>;
        handles: { inputs: string[]; outputs: string[] };
    }[];
    connections: {
        edgeId: string;
        from: { nodeId: string; componentType: string; handle: string };
        to: { nodeId: string; componentType: string; handle: string };
        type: string;
    }[];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

const BASE = "/api/circuits";

/** Save a circuit to MongoDB. Returns the saved document ID. */
export async function saveCircuit(data: {
    _id?: string;
    projectName: string;
    code: string;
    language: string;
    components: CircuitDocument["components"];
    connections: CircuitDocument["connections"];
}): Promise<{ success: boolean; id: string; circuit: CircuitDocument }> {
    const res = await fetch(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

/** List all saved circuits (summary). */
export async function listCircuits(): Promise<{ success: boolean; circuits: CircuitSummary[] }> {
    const res = await fetch(BASE);
    if (!res.ok) {
        throw new Error(`Failed to load circuits (HTTP ${res.status})`);
    }
    return res.json();
}

/** Load a single circuit by ID. */
export async function loadCircuit(id: string): Promise<{ success: boolean; circuit: CircuitDocument }> {
    const res = await fetch(`${BASE}/${id}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Not found" }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

/** Delete a circuit by ID. */
export async function deleteCircuit(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Delete failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

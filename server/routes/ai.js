const express = require("express");
const router = express.Router();
const { similaritySearch, ingestDocument, analyzeImage, runCanvasAgent } = require("../services/geminiService");
const { getHistory, appendTurn } = require("../services/aiSessionStore");
const { randomUUID } = require("crypto");
const {
    hashText,
    computeActionMetrics,
    appendTelemetry,
    appendFeedback,
    getRecentTelemetry,
    summarizeTelemetry,
} = require("../services/aiTelemetryStore");
const { resolveModelForSession } = require("../services/aiModelRouter");

// POST /api/ai/ingest
router.post("/ingest", async (req, res) => {
    try {
        const { text, metadata } = req.body;
        if (!text) {
            return res.status(400).json({ success: false, error: "Text is required for ingestion" });
        }

        const doc = await ingestDocument(text, metadata);
        res.status(201).json({ success: true, docId: doc._id });
    } catch (error) {
        console.error("[POST /api/ai/ingest] error:", error);
        res.status(500).json({ success: false, error: "Failed to ingest document" });
    }
});

// POST /api/ai/search
router.post("/search", async (req, res) => {
    try {
        const { query, limit } = req.body;
        if (!query) {
            return res.status(400).json({ success: false, error: "Query is required for search" });
        }

        const results = await similaritySearch(query, limit);
        res.status(200).json({ success: true, results });
    } catch (error) {
        console.error("[POST /api/ai/search] error:", error);
        res.status(500).json({ success: false, error: "Failed to search documents" });
    }
});

// POST /api/ai/vision
router.post("/vision", async (req, res) => {
    try {
        const { image, prompt } = req.body;
        if (!image || !prompt) {
            return res.status(400).json({ success: false, error: "Image (base64) and prompt are required" });
        }

        const analysis = await analyzeImage(image, prompt);
        res.status(200).json({ success: true, analysis });
    } catch (error) {
        console.error("[POST /api/ai/vision] error:", error);
        res.status(500).json({ success: false, error: "Failed to analyze image" });
    }
});

const { spawn } = require('child_process');
const path = require('path');

function resolvePythonRuntime() {
    const configured = process.env.PYTHON_EXECUTABLE;
    if (configured && String(configured).trim()) {
        return { command: String(configured).trim().replace(/^"(.*)"$/, "$1"), prefixArgs: [] };
    }

    if (process.platform === "win32") {
        // The Python launcher is the most reliable default on Windows.
        return { command: "py", prefixArgs: ["-3"] };
    }

    return { command: "python3", prefixArgs: [] };
}

// POST /api/ai/agent
router.post("/agent", async (req, res) => {
    try {
        const startedAtMs = Date.now();
        const eventId = randomUUID();
        const { prompt, canvasState, image, model, sessionId, mode, policyVariant } = req.body;
        if (!prompt) {
            return res.status(400).json({ success: false, error: "Prompt is required" });
        }
        const resolvedSessionId = sessionId || randomUUID();
        const promptHash = hashText(prompt);
        const modelRouting = resolveModelForSession({ requestedModel: model, sessionId: resolvedSessionId });
        const history = getHistory(resolvedSessionId);

        const scriptPath = path.join(__dirname, "../services/agent.py");
        const pythonRuntime = resolvePythonRuntime();

        console.log("[POST /api/ai/agent] Spawning local AI agent process");

        const env = { ...process.env }; // Just pass standard env which includes GEMINI_API_KEY

        const pythonProcess = spawn(
            pythonRuntime.command,
            [...pythonRuntime.prefixArgs, scriptPath],
            { env }
        );

        let outputData = "";
        let errorData = "";

        pythonProcess.stdout.on("data", (data) => {
            outputData += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            errorData += data.toString();
        });

        pythonProcess.on("error", (error) => {
            console.error("[POST /api/ai/agent] Failed to spawn python process:", error);
            const installHint = process.platform === "win32"
                ? "Install Python 3 from https://www.python.org/downloads/windows/ and ensure `py` or `python` is available."
                : "Install Python 3 and ensure `python3` is available.";
            appendTelemetry({
                eventId,
                sessionId: resolvedSessionId,
                promptHash,
                promptPreview: String(prompt).slice(0, 160),
                promptLength: String(prompt).length,
                mode: mode || "default",
                modelRequested: model || null,
                modelResolved: modelRouting.modelResolved,
                modelRoute: modelRouting.route,
                canaryBucket: modelRouting.canaryBucket,
                success: false,
                validJson: false,
                fallbackUsed: false,
                error: String(error?.message || "spawn failed"),
                latencyMs: Date.now() - startedAtMs,
                imageAttached: Boolean(image),
                canvasComponentCount: Array.isArray(canvasState?.components) ? canvasState.components.length : 0,
                canvasWireCount: Array.isArray(canvasState?.wires) ? canvasState.wires.length : 0,
            });
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: `Failed to spawn Python process (${pythonRuntime.command}). ${installHint} You can also set PYTHON_EXECUTABLE.`,
                });
            }
        });

        // Write the payload to stdin
        pythonProcess.stdin.write(JSON.stringify({ 
            prompt, 
            canvasState: canvasState || {},
            image,
            model: modelRouting.modelResolved,
            sessionId: resolvedSessionId,
            history,
            mode,
            policyVariant
        }));
        pythonProcess.stdin.end();

        pythonProcess.on("close", (code) => {
            if (code !== 0) {
                console.error("[POST /api/ai/agent] Python script exited with code", code);
                console.error("Stderr:", errorData);
                appendTelemetry({
                    eventId,
                    sessionId: resolvedSessionId,
                    promptHash,
                    promptPreview: String(prompt).slice(0, 160),
                    promptLength: String(prompt).length,
                    mode: mode || "default",
                    modelRequested: model || null,
                    modelResolved: modelRouting.modelResolved,
                    modelRoute: modelRouting.route,
                    canaryBucket: modelRouting.canaryBucket,
                    success: false,
                    validJson: false,
                    fallbackUsed: false,
                    error: String(errorData || `Agent process failed with code ${code}`),
                    latencyMs: Date.now() - startedAtMs,
                    imageAttached: Boolean(image),
                    canvasComponentCount: Array.isArray(canvasState?.components) ? canvasState.components.length : 0,
                    canvasWireCount: Array.isArray(canvasState?.wires) ? canvasState.wires.length : 0,
                });
                if (!res.headersSent) {
                    return res.status(500).json({ success: false, error: "Agent process failed" });
                }
            }

            try {
                // Parse the final JSON from the python script
                const result = JSON.parse(outputData);
                console.log(
                    "[POST /api/ai/agent] result:",
                    { success: !!result.success, actionCount: Array.isArray(result.actions) ? result.actions.length : 0 }
                );
                const actionMetrics = computeActionMetrics(canvasState || {}, result.actions || []);
                const fallbackUsed = Boolean(result?.meta?.fallbackUsed);
                appendTelemetry({
                    eventId,
                    sessionId: resolvedSessionId,
                    promptHash,
                    promptPreview: String(prompt).slice(0, 160),
                    promptLength: String(prompt).length,
                    mode: mode || "default",
                    modelRequested: model || null,
                    modelResolved: modelRouting.modelResolved,
                    modelRoute: modelRouting.route,
                    canaryBucket: modelRouting.canaryBucket,
                    success: Boolean(result.success),
                    validJson: true,
                    fallbackUsed,
                    error: result?.success ? null : String(result?.error || ""),
                    latencyMs: Date.now() - startedAtMs,
                    imageAttached: Boolean(image),
                    canvasComponentCount: Array.isArray(canvasState?.components) ? canvasState.components.length : 0,
                    canvasWireCount: Array.isArray(canvasState?.wires) ? canvasState.wires.length : 0,
                    ...actionMetrics,
                    actionTypes: Array.isArray(result.actions)
                        ? result.actions.map((a) => String(a?.type || "").toUpperCase())
                        : [],
                    parseRepairUsed: Boolean(result?.meta?.parseRepairUsed),
                    retryUsed: Boolean(result?.meta?.retryUsed),
                    actionIntent: Boolean(result?.meta?.wantsActions),
                    prompt: process.env.AI_TELEMETRY_STORE_RAW_PROMPT === "true" ? prompt : undefined,
                    canvasState: process.env.AI_TELEMETRY_STORE_RAW_CANVAS === "true" ? canvasState : undefined,
                    responseText: process.env.AI_TELEMETRY_STORE_RAW_TEXT === "true" ? result.text : undefined,
                    actions: process.env.AI_TELEMETRY_STORE_RAW_ACTIONS === "true" ? (result.actions || []) : undefined,
                });
                if (result.success) {
                    appendTurn(resolvedSessionId, "user", prompt);
                    appendTurn(resolvedSessionId, "assistant", result.text || "");
                }
                res.status(200).json({
                    ...result,
                    eventId,
                    modelResolved: modelRouting.modelResolved,
                    modelRoute: modelRouting.route,
                    sessionId: resolvedSessionId,
                });
            } catch (e) {
                console.error("[POST /api/ai/agent] Failed to parse python output:", outputData);
                appendTelemetry({
                    eventId,
                    sessionId: resolvedSessionId,
                    promptHash,
                    promptPreview: String(prompt).slice(0, 160),
                    promptLength: String(prompt).length,
                    mode: mode || "default",
                    modelRequested: model || null,
                    modelResolved: modelRouting.modelResolved,
                    modelRoute: modelRouting.route,
                    canaryBucket: modelRouting.canaryBucket,
                    success: false,
                    validJson: false,
                    fallbackUsed: false,
                    error: "Invalid agent output formatting",
                    rawOutputPreview: String(outputData || "").slice(0, 500),
                    latencyMs: Date.now() - startedAtMs,
                    imageAttached: Boolean(image),
                    canvasComponentCount: Array.isArray(canvasState?.components) ? canvasState.components.length : 0,
                    canvasWireCount: Array.isArray(canvasState?.wires) ? canvasState.wires.length : 0,
                });
                res.status(500).json({ success: false, error: "Invalid agent output formatting" });
            }
        });

    } catch (error) {
        console.error("[POST /api/ai/agent] error:", error);
        res.status(500).json({ success: false, error: "Failed to run agent" });
    }
});

// POST /api/ai/feedback
router.post("/feedback", (req, res) => {
    try {
        const { eventId, outcome, correctedActions, notes } = req.body || {};
        const normalizedOutcome = String(outcome || "").toLowerCase();
        if (!eventId) {
            return res.status(400).json({ success: false, error: "eventId is required" });
        }
        if (!["accepted", "corrected", "rejected"].includes(normalizedOutcome)) {
            return res.status(400).json({ success: false, error: "outcome must be accepted|corrected|rejected" });
        }
        appendFeedback({
            eventId: String(eventId),
            outcome: normalizedOutcome,
            correctedActions: Array.isArray(correctedActions) ? correctedActions : undefined,
            notes: typeof notes === "string" ? notes.slice(0, 1000) : undefined,
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("[POST /api/ai/feedback] error:", error);
        return res.status(500).json({ success: false, error: "Failed to store feedback" });
    }
});

// GET /api/ai/telemetry
router.get("/telemetry", (req, res) => {
    try {
        const limit = Number(req.query.limit || 100);
        const events = getRecentTelemetry(Number.isNaN(limit) ? 100 : limit);
        res.status(200).json({ success: true, events });
    } catch (error) {
        console.error("[GET /api/ai/telemetry] error:", error);
        res.status(500).json({ success: false, error: "Failed to load telemetry" });
    }
});

// GET /api/ai/metrics
router.get("/metrics", (req, res) => {
    try {
        const hours = Number(req.query.hours || 24 * 7);
        const model = req.query.model ? String(req.query.model) : "";
        const summary = summarizeTelemetry({
            hours: Number.isNaN(hours) ? 24 * 7 : hours,
            model,
        });
        res.status(200).json({ success: true, summary });
    } catch (error) {
        console.error("[GET /api/ai/metrics] error:", error);
        res.status(500).json({ success: false, error: "Failed to summarize metrics" });
    }
});

// GET /api/ai/history/:sessionId
router.get("/history/:sessionId", (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        if (!sessionId) {
            return res.status(400).json({ success: false, error: "sessionId is required" });
        }
        const history = getHistory(sessionId);
        res.status(200).json({ success: true, sessionId, history });
    } catch (error) {
        console.error("[GET /api/ai/history/:sessionId] error:", error);
        res.status(500).json({ success: false, error: "Failed to load history" });
    }
});

module.exports = router;

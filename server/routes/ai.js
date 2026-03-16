const express = require("express");
const router = express.Router();
const { similaritySearch, ingestDocument, analyzeImage, runCanvasAgent } = require("../services/geminiService");
const { getHistory, appendTurn } = require("../services/aiSessionStore");
const { randomUUID } = require("crypto");

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

// POST /api/ai/agent
router.post("/agent", async (req, res) => {
    try {
        const { prompt, canvasState, image, model, sessionId, mode } = req.body;
        if (!prompt) {
            return res.status(400).json({ success: false, error: "Prompt is required" });
        }
        const resolvedSessionId = sessionId || randomUUID();
        const history = getHistory(resolvedSessionId);

        const scriptPath = path.join(__dirname, "../services/agent.py");
        const pythonExecutable = "python3";

        console.log("[POST /api/ai/agent] Spawning local AI agent process");

        const env = { ...process.env }; // Just pass standard env which includes GEMINI_API_KEY

        const pythonProcess = spawn(pythonExecutable, [scriptPath], { env });

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
            if (!res.headersSent) {
                res.status(500).json({ success: false, error: "Failed to spawn Python process. Is the virtual environment set up correctly?" });
            }
        });

        // Write the payload to stdin
        pythonProcess.stdin.write(JSON.stringify({ 
            prompt, 
            canvasState: canvasState || {},
            image,
            model,
            sessionId: resolvedSessionId,
            history,
            mode
        }));
        pythonProcess.stdin.end();

        pythonProcess.on("close", (code) => {
            if (code !== 0) {
                console.error("[POST /api/ai/agent] Python script exited with code", code);
                console.error("Stderr:", errorData);
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
                if (result.success) {
                    appendTurn(resolvedSessionId, "user", prompt);
                    appendTurn(resolvedSessionId, "assistant", result.text || "");
                }
                res.status(200).json({
                    ...result,
                    sessionId: resolvedSessionId,
                });
            } catch (e) {
                console.error("[POST /api/ai/agent] Failed to parse python output:", outputData);
                res.status(500).json({ success: false, error: "Invalid agent output formatting" });
            }
        });

    } catch (error) {
        console.error("[POST /api/ai/agent] error:", error);
        res.status(500).json({ success: false, error: "Failed to run agent" });
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

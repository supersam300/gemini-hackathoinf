const express = require("express");
const router = express.Router();
const { similaritySearch, ingestDocument, analyzeImage, runCanvasAgent } = require("../services/geminiService");

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
        const { prompt, canvasState } = req.body;
        if (!prompt) {
            return res.status(400).json({ success: false, error: "Prompt is required" });
        }

        const scriptPath = path.join(__dirname, "../services/agent.py");
        // Absolute path to venv python
        const venvDir = path.join(__dirname, "../venv");
        const pythonExecutable = path.join(venvDir, "bin/python3");

        console.log("[POST /api/ai/agent] Spawning python, GEMINI_API_KEY exists?", !!process.env.GEMINI_API_KEY);

        // Replicate 'source venv/bin/activate' by setting relevant env vars
        const env = {
            ...process.env,
            VIRTUAL_ENV: venvDir,
            PATH: `${path.join(venvDir, "bin")}:${process.env.PATH}`,
            PYTHONHOME: undefined, // Clear PYTHONHOME so venv is used
            PYTHONPATH: undefined, // Clear PYTHONPATH to prevent namespace conflicts
        };
        delete env.PYTHONHOME;
        delete env.PYTHONPATH;

        const pythonProcess = spawn(pythonExecutable, [scriptPath], { env });

        let outputData = "";
        let errorData = "";

        pythonProcess.stdout.on("data", (data) => {
            outputData += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            errorData += data.toString();
        });

        // Write the payload to stdin
        pythonProcess.stdin.write(JSON.stringify({ prompt, canvasState: canvasState || {} }));
        pythonProcess.stdin.end();

        pythonProcess.on("close", (code) => {
            if (code !== 0) {
                console.error("[POST /api/ai/agent] Python script exited with code", code);
                console.error("Stderr:", errorData);
                return res.status(500).json({ success: false, error: "Agent process failed" });
            }

            try {
                // Parse the final JSON from the python script
                const result = JSON.parse(outputData);
                res.status(200).json(result);
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

module.exports = router;

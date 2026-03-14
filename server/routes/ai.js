const express = require("express");
const router = express.Router();
const { similaritySearch, ingestDocument, analyzeImage } = require("../services/geminiService");

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

module.exports = router;

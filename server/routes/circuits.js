const express = require("express");
const router = express.Router();
const Circuit = require("../models/Circuit");

/**
 * POST /api/circuits
 * Save a new circuit (or update an existing one if `_id` is provided).
 * Body: { projectName, code, language, components, connections, _id? }
 */
router.post("/", async (req, res) => {
    const { _id, projectName, code, language, components, connections, metadata } = req.body;

    if (!projectName || typeof projectName !== "string") {
        return res.status(400).json({ success: false, error: "projectName is required" });
    }

    try {
        let circuit;
        if (_id) {
            // Update existing
            circuit = await Circuit.findByIdAndUpdate(
                _id,
                { projectName, code, language, components, connections, metadata },
                { new: true, runValidators: true }
            );
            if (!circuit) {
                // ID provided but not found — create new
                circuit = await Circuit.create({ projectName, code, language, components, connections, metadata });
            }
        } else {
            circuit = await Circuit.create({ projectName, code, language, components, connections, metadata });
        }
        res.json({ success: true, id: circuit._id, circuit });
    } catch (err) {
        console.error("[circuits] save error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/circuits
 * List all saved circuits (summary only).
 */
router.get("/", async (_req, res) => {
    try {
        const circuits = await Circuit.find({})
            .select("projectName language createdAt updatedAt components")
            .sort({ updatedAt: -1 })
            .lean();

        const list = circuits.map((c) => ({
            _id: c._id,
            projectName: c.projectName,
            language: c.language,
            componentCount: c.components ? c.components.length : 0,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        }));

        res.json({ success: true, circuits: list });
    } catch (err) {
        console.error("[circuits] list error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/circuits/:id
 * Load a single circuit by ID (full document).
 */
router.get("/:id", async (req, res) => {
    try {
        const circuit = await Circuit.findById(req.params.id).lean();
        if (!circuit) {
            return res.status(404).json({ success: false, error: "Circuit not found" });
        }
        res.json({ success: true, circuit });
    } catch (err) {
        console.error("[circuits] load error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * DELETE /api/circuits/:id
 * Delete a saved circuit.
 */
router.delete("/:id", async (req, res) => {
    try {
        const result = await Circuit.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ success: false, error: "Circuit not found" });
        }
        res.json({ success: true });
    } catch (err) {
        console.error("[circuits] delete error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

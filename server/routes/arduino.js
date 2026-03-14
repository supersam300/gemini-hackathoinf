const express = require("express");
const router = express.Router();
const { compileSketch, uploadSketch, listPorts } = require("../services/arduinoCli");

/**
 * GET /api/arduino/ports
 * Returns available serial ports detected by arduino-cli
 */
router.get("/ports", async (req, res) => {
    const result = await listPorts();

    if (!result.success) {
        return res.status(500).json({
            success: false,
            ports: [],
            error: result.error || "Failed to list ports",
        });
    }

    let ports = [];
    try {
        const parsed = JSON.parse(result.output);
        // arduino-cli board list --format json returns an array of detected_ports
        const detected = parsed.detected_ports || parsed || [];
        ports = detected.map((entry) => ({
            address: entry.port?.address || entry.address || "",
            label: entry.matching_boards?.[0]?.name || entry.port?.address || entry.address || "Unknown device",
            protocol: entry.port?.protocol || "serial",
        })).filter((p) => p.address);
    } catch {
        // If JSON parse fails, return empty — arduino-cli not installed or no ports
        ports = [];
    }

    res.json({ success: true, ports });
});

/**
 * POST /api/arduino/compile
 * Body: { files: Array, fqbn: string }
 */
router.post("/compile", async (req, res) => {
    const { files, code, fqbn } = req.body;

    // Support both single "code" string (backward compat) and "files" array
    const sketchFiles = files || (code ? [{ name: "sketch.ino", content: code }] : null);

    if (!sketchFiles || !Array.isArray(sketchFiles)) {
        return res.status(400).json({ success: false, error: "files array is required" });
    }
    if (!fqbn || typeof fqbn !== "string") {
        return res.status(400).json({ success: false, error: "fqbn (board) is required" });
    }

    const result = await compileSketch(sketchFiles, fqbn);
    res.json(result);
});

/**
 * POST /api/arduino/upload
 * Body: { files: Array, fqbn: string, port: string }
 */
router.post("/upload", async (req, res) => {
    const { files, code, fqbn, port } = req.body;

    const sketchFiles = files || (code ? [{ name: "sketch.ino", content: code }] : null);

    if (!sketchFiles || !Array.isArray(sketchFiles)) {
        return res.status(400).json({ success: false, error: "files array is required" });
    }
    if (!fqbn || typeof fqbn !== "string") {
        return res.status(400).json({ success: false, error: "fqbn (board) is required" });
    }
    if (!port || typeof port !== "string") {
        return res.status(400).json({ success: false, error: "port is required" });
    }

    const result = await uploadSketch(sketchFiles, fqbn, port);
    res.json(result);
});

module.exports = router;

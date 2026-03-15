require("express-async-errors");
const express = require("express");
const cors = require("cors");
const path = require("path");
// Load environment variables from the project root
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const connectDB = require("./db");
const arduinoRoutes = require("./routes/arduino");
const circuitRoutes = require("./routes/circuits");
const aiRoutes = require("./routes/ai");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ─────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

// ─── Routes ─────────────────────────────────────────────────
app.use("/api/arduino", arduinoRoutes);
app.use("/api/circuits", circuitRoutes);
app.use("/api/ai", aiRoutes);

// ─── Health check ────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true }));

// ─── Serve Static Files (Production) ──────────────────────────
if (process.env.NODE_ENV === "production") {
    const distPath = path.join(__dirname, "../dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
        // Only serve index.html for non-API routes
        if (!req.path.startsWith("/api/")) {
            res.sendFile(path.join(distPath, "index.html"));
        } else {
            res.status(404).json({ success: false, error: "API route not found" });
        }
    });
}

// ─── Error handler ───────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error("[server error]", err);
    res.status(500).json({ success: false, error: err.message });
});

// ─── Start ───────────────────────────────────────────────────
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`✅  SimuIDE server running on http://localhost:${PORT}`);
        console.log(`   Endpoints:`);
        console.log(`     GET  /api/arduino/ports`);
        console.log(`     POST /api/arduino/compile`);
        console.log(`     POST /api/arduino/upload`);
        console.log(`     GET  /api/circuits`);
        console.log(`     POST /api/circuits`);
        console.log(`     GET  /api/circuits/:id`);
        console.log(`     DEL  /api/circuits/:id`);
        console.log(`     POST /api/ai/ingest`);
        console.log(`     POST /api/ai/search`);
        console.log(`     POST /api/ai/vision`);
    });
});

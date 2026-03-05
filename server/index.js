require("express-async-errors");
const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
const arduinoRoutes = require("./routes/arduino");
const circuitRoutes = require("./routes/circuits");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ─────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

// ─── Routes ─────────────────────────────────────────────────
app.use("/api/arduino", arduinoRoutes);
app.use("/api/circuits", circuitRoutes);

// ─── Health check ────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true }));

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
    });
});

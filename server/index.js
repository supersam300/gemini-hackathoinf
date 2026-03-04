require("express-async-errors");
const express = require("express");
const cors = require("cors");
const arduinoRoutes = require("./routes/arduino");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ─────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

// ─── Routes ─────────────────────────────────────────────────
app.use("/api/arduino", arduinoRoutes);

// ─── Health check ────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true }));

// ─── Error handler ───────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error("[server error]", err);
    res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
    console.log(`✅  SimuIDE Arduino server running on http://localhost:${PORT}`);
    console.log(`   Endpoints:`);
    console.log(`     GET  /api/arduino/ports`);
    console.log(`     POST /api/arduino/compile`);
    console.log(`     POST /api/arduino/upload`);
});

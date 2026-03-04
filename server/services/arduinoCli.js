const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Run an arduino-cli command and stream output.
 * Returns { success, output, error }
 */
function runArduinoCli(args, opts = {}) {
    return new Promise((resolve) => {
        const proc = spawn("arduino-cli", args, {
            ...opts,
            env: { ...process.env },
        });

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (d) => { stdout += d.toString(); });
        proc.stderr.on("data", (d) => { stderr += d.toString(); });

        proc.on("close", (code) => {
            resolve({
                success: code === 0,
                output: stdout,
                error: stderr || undefined,
            });
        });

        proc.on("error", (err) => {
            resolve({
                success: false,
                output: "",
                error: `Failed to start arduino-cli: ${err.message}. Make sure it is installed (brew install arduino-cli).`,
            });
        });
    });
}

/**
 * Write sketch code to a temporary directory and return the sketch dir path.
 * arduino-cli requires the .ino file to be inside a folder with the same name.
 */
function writeSketch(code) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simulide-sketch-"));
    const sketchName = path.basename(dir);
    const sketchFile = path.join(dir, `${sketchName}.ino`);
    fs.writeFileSync(sketchFile, code, "utf-8");
    return dir;
}

/**
 * Compile a sketch.
 * @param {string} code   - Arduino sketch source code
 * @param {string} fqbn   - Fully Qualified Board Name (e.g. "arduino:avr:uno")
 */
async function compileSketch(code, fqbn) {
    const sketchDir = writeSketch(code);
    try {
        const result = await runArduinoCli([
            "compile",
            "--fqbn", fqbn,
            "--log-level", "info",
            "--format", "text",
            sketchDir,
        ]);
        return result;
    } finally {
        fs.rmSync(sketchDir, { recursive: true, force: true });
    }
}

/**
 * Compile and upload a sketch.
 * @param {string} code   - Arduino sketch source code
 * @param {string} fqbn   - Fully Qualified Board Name
 * @param {string} port   - Serial port (e.g. /dev/cu.usbmodem14101)
 */
async function uploadSketch(code, fqbn, port) {
    const sketchDir = writeSketch(code);
    try {
        // First compile
        const compileResult = await runArduinoCli([
            "compile",
            "--fqbn", fqbn,
            "--log-level", "info",
            "--format", "text",
            sketchDir,
        ]);

        if (!compileResult.success) {
            return {
                success: false,
                output: compileResult.output,
                error: compileResult.error || "Compilation failed",
            };
        }

        // Then upload
        const uploadResult = await runArduinoCli([
            "upload",
            "--fqbn", fqbn,
            "--port", port,
            "--log-level", "info",
            "--format", "text",
            sketchDir,
        ]);

        return {
            success: uploadResult.success,
            output: [compileResult.output, uploadResult.output].filter(Boolean).join("\n"),
            error: uploadResult.error,
        };
    } finally {
        fs.rmSync(sketchDir, { recursive: true, force: true });
    }
}

/**
 * List detected serial ports with connected boards.
 */
async function listPorts() {
    return runArduinoCli(["board", "list", "--format", "json"]);
}

module.exports = { compileSketch, uploadSketch, listPorts };

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
 * Write sketch files to a temporary directory and return the sketch dir path.
 * arduino-cli requires the .ino file to be inside a folder with the same name.
 * files: [{ name: string, content: string }]
 */
function writeSketch(files) {
    const tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), "simulide-sketch-"));
    
    // Find the main .ino file
    const mainIno = files.find(f => f.name.endsWith(".ino"));
    if (!mainIno) {
        // If no .ino, create a dummy one based on project name or just fail gracefully
        // For now, let's assume there's at least one .ino as per user request
        throw new Error("No .ino file found in the project.");
    }

    const sketchName = path.basename(mainIno.name, ".ino");
    const sketchDir = path.join(tempBaseDir, sketchName);
    fs.mkdirSync(sketchDir, { recursive: true });
    
    files.forEach(file => {
        const filePath = path.join(sketchDir, file.name);
        fs.writeFileSync(filePath, file.content, "utf-8");
    });

    return sketchDir;
}

/**
 * Compile a sketch.
 * @param {Array} files   - Array of objects { name, content }
 * @param {string} fqbn   - Fully Qualified Board Name (e.g. "arduino:avr:uno")
 */
async function compileSketch(files, fqbn) {
    const sketchDir = writeSketch(files);
    try {
        const result = await runArduinoCli([
            "compile",
            "--fqbn", fqbn,
            "--output-dir", sketchDir,
            "--log-level", "info",
            "--format", "text",
            sketchDir,
        ]);

        // Try to read the .hex file for simulation
        let hex = null;
        if (result.success) {
            try {
                const dirFiles = fs.readdirSync(sketchDir);
                const hexFile = dirFiles.find((f) => f.endsWith(".hex"));
                if (hexFile) {
                    hex = fs.readFileSync(path.join(sketchDir, hexFile), "utf-8");
                }
            } catch {
                // hex reading is optional
            }
        }

        return { ...result, hex };
    } finally {
        fs.rmSync(sketchDir, { recursive: true, force: true });
    }
}

/**
 * Compile and upload a sketch.
 * @param {Array} files   - Array of objects { name, content }
 * @param {string} fqbn   - Fully Qualified Board Name
 * @param {string} port   - Serial port (e.g. /dev/cu.usbmodem14101)
 */
async function uploadSketch(files, fqbn, port) {
    const sketchDir = writeSketch(files);
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

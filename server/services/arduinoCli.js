const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

function getArduinoCliInstallHint() {
    switch (process.platform) {
        case "darwin":
            return "brew install arduino-cli";
        case "linux":
            return "Install arduino-cli (e.g. Arch: sudo pacman -S arduino-cli, Ubuntu: sudo snap install arduino-cli --classic)";
        case "win32":
            return "Install via winget: winget install ArduinoSA.CLI";
        default:
            return "Install arduino-cli and ensure it is in PATH";
    }
}

function resolveArduinoCliBinary() {
    const configured = process.env.ARDUINO_CLI_PATH || process.env.ARDUINO_CLI_BIN;
    if (configured && fs.existsSync(configured)) {
        return configured;
    }

    // Common locations for local/dev and containerized runtime.
    const candidates = [
        "/usr/local/bin/arduino-cli",
        "/usr/bin/arduino-cli",
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }

    // Fall back to PATH lookup by command name.
    return "arduino-cli";
}

/**
 * Run an arduino-cli command and stream output.
 * Returns { success, output, error }
 */
function runArduinoCli(args, opts = {}) {
    return new Promise((resolve) => {
        const arduinoCli = resolveArduinoCliBinary();
        const proc = spawn(arduinoCli, args, {
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
            const hint = getArduinoCliInstallHint();
            const missingBinaryError = err.code === "ENOENT"
                ? `Failed to start arduino-cli (${arduinoCli}): ${err.message}. ${hint}. You can also set ARDUINO_CLI_PATH=/absolute/path/to/arduino-cli.`
                : `Failed to start arduino-cli (${arduinoCli}): ${err.message}.`;
            resolve({
                success: false,
                output: "",
                error: missingBinaryError,
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

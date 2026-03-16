# SimuIDE

AI-assisted Arduino workspace: describe a project in plain English, and SimuIDE can place components, wire circuits, generate C++ code, verify builds, and run simulation.

This README is written as a reproducible runbook so a new machine can get from clone to working app.

## What You Need

- Node.js 20+
- npm 10+
- Python 3.10+ (3.11/3.12 recommended)
- `arduino-cli` installed and available in `PATH`
- Gemini API key
- MongoDB Atlas URI

## 1) Clone And Install

```bash
git clone <your-repo-url>
cd gemini-hackathoinf

npm install
cd server && npm install && cd ..
```

## 2) Configure Environment

Create `.env` in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=your_mongodb_atlas_uri
GEMINI_AGENT_MODEL=gemini-2.5-flash
PORT=3000

# Optional, if tools are not auto-detected:
# ARDUINO_CLI_PATH=/absolute/path/to/arduino-cli
# PYTHON_EXECUTABLE=/absolute/path/to/python3
```

Optional: if you run backend independently, mirror these values in `server/.env`.

## 3) Python Agent Setup

```bash
python3 -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate         # Windows PowerShell

pip install -r requirements.txt
```

## 4) Arduino CLI Setup (Required For Build/Upload)

Install `arduino-cli` first:

- macOS: `brew install arduino-cli`
- Windows: `winget install ArduinoSA.CLI`
- Linux: follow [official install docs](https://arduino.github.io/arduino-cli/latest/installation/)

Then install core packages:

```bash
arduino-cli version
arduino-cli core update-index
arduino-cli core install arduino:avr
```

## 5) Start The App

Use the unified command (recommended):

```bash
npm run dev:full
```

Open `http://localhost:5173`.

This command starts:
- Vite frontend (`5173`)
- Express backend (`3000`)

## 6) Smoke Test (Replication Check)

1. Open AI chat and prompt: `create a project with alternating blinking leds`
2. Confirm components are placed and labels are clean (no raw JSON blobs)
3. Click **Wire components for me** and confirm wires complete
4. Click **Build Project** and confirm compile output appears

If backend is not reachable, the app now points to the canonical recovery command:
`npm run dev:full`

## Common Issues And Fixes

### `Could not reach the Arduino server ... (HTTP 503)`

Cause: backend not running or proxy cannot reach it.

Fix:

```bash
npm run dev:full
```

If still failing:
- check `http://localhost:3000/health` returns `{ "ok": true }`
- ensure `.env` is present
- ensure port `3000` is free

### `Failed to start arduino-cli` / compile errors from CLI missing

Fix:
- install `arduino-cli`
- run:
  - `arduino-cli core update-index`
  - `arduino-cli core install arduino:avr`
- set `ARDUINO_CLI_PATH` if binary is not in `PATH`

### Python agent not launching

Fix:
- activate `.venv`
- `pip install -r requirements.txt`
- set `PYTHON_EXECUTABLE` if needed

## Docker (Optional)

### Compose

```bash
docker-compose up --build
```

### Single image

```bash
docker build -t simuide-web .
docker run -p 3000:3000 --env-file .env simuide-web
```

## Google Cloud Run / Cloud Build (Optional)

Project includes `cloudbuild.yaml` for automated build and deploy.

High-level:

1. Enable APIs: Cloud Run, Cloud Build, Artifact Registry, Secret Manager
2. Create Artifact Registry repo in `asia-south1`
3. Create secrets (`GEMINI_API_KEY`, `MONGODB_URI`)
4. Grant Cloud Build service account permissions:
   - `roles/run.admin`
   - `roles/iam.serviceAccountUser`
   - `roles/secretmanager.secretAccessor`
5. Create Cloud Build trigger for `main`

See `DOCKER.md` for detailed commands.

## Tech Stack

- Frontend: React, TypeScript, Vite, Zustand, `@wokwi/elements`
- Backend: Node.js, Express, Mongoose
- AI: Gemini (`@google/genai`) + Python agent runtime
- Simulation: `avr8js`
- Build/Upload: `arduino-cli`
- Deployment: Docker, Cloud Run, Cloud Build

## Extra Docs

- `FRONTEND.md`
- `PROJECT_STRUCTURE.md`
- `DOCKER.md`
- `MONGODB_EXPORT.md`

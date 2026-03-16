# SimuIDE Web - UI Navigator

A powerful, multimodal AI-powered circuit simulator and IDE. Drag and drop electronic components, design complex circuits, code your microcontrollers in C/C++, and simulate everything directly in the browser with the help of a Gemini-powered Visual UI Agent.

## Core Focus: Visual UI Understanding & Interaction

Build and test circuits with an agent that becomes your "hands on screen". The integrated Gemini agent observes the browser display, interprets visual elements (with or without relying on APIs or DOM access), and performs actions based on your intent.

## Key Features

- **Interactive Circuit Canvas:** Dynamic SVG-based grid for precision component placement and wiring.
- **Visual Gemini AI Agent:** Multimodal Visual QA agent that captures screenshots of your circuit and uses Gemini 1.5 Flash to debug wiring, suggest improvements, and execute canvas actions.
- **Advanced IDE Features:** Dynamic multi-file support (create `.ino`, `.cpp`, `.h` files) and project export as ZIP (includes all code and circuit data).
- **Simultaneous Simulation:** Real-time AVR simulation for Arduino (Uno, Nano, Mega) and ESP32 boards powered by `avr8js`.
- **Cloud Connectivity:** Seamlessly sync projects to MongoDB Atlas with semantic search capabilities.

## Prerequisites

- **Node.js**: v20 or higher
- **Python**: v3.10 or higher (for AI Agent)
- **Arduino CLI**: Required for code compilation and uploads. [Installation Guide](https://arduino.github.io/arduino-cli/latest/installation/)
- **Google Gemini API Key**: Obtain one from [Google AI Studio](https://aistudio.google.com/).
- **MongoDB Atlas**: A connection string for project syncing.

## Local Development

### 1. Environment Setup
Create a `.env` file in the root directory (and `server/` directory if running backend separately):
```env
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=your_mongodb_atlas_connection_string
PORT=3000
GEMINI_AGENT_MODEL=gemini-1.5-flash
# Optional overrides for local tool discovery:
# ARDUINO_CLI_PATH=C:\Program Files\Arduino CLI\arduino-cli.exe
# PYTHON_EXECUTABLE=C:\Users\<you>\AppData\Local\Programs\Python\Python313\python.exe
```

### 2. Frontend & Backend
Clone the repository and install Node.js dependencies:
```bash
npm install
cd server && npm install
cd ..
```

### 3. AI Agent (Python) Setup
The AI agent requires a Python environment. It's recommended to use a virtual environment:
```bash
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

The Python builder agent now uses Google GenAI with ADK-compatible runtime dependencies and keeps the same stdin/stdout JSON contract expected by the Node route.

### Windows Notes
- Install Arduino CLI with `winget install ArduinoSA.CLI`.
- Install Python 3 (includes `py` launcher by default).
- If the backend cannot find either tool, set `ARDUINO_CLI_PATH` and `PYTHON_EXECUTABLE` in `server/.env`.

### 4. Running the Application
Start both the Vite frontend and Expres backend using:
```bash
npm run dev:full
```
Open `http://localhost:5173` for the frontend.

## Running with Docker

You can run the entire stack (Frontend, Backend, and AI Agent) in a containerized environment.

### Using Docker Compose
```bash
docker-compose up --build
```

### Using Dockerfile (Production)
```bash
docker build -t simuide-web .
docker run -p 3000:3000 --env-file .env simuide-web
```

## Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **AI Engine:** Google Gemini (1.5 Flash & 1.5 Pro) via `google-genai` Python SDK
- **Builder Agent Runtime:** GenAI ADK-compatible Python agent (`server/services/agent.py`) invoked by backend subprocess
- **Backend:** Node.js, Express, MongoDB Atlas
- **Simulation:** AVR8js & `@wokwi/elements`
- **Compiler:** `arduino-cli` integrated into the backend pipeline

## Project Structure

```text
.
├── server/                     # Express Backend
│   ├── index.js                # Server entry point & static file serving
│   ├── routes/                 # API Routes (AI, Arduino, Circuits)
│   ├── services/               # Core logic (Gemini integration)
│   └── models/                 # MongoDB Schemas (Circuit, Document)
├── src/                        # React Frontend
│   ├── app/                    # Main application logic
│   │   ├── components/         # UI Components (Canvas, AI Panel, Menu)
│   │   └── components/arduino-ide/ # Complex IDE sub-system
│   ├── store/                  # Zustand state management
│   ├── api/                    # Frontend API clients
│   └── main.tsx                # Frontend entry point
├── Dockerfile                  # Production build script
├── docker-compose.yml          # Local container orchestration
└── README.md                   # You are here
```

## Documentation

Detailed documentation about specific parts of the project can be found in the following files:

- [`FRONTEND.md`](./FRONTEND.md) - Detailed guide to the React frontend architecture, stores, and components.
- [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md) - Overview of the directory layout and initial sprint framework.
- [`DOCKER.md`](./DOCKER.md) - Containerization instructions and deployment setups.
- [`MONGODB_EXPORT.md`](./MONGODB_EXPORT.md) - Database schema and data export documentation.

## Deployment to Google Cloud

This project is optimized for deployment on **Google Cloud Platform (GCP)**.

### 1. CI/CD Automation with Cloud Build Trigger (Production)
This repository includes `cloudbuild.yaml` for automated build + deploy to Cloud Run.

One-time setup:

```bash
# Set project context
gcloud config set project PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com

# Create Artifact Registry Docker repo
gcloud artifacts repositories create simuide \
  --repository-format=docker \
  --location=asia-south1 \
  --description="SimuIDE production images"

# Create runtime secrets (update values as needed)
printf '%s' 'YOUR_GEMINI_API_KEY' | gcloud secrets create GEMINI_API_KEY --data-file=- || true
printf '%s' 'YOUR_MONGODB_URI' | gcloud secrets create MONGODB_URI --data-file=- || true

# Add new versions when rotating values
printf '%s' 'YOUR_GEMINI_API_KEY' | gcloud secrets versions add GEMINI_API_KEY --data-file=-
printf '%s' 'YOUR_MONGODB_URI' | gcloud secrets versions add MONGODB_URI --data-file=-
```

Grant Cloud Build access to deploy Cloud Run and read secrets:

```bash
PROJECT_NUMBER="$(gcloud projects describe PROJECT_ID --format='value(projectNumber)')"
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

Create trigger (GitHub repo example):

```bash
gcloud builds triggers create github \
  --name="simuide-prod-main" \
  --repo-name="REPO_NAME" \
  --repo-owner="GITHUB_OWNER" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_REGION=asia-south1,_SERVICE_NAME=simuide,_REPO_NAME=simuide,_IMAGE_NAME=web,_ALLOW_UNAUTHENTICATED=true,_GEMINI_AGENT_MODEL=gemini-2.5-flash,_GEMINI_API_KEY_SECRET=GEMINI_API_KEY,_MONGODB_URI_SECRET=MONGODB_URI"
```

### 2. Required Runtime Configuration
Cloud Run deploy step sets:
- `NODE_ENV=production`
- `PORT=3000`
- `GEMINI_AGENT_MODEL=gemini-2.5-flash` (override via trigger substitutions)

Cloud Run deploy step reads secrets via Secret Manager:
- `GEMINI_API_KEY`
- `MONGODB_URI`

### 3. Manual Operations (if needed)
Manual deploy from latest commit:

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions="_REGION=asia-south1,_SERVICE_NAME=simuide,_REPO_NAME=simuide,_IMAGE_NAME=web"
```

Rollback to previous revision:

```bash
gcloud run revisions list --service=simuide --region=asia-south1
gcloud run services update-traffic simuide \
  --region=asia-south1 \
  --to-revisions REVISION_NAME=100
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

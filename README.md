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

### 1. Google Cloud Run (Containerized Backend + Frontend)
The `Dockerfile` is configured to build the frontend and serve it alongside the Node.js backend.
- Build the image: `gcloud builds submit --tag gcr.io/[PROJECT_ID]/simuide`
- Deploy to Cloud Run: `gcloud run deploy simuide --image gcr.io/[PROJECT_ID]/simuide --platform managed`

### 2. Environment Variables
Ensure the following variables are set in your Cloud Run environment:
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `MONGODB_URI`: Connection string for your MongoDB Atlas cluster.
- `NODE_ENV`: `production`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

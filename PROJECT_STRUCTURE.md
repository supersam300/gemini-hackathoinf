# SimuIDE Web - Project Architecture & Structure

## Overview
SimuIDE Web is a sophisticated, browser-based circuit simulator combined with a full Arduino-compatible IDE. It leverages Gemini Multimodal AI for visual circuit analysis and action execution.

## Core Project Directory Structure

```text
simuide-web/
├── server/                     # Node.js / Express Backend
│   ├── index.js                # Server entry point, API routes, Static file server
│   ├── db.js                   # MongoDB Atlas connection logic
│   ├── routes/                 # API Endpoints
│   │   ├── ai.js               # Gemini Vision and Vector Search routes
│   │   ├── arduino.js          # Arduino CLI compilation/upload routes
│   │   └── circuits.js         # MongoDB CRUD for project persistence
│   ├── services/               # Backend business logic
│   │   └── geminiService.js    # Integrated Google GenAI SDK logic
│   └── models/                 # Mongoose Data Models
│       ├── Circuit.js          # Schema for canvas & code persistence
│       └── Document.js         # Schema for Vector Embeddings (RAG)
├── src/                        # React Frontend (TypeScript + Vite)
│   ├── app/                    # Application Root
│   │   ├── App.tsx             # Main layout & View orchestration
│   │   └── components/         # Reusable UI systems
│   │       ├── arduino-ide/    # Complete IDE subsystem (Editor, BottomPanel)
│   │       ├── CircuitCanvas.tsx # SVG Schematic Engine
│   │       ├── AIPanel.tsx     # Gemini Chat & Visual QA interface
│   │       └── MenuBar.tsx      # Main application controls
│   ├── store/                  # Zustand Global State
│   │   ├── diagramStore.ts     # Component & Wire state
│   │   ├── editorStore.ts      # Multi-file code state
│   │   └── simulationStore.ts  # AVR8js CPU state
│   ├── api/                    # Typed API clients for backend communication
│   ├── hooks/                  # Custom React hooks (Auto-save, etc.)
│   └── constants/              # Global constants & Component definitions
├── Dockerfile                  # Production-optimized multi-stage build
├── docker-compose.yml          # Local orchestration
└── package.json                # Project dependencies and scripts
```

## Key Architectural Decisions

1. **Dual-View System:** Handled via `App.tsx` state, switching between an SVG-based circuit simulator and a tabbed code editor.
2. **AVR8js Integration:** Real-time simulation of AVR microcontrollers directly in the browser.
3. **Gemini Visual QA:** Uses `html2canvas` to capture the current circuit state, sending it to Gemini 1.5 Flash for multimodal reasoning.
4. **State Management:** Uses Zustand for high-performance updates on the canvas and in the editor.
5. **Full-Stack Docker:** A single Dockerfile builds the React frontend and serves it via the Express backend for simplified deployment on Google Cloud Run.

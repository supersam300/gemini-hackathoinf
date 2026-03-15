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

## Getting Started

### Prerequisites
Make sure you have Node.js and npm installed on your system.

### Local Development

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

*(Optional)* Start the full stack with the backend compilation server:
```bash
npm run dev:full
```

## Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **AI Engine:** Google Gemini (Multimodal & Embeddings) via Google GenAI SDK
- **Backend:** Node.js, Express, MongoDB Atlas
- **Simulation:** AVR8js (AVR CPU Simulator)
- **Canvas:** custom SVG rendering & `@wokwi/elements` 
- **Cloud Hosting:** Optimized for Google Cloud Run

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

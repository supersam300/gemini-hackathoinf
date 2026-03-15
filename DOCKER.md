# Docker Setup & Deployment Guide

This guide explains how to build and deploy SimuIDE Web using Docker. The project is optimized for a unified full-stack container that serves both the React frontend and Node.js backend.

## Production-Ready Docker Configuration

The main `Dockerfile` uses a multi-stage build to ensure the final image is lightweight and contains only production assets.

### Building the Image
```bash
docker build -t simuide-web:latest .
```

### Running Locally
```bash
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=your_key \
  -e MONGODB_URI=your_mongodb_uri \
  simuide-web:latest
```

## Docker Compose orchestration

For a more streamlined experience, use Docker Compose to manage the application and its environment.

### Production Environment
```bash
docker-compose up --build
```
This will:
1. Build the frontend.
2. Serves static files via the Express server.
3. Expose the app on `http://localhost:3000`.

### Development Environment (with Hot Reload)
```bash
docker-compose -f docker-compose.dev.yml up --build
```
This is optimized for developers, providing hot-module replacement for the frontend and linking source code volumes.

## Google Cloud Deployment

The unified Docker container is designed to be deployed directly to **Google Cloud Run**.

### 1. Build and Push to Artifact Registry
```bash
gcloud builds submit --tag gcr.io/[PROJECT_ID]/simuide
```

### 2. Deploy to Cloud Run
```bash
gcloud run deploy simuide \
  --image gcr.io/[PROJECT_ID]/simuide \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,PORT=3000"
```

## Docker Build Details

The production `Dockerfile` performs several critical steps to ensure the full stack is operational:
1. **Frontend Build**: Compiles the React + Vite application into static assets.
2. **Runtime Environment**:
   - **Node.js**: Serves the API and static files.
   - **Python 3**: Runs the AI logic (`agent.py`).
   - **Arduino CLI**: Installed and configured with `arduino:avr` core for sketch compilation.
3. **Dependency Management**:
   - `npm ci`: Installs Node.js production dependencies.
   - `pip install`: Installs AI Agent dependencies from `requirements.txt`.

## Key Configuration Files
- **Dockerfile:** Multi-stage build (Node.js + Python + Arduino CLI).
- **requirements.txt:** Python dependencies for the Gemini AI agent.
- **docker-compose.yml:** Standard stack orchestration including environment forwarding.
- **.dockerignore:** Excludes local build artifacts and sensitive keys.


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

### 1. One-time GCP Setup
```bash
gcloud config set project PROJECT_ID

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com

gcloud artifacts repositories create simuide \
  --repository-format=docker \
  --location=asia-south1 \
  --description="SimuIDE production images"
```

### 2. Store Runtime Secrets
```bash
printf '%s' 'YOUR_GEMINI_API_KEY' | gcloud secrets create GEMINI_API_KEY --data-file=- || true
printf '%s' 'YOUR_MONGODB_URI' | gcloud secrets create MONGODB_URI --data-file=- || true

printf '%s' 'YOUR_GEMINI_API_KEY' | gcloud secrets versions add GEMINI_API_KEY --data-file=-
printf '%s' 'YOUR_MONGODB_URI' | gcloud secrets versions add MONGODB_URI --data-file=-
```

### 3. IAM for Cloud Build Deployments
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

### 4. Automated Deploy Trigger (Production branch)
This repo includes `cloudbuild.yaml` for automated deployment to Cloud Run.

```bash
gcloud builds triggers create github \
  --name="simuide-prod-main" \
  --repo-name="REPO_NAME" \
  --repo-owner="GITHUB_OWNER" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_REGION=asia-south1,_SERVICE_NAME=simuide,_REPO_NAME=simuide,_IMAGE_NAME=web,_ALLOW_UNAUTHENTICATED=true,_GEMINI_AGENT_MODEL=gemini-2.5-flash,_GEMINI_API_KEY_SECRET=GEMINI_API_KEY,_MONGODB_URI_SECRET=MONGODB_URI"
```

Every push to `main` will:
1. Build container image
2. Push image to Artifact Registry
3. Deploy new revision to Cloud Run

### 5. Manual Deploy / Rollback Operations
Manual deploy via Cloud Build config:

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions="_REGION=asia-south1,_SERVICE_NAME=simuide,_REPO_NAME=simuide,_IMAGE_NAME=web"
```

Rollback to a previous revision:

```bash
gcloud run revisions list --service=simuide --region=asia-south1
gcloud run services update-traffic simuide \
  --region=asia-south1 \
  --to-revisions REVISION_NAME=100
```

### 6. Runtime Variables in Cloud Run
Set by `cloudbuild.yaml`:
- `NODE_ENV=production`
- `PORT=3000`
- `GEMINI_AGENT_MODEL=gemini-2.5-flash` (overridable via trigger substitutions)

Injected from Secret Manager:
- `GEMINI_API_KEY`
- `MONGODB_URI`

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


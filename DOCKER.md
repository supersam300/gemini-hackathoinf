# Docker Setup Guide

This guide explains how to run the Gemini Hackathon circuit diagram application using Docker.

## Files

- **Dockerfile** – Production-ready multi-stage build
- **Dockerfile.dev** – Development build with hot reload
- **docker-compose.yml** – Production Docker Compose configuration
- **docker-compose.dev.yml** – Development Docker Compose configuration (with hot reload)
- **.dockerignore** – Files to exclude from Docker image

## Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed

## Quick Start

### Production Build

#### Option 1: Using Docker Compose (Recommended)

```bash
# Build and start the application
docker-compose up --build

# The app will be available at http://localhost:3000
```

#### Option 2: Using Docker directly

```bash
# Build the image
docker build -t gemini-hackathon:latest .

# Run the container
docker run -p 3000:3000 gemini-hackathon:latest
```

### Development with Hot Reload

#### Option 1: Using Docker Compose (Recommended)

```bash
# Start development server with hot reload
docker-compose -f docker-compose.dev.yml up --build

# The app will be available at http://localhost:5173
# Changes to your code will automatically reload in the browser
```

#### Option 2: Using Docker directly

```bash
# Build development image
docker build -f Dockerfile.dev -t gemini-hackathon-dev:latest .

# Run with volume mount for hot reload
docker run -p 5173:5173 -v $(pwd):/app gemini-hackathon-dev:latest
```

#### Option 2 (Windows PowerShell): 

```powershell
# Run with volume mount for hot reload
docker run -p 5173:5173 -v ${PWD}:/app gemini-hackathon-dev:latest
```

## Docker Compose Commands

### Production

```bash
# Build and start services
docker-compose up --build

# Start without rebuilding
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove containers and volumes
docker-compose down -v
```

### Development

```bash
# Build and start development server
docker-compose -f docker-compose.dev.yml up --build

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# View live logs
docker-compose -f docker-compose.dev.yml logs -f web-dev

# Stop services
docker-compose -f docker-compose.dev.yml down
```

## Dockerfile Breakdown

### Production Dockerfile

```dockerfile
# Stage 1: Build stage (multi-stage to reduce final image size)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production stage (lightweight runtime)
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', ...)"
CMD ["serve", "-s", "dist", "-l", "3000"]
```

**Key Features:**
- Multi-stage build (only `dist/` is copied to final image)
- Lightweight `node:20-alpine` base image ~170MB
- Health check included for container orchestration
- `serve` package to serve static files

### Development Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
EXPOSE 5173
ENV NODE_ENV=development
ENV VITE_HOST=0.0.0.0
CMD ["npm", "run", "dev"]
```

**Key Features:**
- Vite dev server on port 5173
- Volume mounting for hot reload
- Direct access to source code

## Environment Variables

### Production
```bash
NODE_ENV=production
```

### Development
```bash
NODE_ENV=development
VITE_HOST=0.0.0.0  # Allows external connections to dev server
```

## Network Configuration

Both `docker-compose.yml` and `docker-compose.dev.yml` create isolated networks:
- **Production**: `gemini-network`
- **Development**: `gemini-network-dev`

This allows multiple services to communicate securely within their network.

## Mounting External Services

### MongoDB Integration Example

To connect to MongoDB while running in Docker, update your `docker-compose.yml`:

```yaml
services:
  web:
    # ... existing config ...
    environment:
      MONGODB_URI: mongodb://mongodb:27017/gemini_hackathon
    depends_on:
      - mongodb

  mongodb:
    image: mongo:7
    container_name: gemini-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db
    networks:
      - gemini-network

volumes:
  mongodb_data:
```

Then uncomment the MongoDB service in `docker-compose.yml`.

## Health Checks

The production container includes a health check that:
- Runs every 30 seconds
- Times out after 3 seconds
- Retries up to 3 times
- Waits 5 seconds before first check

View health status:
```bash
docker ps  # Look for "healthy" or "unhealthy" status
```

## Troubleshooting

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or use a different port
docker run -p 8000:3000 gemini-hackathon:latest
```

### Hot reload not working in development

Make sure you're using `-v $(pwd):/app` to mount the current directory:

```bash
# Correct
docker run -p 5173:5173 -v $(pwd):/app gemini-hackathon-dev:latest

# Incorrect (won't have hot reload)
docker run -p 5173:5173 gemini-hackathon-dev:latest
```

### Container exits immediately

Check logs:
```bash
docker-compose logs web
```

### npm dependency issues

Rebuild without cache:
```bash
docker-compose up --build --no-cache
```

## Pushing to Docker Registry

### Push to Docker Hub

```bash
# Login to Docker Hub
docker login

# Build and tag image
docker build -t yourusername/gemini-hackathon:latest .

# Push to registry
docker push yourusername/gemini-hackathon:latest

# Pull and run
docker run -p 3000:3000 yourusername/gemini-hackathon:latest
```

### Push to Private Registry

```bash
docker tag gemini-hackathon:latest registry.example.com/gemini-hackathon:latest
docker push registry.example.com/gemini-hackathon:latest
```

## Kubernetes Deployment

Example deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gemini-hackathon
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gemini-hackathon
  template:
    metadata:
      labels:
        app: gemini-hackathon
    spec:
      containers:
      - name: web
        image: gemini-hackathon:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Performance Tips

1. **Use Alpine images** – Smaller base images (~5MB vs 900MB)
2. **Multi-stage builds** – Only copy necessary artifacts
3. **Layer caching** – Order Dockerfile commands by frequency of change
4. **Exclude files** – Use `.dockerignore` to reduce build context
5. **Node modules** – Don't copy `node_modules` if using `npm ci`

## Security Best Practices

1. **Run as non-root** – Create a user in the Dockerfile
2. **Use specific versions** – Don't use `latest` tags in production
3. **Scan images** – Use `docker scan` or Trivy
4. **Minimal base images** – Use Alpine, Distroless, or Scratch
5. **Environment variables** – Use `.env` files securely, not in dockerfile

Example secure Dockerfile:

```dockerfile
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app
COPY --chown=nodejs:nodejs package.json package-lock.json ./
RUN npm ci --only=production

COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 3000
CMD ["npm", "start"]
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Vite Docker Guide](https://vitejs.dev/guide/ssr.html)

# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./

# Install dependencies (prefer lockfile for reproducibility)
RUN if [ -f package-lock.json ]; then npm ci || npm install; else npm install; fi

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine

WORKDIR /app

# Build-time model selection for baked-in Ollama model.
# Override with: --build-arg OLLAMA_MODEL=gemma3:4b
ARG OLLAMA_MODEL=gemma3:latest
ENV OLLAMA_MODEL=${OLLAMA_MODEL}
ENV OLLAMA_BASE_URL=http://127.0.0.1:11434
ENV OLLAMA_HOST=127.0.0.1:11434
ENV OLLAMA_MODELS=/opt/ollama/models

# Install dependencies: arduino-cli, Python 3, AVR core, and Ollama
# Download the arduino-cli binary directly from a versioned tarball rather than
# piping an external install script, so the output path is deterministic and
# verifiable. --log-level warn prevents interactive prompts that would hang CI.
RUN apk add --no-cache curl python3 py3-pip bash \
    && curl -fsSL "https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_64bit.tar.gz" \
       | tar -xz -C /usr/local/bin arduino-cli \
    && arduino-cli version \
    && arduino-cli core update-index --log-level warn \
    && arduino-cli core install arduino:avr --log-level warn \
    && mkdir -p "${OLLAMA_MODELS}" \
    && curl -fsSL "https://github.com/ollama/ollama/releases/latest/download/ollama-linux-amd64.tgz" \
       | tar -xz -C /usr/local/bin ollama

# Pre-pull model into image so deployment is self-contained.
# This increases image size significantly but avoids runtime pulls in Cloud Run.
RUN sh -c 'set -e; ollama serve >/tmp/ollama-build.log 2>&1 & \
    OLLAMA_PID=$!; \
    for i in $(seq 1 60); do \
      if ollama list >/dev/null 2>&1; then break; fi; \
      sleep 1; \
    done; \
    ollama pull "${OLLAMA_MODEL}"; \
    kill "${OLLAMA_PID}" >/dev/null 2>&1 || true'

# Create python virtual environment and install requirements
COPY requirements.txt .
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

# Copy built application and server code
COPY --from=builder /app/dist ./dist
COPY server/ ./server/
COPY package.json package-lock.json* ./

# Install root production dependencies (vite build tooling not included via --omit=dev)
RUN if [ -f package-lock.json ]; then npm ci --omit=dev || npm install --omit=dev; else npm install --omit=dev; fi

# Install server-specific production dependencies (express, cors, mongoose, etc.)
# The server/ directory has its own package.json and must be installed separately.
RUN cd server && if [ -f package-lock.json ]; then npm ci --omit=dev || npm install --omit=dev; else npm install --omit=dev; fi

# Expose port (Matches server/index.js default)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start Ollama + the integrated Express server
COPY docker/start-with-ollama.sh /usr/local/bin/start-with-ollama.sh
RUN chmod +x /usr/local/bin/start-with-ollama.sh
CMD ["/usr/local/bin/start-with-ollama.sh"]

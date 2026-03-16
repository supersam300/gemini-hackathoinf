# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine

WORKDIR /app

# Install dependencies: arduino-cli, Python 3, and AVR core
# Download the arduino-cli binary directly from a versioned tarball rather than
# piping an external install script, so the output path is deterministic and
# verifiable. --log-level warn prevents interactive prompts that would hang CI.
RUN apk add --no-cache curl python3 py3-pip \
    && curl -fsSL "https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_64bit.tar.gz" \
       | tar -xz -C /usr/local/bin arduino-cli \
    && arduino-cli version \
    && arduino-cli core update-index --log-level warn \
    && arduino-cli core install arduino:avr --log-level warn

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
RUN npm ci --omit=dev

# Install server-specific production dependencies (express, cors, mongoose, etc.)
# The server/ directory has its own package.json and must be installed separately.
RUN cd server && npm ci --omit=dev

# Expose port (Matches server/index.js default)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application using the integrated Express server
CMD ["node", "server/index.js"]

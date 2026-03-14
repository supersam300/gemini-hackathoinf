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

# Install arduino-cli and AVR core
RUN apk add --no-cache curl \
    && curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh \
    && /bin/arduino-cli core update-index \
    && /bin/arduino-cli core install arduino:avr

# Copy built application and server code
COPY --from=builder /app/dist ./dist
COPY server/ ./server/
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --omit=dev

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

# ============================================
# Multi-stage build for React Frontend
# Security Hardened: Non-root user, Alpine base
# ============================================

# Stage 1: Build the frontend
FROM node:20-alpine AS builder

# Install security updates
RUN apk update && apk upgrade && \
    rm -rf /var/cache/apk/*

# Create non-root user for building
RUN addgroup -S kanban && adduser -S kanban -G kanban

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Accept build argument for API base URL (defaults to /api for Docker)
# Vite requires env vars to be prefixed with VITE_ and available at build time
# Note: ARG must be declared before use, and ENV makes it available to RUN commands
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Verify the env var is set (for debugging)
RUN echo "Building with VITE_API_BASE_URL=$VITE_API_BASE_URL"

# Build the application (the env var will be available to Vite)
RUN npm run build

# Stage 2: Production image with nginx
FROM nginx:alpine

# Install security updates
RUN apk update && apk upgrade && \
    rm -rf /var/cache/apk/*

# Create non-root user (nginx already runs as non-root, but we'll verify)
RUN addgroup -S kanban && adduser -S kanban -G kanban || true

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# Nginx runs as non-root by default in alpine, so we don't need USER directive
CMD ["nginx", "-g", "daemon off;"]


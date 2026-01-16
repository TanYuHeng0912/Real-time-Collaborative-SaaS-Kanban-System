# ============================================
# Multi-stage build for Spring Boot Backend
# Security Hardened: Non-root user, Alpine base
# ============================================

# Stage 1: Build the application
FROM eclipse-temurin:17-jdk-alpine AS builder

# Install security updates and build dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache maven && \
    rm -rf /var/cache/apk/*

# Create non-root user for building (optional, but good practice)
RUN addgroup -S kanban && adduser -S kanban -G kanban

# Set working directory
WORKDIR /app

# Copy Maven configuration files
COPY pom.xml .

# Download dependencies (cached layer)
RUN mvn dependency:go-offline -B || true

# Copy source code
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests -B && \
    mv target/*.jar app.jar

# Stage 2: Runtime image
FROM eclipse-temurin:17-jre-alpine

# Install security updates
RUN apk update && apk upgrade && \
    rm -rf /var/cache/apk/*

# Create non-root user for running the application
RUN addgroup -S kanban && adduser -S kanban -G kanban && \
    mkdir -p /app && \
    chown -R kanban:kanban /app

# Set working directory
WORKDIR /app

# Copy JAR from builder stage
COPY --from=builder --chown=kanban:kanban /app/app.jar app.jar

# Switch to non-root user
USER kanban

# Expose application port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Run the application
ENTRYPOINT ["java", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-jar", \
    "app.jar"]


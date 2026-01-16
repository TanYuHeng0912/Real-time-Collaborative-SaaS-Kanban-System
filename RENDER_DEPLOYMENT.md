# Render.com Deployment Guide

This guide walks you through deploying the Kanban System to Render.com with security best practices.

## Prerequisites

1. GitHub repository with your code
2. Render.com account (free tier available)
3. Git installed locally

## Step 1: Prepare Your Repository

### 1.1 Environment Variables

Ensure all sensitive data is removed from `application.yml` and uses environment variables (already configured).

### 1.2 Create Health Check Endpoint (Optional but Recommended)

Create a simple health check endpoint for Render's health checks:

```java
// src/main/java/com/kanban/controller/HealthController.java
@RestController
@RequestMapping("/health")
public class HealthController {
    @GetMapping
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> status = new HashMap<>();
        status.put("status", "UP");
        return ResponseEntity.ok(status);
    }
}
```

### 1.3 Commit and Push to GitHub

```bash
git add .
git commit -m "Add Docker files and security configurations"
git push origin main
```

## Step 2: Create PostgreSQL Database on Render

1. **Log in to Render.com**
   - Go to https://render.com
   - Sign up or log in with GitHub

2. **Create PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - Name: `kanban-db` (or your preferred name)
   - Database: `kanban_db`
   - User: `kanban_user` (auto-generated)
   - Region: Choose closest to you
   - Plan: Free (for development) or Starter ($7/month for production)
   - Click "Create Database"

3. **Save Connection Details**
   - Note the **Internal Database URL** (for use within Render)
   - Note the **External Connection String** (if needed for external tools)
   - Example: `postgresql://kanban_user:password@dpg-xxx-xxx/kanban_db`

## Step 3: Deploy Backend (Spring Boot)

1. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository and branch (usually `main` or `master`)

2. **Configure Service**
   - **Name**: `kanban-backend` (or your preferred name)
   - **Environment**: `Docker`
   - **Region**: Same as database
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty (root of repo)
   - **Dockerfile Path**: `Dockerfile` (already configured)
   - **Docker Command**: Leave empty (uses CMD from Dockerfile)

3. **Set Environment Variables**
   Click "Advanced" → "Add Environment Variable" and add:

   ```
   # Database (use Internal Database URL from Step 2)
   SPRING_DATASOURCE_URL=${DATABASE_URL}  # Render provides this automatically
   # OR manually: SPRING_DATASOURCE_URL=jdbc:postgresql://dpg-xxx-xxx/kanban_db
   SPRING_DATASOURCE_USERNAME=<from database settings>
   SPRING_DATASOURCE_PASSWORD=<from database settings>
   
   # JWT Secret (generate secure secret: openssl rand -base64 64)
   JWT_SECRET=<generate-a-secure-256-bit-secret-key>
   JWT_EXPIRATION=86400000
   
   # Server
   SERVER_PORT=8080
   SERVER_SERVLET_CONTEXT_PATH=/api
   
   # Spring Profile
   SPRING_PROFILES_ACTIVE=prod
   
   # JPA (use update for first deployment, then change to validate)
   SPRING_JPA_HIBERNATE_DDL_AUTO=update  # Change to 'validate' after first run
   SPRING_JPA_SHOW_SQL=false
   
   # Redis (if using - optional)
   SPRING_REDIS_HOST=<redis-host-if-using>
   SPRING_REDIS_PORT=6379
   SPRING_REDIS_PASSWORD=<redis-password-if-using>
   
   # Logging
   LOGGING_LEVEL_ROOT=INFO
   LOGGING_LEVEL_COM_KANBAN=INFO
   ```

   **Note**: Render automatically provides `DATABASE_URL` environment variable when you link the database to your service.

4. **Link Database**
   - Scroll down to "Database"
   - Select your PostgreSQL database created in Step 2
   - This automatically sets `DATABASE_URL`

5. **Configure Instance**
   - **Instance Type**: Free (512 MB RAM) for development
   - **Auto-Deploy**: Yes (auto-deploy on git push)

6. **Health Check** (Important)
   - **Health Check Path**: `/api/health`
   - This ensures Render knows your service is running

7. **Click "Create Web Service"**

8. **Wait for Deployment**
   - Render will build and deploy your Docker image
   - First deployment takes 5-10 minutes
   - Monitor logs for any errors

## Step 4: Update Backend URL in Frontend

After backend is deployed, update frontend API configuration:

1. **Get Backend URL**
   - From Render dashboard, copy your backend service URL
   - Example: `https://kanban-backend.onrender.com`

2. **Update Frontend API Base URL**
   
   Check `frontend/src/lib/api.ts` or similar file and update:
   
   ```typescript
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://kanban-backend.onrender.com/api';
   ```

3. **Create Environment Variable for Frontend** (if using .env)
   
   Create `frontend/.env.production`:
   ```
   VITE_API_BASE_URL=https://kanban-backend.onrender.com/api
   ```

## Step 5: Deploy Frontend (React)

You have two options:

### Option A: Static Site (Recommended for React)

1. **Build Frontend Locally First** (test the build)
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Create Static Site on Render**
   - Click "New +" → "Static Site"
   - Connect GitHub repository
   - **Name**: `kanban-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
   - Click "Create Static Site"

3. **Set Environment Variables**
   - `VITE_API_BASE_URL`: `https://kanban-backend.onrender.com/api`
   - `VITE_WS_URL`: `wss://kanban-backend.onrender.com/ws` (for WebSocket)

### Option B: Web Service (Docker)

1. **Create Web Service**
   - Click "New +" → "Web Service"
   - **Environment**: `Docker`
   - **Root Directory**: `frontend`
   - **Dockerfile Path**: `Dockerfile` (in frontend directory)
   - **Instance Type**: Free
   - **Health Check Path**: `/`

2. **Set Environment Variables**
   - Same as Option A

## Step 6: Configure CORS for Backend

Update your Spring Boot CORS configuration to allow requests from your frontend domain:

```java
// src/main/java/com/kanban/config/SecurityConfig.java or WebConfig.java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(Arrays.asList(
        "https://kanban-frontend.onrender.com",
        "http://localhost:5173" // for local development
    ));
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(Arrays.asList("*"));
    configuration.setAllowCredentials(true);
    
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
}
```

## Step 7: Verify Deployment

1. **Check Backend Health**
   - Visit: `https://kanban-backend.onrender.com/api/health`
   - Should return: `{"status":"UP"}`

2. **Test Frontend**
   - Visit your frontend URL
   - Try logging in or registering

3. **Check Logs**
   - In Render dashboard, view logs for any errors
   - Common issues:
     - Database connection errors → Check `SPRING_DATASOURCE_URL`
     - CORS errors → Update CORS configuration
     - Port binding errors → Ensure `SERVER_PORT=8080`

## Security Checklist ✅

- [x] **Database port not exposed** - Using Render's internal networking
- [x] **No hardcoded secrets** - All sensitive data in environment variables
- [x] **Secure base images** - Using `eclipse-temurin:17-jre-alpine`
- [x] **Non-root user** - Application runs as `kanban` user
- [x] **Environment variables** - All secrets configured in Render dashboard
- [x] **.dockerignore** - Prevents sensitive files in Docker images
- [x] **Health checks** - Configured for Render monitoring

## Troubleshooting

### Backend fails to start
- Check logs in Render dashboard
- Verify all environment variables are set
- Ensure database is linked correctly

### Database connection errors
- Verify `SPRING_DATASOURCE_URL` format: `jdbc:postgresql://host:port/database`
- Check database credentials
- Ensure database is running (not suspended on free tier)

### Frontend can't connect to backend
- Verify `VITE_API_BASE_URL` is set correctly
- Check CORS configuration
- Ensure backend health check passes

### WebSocket connection fails
- Render supports WebSockets but may require specific configuration
- Check STOMP endpoint: `/ws` or `/ws/websocket`
- Verify WebSocket upgrade headers in nginx config (if using Docker frontend)

### Free Tier Limitations
- Services sleep after 15 minutes of inactivity
- First request after sleep takes ~30-50 seconds
- Upgrade to paid plan for always-on service

## Next Steps

1. **Set up custom domain** (optional)
   - In Render dashboard, add custom domain
   - Update DNS records

2. **Enable HTTPS** (automatic on Render)
   - Render provides SSL certificates automatically

3. **Monitor and scale**
   - Use Render's metrics to monitor performance
   - Upgrade plan as needed

4. **Backup database**
   - Enable automatic backups in Render dashboard
   - Or use manual backup tools

## Support

- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com
- GitHub Issues: Open an issue in your repository


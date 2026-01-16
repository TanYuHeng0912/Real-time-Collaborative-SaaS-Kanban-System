# REal Time Collaborative Kanban System

A full-stack Kanban board application built with Spring Boot and React, featuring real-time collaboration through WebSocket connections.

## Tech Stack

### Backend
- **Spring Boot 3.2+** with Java 17
- **Spring Data JPA** for database operations
- **Spring Security** with JWT authentication
- **PostgreSQL** for data persistence
- **Redis** for caching/session management (configured but optional)
- **WebSocket (STOMP)** for real-time updates
- **Project Lombok** for reducing boilerplate code

### Frontend
- **React 18** with Functional Components
- **TypeScript** (Strict Mode)
- **Vite** as build tool
- **Tailwind CSS** for styling
- **Shadcn/UI** components
- **Zustand** for state management with optimistic updates
- **@tanstack/react-query** for server-state synchronization
- **@hello-pangea/dnd** for drag-and-drop functionality
- **Axios** with interceptors for API calls
- **WebSocket (STOMP)** client for real-time updates


## Prerequisites

### Option 1: Docker (Recommended - Easier Setup)
- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Docker Compose** (included with Docker Desktop)

### Option 2: Manual Setup
- **Java 17+**
- **Maven 3.6+**
- **PostgreSQL 12+**
- **Node.js 18+** and **npm**
- **Redis** (optional, for caching)

## Setup Instructions

### Quick Start with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/TanYuHeng0912/Real-time-Collaborative-Kanban-System.git
   cd Real-time-Collaborative-Kanban-System
   ```

2. **Create environment file**
   
   Create a `.env` file in the project root directory with the following content:
   ```env
   # PostgreSQL Database
   POSTGRES_DB=kanban_db
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_secure_password_here
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_min_64_characters_long_for_security
   JWT_EXPIRATION=86400000
   
   # Redis Configuration (optional, can be empty)
   REDIS_PASSWORD=
   
   # Spring Configuration
   SPRING_JPA_DDL_AUTO=validate
   SPRING_JPA_SHOW_SQL=false
   SPRING_PROFILES_ACTIVE=prod
   
   # CORS Configuration
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   WEBSOCKET_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```
   
   **Important**: 
   - Change `POSTGRES_PASSWORD` and `JWT_SECRET` to secure random values
   - Generate JWT secret: `openssl rand -base64 64` (or use any 64+ character random string)
   - Make sure `.env` is in `.gitignore` (should be already configured)

3. **Build and start all services with Docker Compose**
   ```bash
   docker-compose up -d --build
   ```
   
   This command will:
   - Build the backend and frontend Docker images
   - Start PostgreSQL, Redis, backend, and frontend containers
   - Wait approximately 30-60 seconds for all services to start

4. **Check container status**
   ```bash
   docker-compose ps
   ```
   
   All services should show "Up" status. Wait until backend shows "healthy" status.

5. **Initialize the database schema** (first time only)
   
   **Windows PowerShell:**
   ```powershell
   Get-Content database/schema.sql | docker exec -i kanban-postgres psql -U postgres -d kanban_db
   ```
   
   **Linux/Mac:**
   ```bash
   docker exec -i kanban-postgres psql -U postgres -d kanban_db < database/schema.sql
   ```

6. **Create admin user** (first time only)
   
   **Windows PowerShell:**
   ```powershell
   Get-Content database/create_admin_render.sql | docker exec -i kanban-postgres psql -U postgres -d kanban_db
   ```
   
   **Linux/Mac:**
   ```bash
   docker exec -i kanban-postgres psql -U postgres -d kanban_db < database/create_admin_render.sql
   ```
   
   This creates an admin user with:
   - **Email**: `admin@kanban.com`
   - **Password**: `admin123`
   - **Role**: `ADMIN`

7. **Access the application**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8081/api
   - **Health Check**: http://localhost:8081/api/health
   
   **Note**: Backend is exposed on port 8081 (instead of 8080) to avoid conflicts with local backend instances. The frontend automatically connects to the backend via Docker's internal network.

8. **Login with admin credentials**
   - **Email**: `admin@kanban.com`
   - **Password**: `admin123`
   
   **Security Note**: Change the default password after first login!

9. **View logs** (if needed)
   ```bash
   # View all logs
   docker-compose logs -f
   
   # View backend logs only
   docker-compose logs backend -f
   
   # View frontend logs only
   docker-compose logs frontend -f
   ```

10. **Stop services**
    ```bash
    docker-compose down
    ```
    
    To remove volumes (including database data):
    ```bash
    docker-compose down -v
    ```

**Troubleshooting:**

- **Port conflicts**: If port 8081 or 3000 is in use, modify `docker-compose.yml` to use different ports
- **Container not starting**: Check logs with `docker-compose logs backend` or `docker-compose logs frontend`
- **Database connection errors**: Ensure PostgreSQL container is healthy: `docker-compose ps`
- **Rebuild after code changes**: Run `docker-compose up -d --build`

**Security Notes:**
- The Docker setup uses environment variables for all sensitive configuration
- Database port is **not exposed** to the host machine for security
- Change default admin password (`admin123`) after first login
- Use strong, random values for `POSTGRES_PASSWORD` and `JWT_SECRET` in production

---

### Manual Setup (Without Docker)

#### 1. Database Setup

1. Start PostgreSQL server
2. Create database:
   ```bash
   createdb kanban_db
   ```
3. Run the schema script:
   ```bash
   psql -U postgres -d kanban_db -f database/schema.sql
   ```
   Or manually execute the SQL in `database/schema.sql` using your PostgreSQL client

#### 2. Backend Setup

1. **Configure environment variables** (recommended) or update `src/main/resources/application.yml`:
   ```bash
   # Create .env file or set environment variables
   export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/kanban_db
   export SPRING_DATASOURCE_USERNAME=postgres
   export SPRING_DATASOURCE_PASSWORD=your_password
   export JWT_SECRET=your-secret-key-change-in-production
   ```

   Or edit `application.yml` directly (not recommended for production):
   ```yaml
   spring:
     datasource:
       url: jdbc:postgresql://localhost:5432/kanban_db
       username: postgres
       password: your_password
   jwt:
     secret: your-secret-key-change-in-production
   ```

2. Build and run the backend:
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```

   The backend will start on `http://localhost:8080`

#### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. **Configure API URL** (optional - defaults to `/api`):
   ```bash
   # Create .env file
   echo "VITE_API_BASE_URL=http://localhost:8080/api" > .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will start on `http://localhost:5173`

## Key Features

### Authentication
- JWT-based authentication
- User registration and login
- Protected routes
- Token stored in localStorage with automatic refresh handling

### Kanban Board
- Create and manage boards
- Create lists (columns) within boards
- Create, update, move, and delete cards
- Drag-and-drop cards between lists
- Real-time updates via WebSocket

### Real-time Collaboration
- WebSocket (STOMP) connection for real-time updates
- When User A moves a card, User B sees the movement instantly
- Optimistic UI updates with rollback on failure
- Board-specific WebSocket channels

### State Management
- **Zustand** for client-side state with optimistic updates
- **React Query** for server-state caching and synchronization
- Automatic error handling and retry logic

## Security Features

- **Non-root Docker containers**: Application runs as `kanban` user
- **Secure base images**: Uses Alpine Linux variants
- **Environment variables**: All secrets externalized
- **Internal networking**: Database ports not exposed to host
- **Health checks**: Built-in health monitoring endpoints
- **CORS configuration**: Configurable allowed origins
- **JWT authentication**: Secure token-based authentication






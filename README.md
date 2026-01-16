# High-Concurrency Collaborative Kanban System

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
   git clone <repository-url>
   cd kanban-system
   ```

2. **Create environment file**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and set your passwords and JWT secret
   # Generate JWT secret: openssl rand -base64 64
   ```

3. **Start all services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Initialize the database** (first time only)
   ```bash
   # Connect to the PostgreSQL container
   docker exec -it kanban-postgres psql -U postgres -d kanban_db
   
   # Run the schema script
   \i /path/to/database/schema.sql
   # Or copy the schema.sql content and paste it into the psql prompt
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080/api
   - Health Check: http://localhost:8080/api/health

6. **View logs**
   ```bash
   docker-compose logs -f
   ```

7. **Stop services**
   ```bash
   docker-compose down
   ```

**Note:** The Docker setup uses environment variables for all sensitive configuration. Database port is **not exposed** to the host machine for security.

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

---

## Deployment

### Render.com Deployment

This application is configured for deployment on Render.com with security best practices:

- ✅ Secure Docker images (non-root user, Alpine-based)
- ✅ Environment variable configuration (no hardcoded secrets)
- ✅ Database security (internal networking only)
- ✅ Health check endpoints

See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for detailed deployment instructions.

### Production Considerations

1. **Environment Variables**: All sensitive configuration uses environment variables
2. **JWT Secret**: Generate a secure secret: `openssl rand -base64 64`
3. **Database**: Use managed PostgreSQL service (Render, AWS RDS, etc.)
4. **CORS**: Configure `CORS_ALLOWED_ORIGINS` environment variable
5. **WebSocket**: Configure `WEBSOCKET_ALLOWED_ORIGINS` environment variable
6. **SSL/TLS**: Use HTTPS in production (automatically handled by Render)

---

## Security Features

- **Non-root Docker containers**: Application runs as `kanban` user
- **Secure base images**: Uses Alpine Linux variants
- **Environment variables**: All secrets externalized
- **Internal networking**: Database ports not exposed to host
- **Health checks**: Built-in health monitoring endpoints
- **CORS configuration**: Configurable allowed origins
- **JWT authentication**: Secure token-based authentication

---

## Project Structure

```
kanban-system/
├── src/                    # Spring Boot backend source code
│   └── main/
│       ├── java/com/kanban/
│       │   ├── config/     # Configuration (WebSocket, Security)
│       │   ├── controller/ # REST controllers
│       │   ├── dto/        # Data Transfer Objects
│       │   ├── model/      # Entity models
│       │   ├── repository/ # Data repositories
│       │   ├── security/   # Security configuration
│       │   └── service/    # Business logic
│       └── resources/
│           └── application.yml
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── store/          # State management
│   └── package.json
├── database/               # Database schema and migrations
├── Dockerfile              # Backend Docker image
├── docker-compose.yml      # Local development setup
└── RENDER_DEPLOYMENT.md    # Deployment guide

```

---

## Troubleshooting

### Docker Issues

- **Port already in use**: Change ports in `docker-compose.yml`
- **Database connection errors**: Check `POSTGRES_PASSWORD` in `.env`
- **Build failures**: Ensure Docker has enough memory (4GB+ recommended)

### Manual Setup Issues

- **Database connection**: Verify PostgreSQL is running and credentials are correct
- **Port conflicts**: Backend uses 8080, frontend uses 5173
- **CORS errors**: Check `CORS_ALLOWED_ORIGINS` environment variable

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker Compose
5. Submit a pull request

---

## License

[Add your license here]


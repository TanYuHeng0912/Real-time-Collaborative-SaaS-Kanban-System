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

- **Java 17+**
- **Maven 3.6+**
- **PostgreSQL**
- **Node.js 18+** and **npm**
- **Redis** (optional, for caching)

## Setup Instructions

### 1. Database Setup

1. Start PostgreSQL server
2. Run the schema script:
   ```bash
   psql -U postgres -f database/schema.sql
   ```
   Or manually execute the SQL in `database/schema.sql` using your PostgreSQL client (pgAdmin, psql, etc.)

### 2. Backend Setup

1. Update `src/main/resources/application.yml` with your database credentials:
   ```yaml
   spring:
     datasource:
       url: jdbc:postgresql://localhost:5432/kanban_db
       username: your_username
       password: your_password
   ```

2. Update JWT secret in `application.yml` (use a secure random string in production)

3. Build and run the backend:
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```

   The backend will start on `http://localhost:8080`

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
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



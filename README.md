# FlowSync

FlowSync is a real-time collaborative Kanban board application designed to enable teams to manage tasks, columns, and boards seamlessly.

![FlowSync Dashboard Mockup](https://raw.githubusercontent.com/Nichoruson/FlowSync/main/screenshot_placeholder.png)

## Key Features

* **Real-time Sync**: Live presence detection, visual drag locks, and instantly synchronized actions powered by Socket.IO.
* **Modern Security**: Short-lived JWT access tokens (15m) paired with secure HttpOnly cookie refresh tokens (7d).
* **Robust Authorization**: Secure board-level member checking for all database mutations and owner-only operations.
* **Advanced Task Attributes**: Support for task descriptions, priorities (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), due dates (with overdue status), and custom labels.
* **Responsive Dashboard**: Beautiful dark-theme board explorer, user profile editor, and sidebar board navigation.
* **Client-side Filter**: Live search and task filters by assignee, priority, label, and due dates.
* **Optimistic Locking**: Collision detection to handle drag conflicts gracefully across multiple users.

## Project Structure

```text
├── .github/workflows/   # GitHub Actions CI configurations
├── backend/             # Node.js + Express + Prisma + Socket.io Server
└── frontend/            # React 19 + Vite + Zustand Client
```

## Quick Start

### Prerequisites

* Node.js (v18 or higher)
* PostgreSQL database instance (e.g., Neon Postgres)

### Step 1: Set up the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill out your variables:
   ```bash
   cp .env.example .env
   ```
4. Run migrations to provision your PostgreSQL database:
   ```bash
   npx prisma db push
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
   The backend server will run on `http://localhost:5000`.

### Step 2: Set up the Frontend

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend application will be available at `http://localhost:5173`.

## Environment Variables

### Backend (`/backend/.env`)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Listening port for Express | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `JWT_SECRET` | Secret key used to sign access tokens | `<random-string>` |
| `JWT_REFRESH_SECRET` | Secret key used to sign refresh tokens | `<different-random-string>` |
| `CLIENT_URL` | Allowed origin for CORS (comma-separated for multiple) | `http://localhost:5173` |
| `LOG_LEVEL` | Logging level (`debug`, `info`, `warn`, `error`) | `info` |

### Frontend (`/frontend/.env`)

Create a `.env` file in the `/frontend` directory:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Backend base API version endpoint | `http://localhost:5000/api/v1` |
| `VITE_SOCKET_URL` | Backend Socket.IO host URL | `http://localhost:5000` |

## Deployment

* **Backend**: Easily deploy to [Railway](https://railway.app) or [Render](https://render.com). The repository includes a `Procfile` configured for easy setup.
* **Frontend**: Deploy static builds to [Vercel](https://vercel.com) or [Netlify](https://netlify.com) using the build command `npm run build` and output directory `dist`.

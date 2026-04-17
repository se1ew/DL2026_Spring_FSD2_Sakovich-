# QR Code Generator

Full-stack web application for generating, customising, and managing QR codes.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Konva, react-colorful |
| Backend | Node.js, Express, TypeScript, Socket.IO |
| Database | PostgreSQL 16 + Prisma ORM |
| Cache | Redis 7 |
| Auth | JWT (Bearer token) |
| Infra | Docker, docker-compose |

## Features

- Generate QR codes (PNG / SVG) with custom foreground/background colours, error correction level, margin, and size
- Upload a logo and place it on the QR with drag-and-drop; logo placement is automatically constrained to avoid the finder patterns
- Real-time preview via React Konva canvas
- History of generated QR codes with download (PNG or SVG), copy public link, and delete
- Public shareable link for each QR (`/api/qr/:id/view`) — no auth required
- View counter per QR stored in Redis; owner receives a live notification via WebSocket when someone opens the link

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes docker-compose)
- Node.js 20+ (for local development without Docker)

## Running with Docker (recommended)

```bash
# 1. Copy env example and fill in secrets (JWT_SECRET at minimum)
cp .env.example .env

# 2. Start all services
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## Local Development (without Docker)

### 1. Start infrastructure

```bash
# PostgreSQL and Redis only
docker-compose up postgres redis -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env        # fill DATABASE_URL, JWT_SECRET, REDIS_URL
npm install
npx prisma migrate dev      # run migrations
npm run dev                 # starts on :3000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # starts on :5173
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | — | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `REDIS_HISTORY_TTL` | `60` | History cache TTL in seconds |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `PORT` | `3000` | HTTP server port |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Backend base URL |

## API Overview

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register |
| POST | `/api/auth/login` | — | Login, returns JWT |
| POST | `/api/qr` | ✓ | Generate & save QR |
| GET | `/api/qr` | ✓ | List user's QR codes |
| GET | `/api/qr/:id` | ✓ | Get single QR |
| DELETE | `/api/qr/:id` | ✓ | Delete QR |
| GET | `/api/qr/:id/view` | — | Public QR page (increments view counter) |

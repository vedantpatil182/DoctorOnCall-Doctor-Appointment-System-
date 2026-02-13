DoctorOnCall System
====================

Full‑stack doctor appointment platform built with:
- React + TypeScript + Vite + Tailwind CSS (frontend)
- Node.js + TypeScript + Express + Prisma + SQLite (backend)

## Project Structure

- `backend/` – API server, Prisma schema, authentication, appointments
- `frontend/` – React SPA for patients and doctors

## Prerequisites

- Node.js 18+ and npm

## Setup & Run

```bash
cd DoctorOnCall

# 1. Install backend deps
cd backend
npm install

# 2. Configure environment
cp .env.example .env

# 3. Run migrations and generate Prisma client
npx prisma migrate dev --name init

# 4. Start backend (http://localhost:4000)
npm run dev

# 5. In a new terminal, install frontend deps
cd ../frontend
npm install

# 6. Start frontend (http://localhost:5173)
npm run dev
```

Update the `.env` file in `backend/` as needed (JWT secret, email credentials, etc.).


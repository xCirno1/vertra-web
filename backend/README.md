# Vertra Backend

Rust + Axum REST API for the Vertra web studio.

## Prerequisites

- Rust 1.78+ (`rustup update stable`)
- A running PostgreSQL database (the Supabase URL in `../.env.local` works)

## Setup

1. Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

The minimum required values in `backend/.env`:

```env
# Copy the SUPABASE_URL from the root .env.local
DATABASE_URL=postgresql://...

# Choose a long random secret for JWT signing
JWT_SECRET=...
```

2. Build and run:

```bash
cargo run
# Server starts on http://localhost:8080
```

3. Run migrations — they are applied automatically on startup via `sqlx::migrate!`.

## Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Health check |
| `POST` | `/auth/register` | — | Create account |
| `POST` | `/auth/login` | — | Sign in, returns JWT |
| `GET` | `/auth/me` | Bearer | Current user profile |
| `GET` | `/projects` | Bearer | List user's projects |
| `POST` | `/projects` | Bearer | Create project |
| `GET` | `/projects/:id` | Bearer | Get project by id |
| `PATCH` | `/projects/:id` | Bearer | Update project fields |
| `DELETE` | `/projects/:id` | Bearer | Delete project |
| `POST` | `/projects/sync` | Bearer | Batch-upsert projects |

All authenticated routes expect `Authorization: Bearer <token>` header.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (also accepts `SUPABASE_URL`) |
| `JWT_SECRET` | No | dev placeholder | HMAC secret for JWT signing |
| `PORT` | No | `8080` | TCP port to listen on |
| `FRONTEND_ORIGIN` | No | `http://localhost:3000` | CORS allowed origin |
| `RUST_LOG` | No | `vertra_backend=debug` | Log filter |

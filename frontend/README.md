# Gather chat

A username-only, single-room chat built with Next.js, Socket.IO, Express, and MongoDB.

## Run locally

1. Start MongoDB and configure `backend/.env` using [`backend/.env.example`](../backend/.env.example).
2. In `backend`, run `npm install` once, then `npm run dev`.
3. If the backend is not at `http://localhost:8000`, copy `.env.example` to `.env.local` and update `NEXT_PUBLIC_SOCKET_URL`.
4. In `frontend`, run `npm install` once, then `npm run dev`.

The frontend is served at [http://localhost:3000](http://localhost:3000). Set
`FRONTEND_URL` in the backend environment if the frontend uses a different origin.

Messages are stored in MongoDB and the latest 100 are loaded when a user joins.
Usernames identify active connections only; this prototype does not provide
accounts or authentication and should not be used for private or sensitive chat.

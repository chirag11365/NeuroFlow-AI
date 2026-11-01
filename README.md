# NeuroFlow AI

Workspace-based document intelligence app built in JavaScript with a React/Vite client and an Express API.

## Phase 1: foundation

This phase establishes account registration/login, user-scoped workspaces, dashboard counts, the React app shell, and the shared memory/Mongo repository interface. It runs in memory mode when MongoDB is not configured or is unavailable. Document ingestion and workflow execution are planned for subsequent phases.

## Run locally

1. Copy `.env.example` to `.env` and set a private `JWT_SECRET`.
2. In `server/`, run `npm install` and `npm run dev`.
3. In `client/`, run `npm install` and `npm run dev`.
4. Open `http://localhost:5173`.

The API defaults to `http://localhost:3001/api`. MongoDB and Ollama are optional; the app has in-memory storage and deterministic workflow fallbacks.

To check MongoDB connectivity from PowerShell, run `npm.cmd run check:db` inside `server/`. On Windows, if Node's DNS resolver cannot resolve an Atlas SRV record, the connection layer uses the Windows DNS resolver and the Atlas SRV/TXT records to build an equivalent seed-list URI. Set `MONGODB_DNS_SERVERS` to a comma-separated DNS server list only if your network requires a specific resolver.

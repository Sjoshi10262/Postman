# API Client Platform — Postman Clone

A functional clone of the Postman API client. Organize requests into collections,
build and send **real** HTTP requests through a backend proxy, inspect responses,
and manage environments and variables — in a UI modeled on Postman.

> The backend acts as a **proxy/runner**: it executes outbound HTTP on behalf of
> the browser. This is what avoids CORS limits and lets the app send requests to
> any public API while measuring status, time, size, and headers consistently.

---

## Tech Stack

| Layer    | Choice                                              |
| -------- | --------------------------------------------------- |
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind CSS · Zustand |
| Backend  | Python · FastAPI · SQLAlchemy · httpx               |
| Database | SQLite                                              |

`httpx` (not `requests`) powers the runner — it shares an API surface with
`requests` but adds first-class timeouts, redirects, and connection reuse.
Zustand keeps client state (open tabs, environments, history) in one small store
without Redux boilerplate.

---

## Repository Layout

```
postman-clone/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, router wiring
│   │   ├── database.py        # SQLite engine + session
│   │   ├── models.py          # SQLAlchemy ORM schema
│   │   ├── schemas.py         # Pydantic request/response contracts
│   │   ├── runner.py          # ★ variable resolution + outbound HTTP
│   │   ├── seed.py            # sample collections / envs / history
│   │   └── routers/           # collections, requests, environments, history, run
│   ├── requirements.txt
│   └── run.sh
└── frontend/
    └── src/
        ├── app/               # layout, globals.css, page.tsx (workspace shell)
        ├── components/        # Sidebar, RequestBuilder, ResponseViewer, modals…
        ├── lib/               # api.ts (typed client), types.ts
        └── store/useStore.ts  # Zustand store
```

---

## Quick Start

### 1. Backend (port 8000)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed          # creates postman.db with sample data
uvicorn app.main:app --reload --port 8000
```

API docs are auto-generated at `http://localhost:8000/docs`.

(Or just run `./run.sh`, which does all of the above.)

### 2. Frontend (port 3000)

```bash
cd frontend
npm install
cp .env.local.example .env.local     # defaults to http://localhost:8000
npm run dev
```

Open `http://localhost:3000`. The workspace loads seeded collections,
environments, and history immediately.

---

## Architecture Overview

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│   Next.js Frontend (3000)   │         │   FastAPI Backend (8000)     │
│                             │  HTTP   │                              │
│  Zustand store ── api.ts ───┼────────▶│  /collections /requests      │
│  Workspace shell            │  JSON   │  /environments /history      │
│  (tabs, builder, response)  │◀────────┤  /run  ← proxy/runner        │
└─────────────────────────────┘         │            │                 │
                                        │            ▼ httpx           │
                                        │     ┌──────────────┐         │
                                        │     │ Target API   │         │
                                        │     │ (any public  │         │
                                        │     │  endpoint)   │         │
                                        │     └──────────────┘         │
                                        │   SQLite (collections,       │
                                        │   requests, envs, history)   │
                                        └──────────────────────────────┘
```

**Send pipeline** (`POST /run` → `runner.execute`):

1. Resolve `{{variables}}` in URL, params, headers, body, and auth against the
   selected environment.
2. Assemble the call for `httpx` — query params, headers, Bearer/Basic auth, and
   body (raw / form-data / urlencoded).
3. Send with a 30s timeout following redirects; measure elapsed time and byte size.
4. Normalize the response (status, headers, body, JSON detection) **or** translate
   network failures (timeout, DNS, connection) into a structured error the UI
   renders as a red panel.
5. Record the attempt in History.

---

## Database Schema

```
collections                 folders                  requests
───────────                 ───────                  ────────
id           PK             id            PK         id           PK
name                        name                     name
description                 collection_id FK──┐      method
created_at                                    │      url
   │                                          │      params   (JSON)
   │ 1                                        │      headers  (JSON)
   ├───────────────* folders ────────────────┘      auth     (JSON)
   │ 1                                               body     (JSON)
   └───────────────* requests *──────────── folder_id FK (nullable)
                                  └───────── collection_id FK (nullable)

environments                variables                history
────────────                ─────────                ───────
id          PK              id             PK         id                   PK
name                        key                       method
created_at                  value                     url
   │ 1                      enabled                    params/headers/auth/body (JSON)
   └──────────* variables   environment_id FK         status_code
                                                       response_time_ms
                                                       response_size_bytes
                                                       created_at
```

**Design notes**

- A request can live directly under a collection **or** inside a folder
  (`folder_id` and `collection_id` are both nullable), supporting optional nesting.
- `params`, `headers`, `auth`, and `body` are stored as **JSON columns**. They map
  1:1 to the UI's key/value tables and vary in shape (e.g. body modes), so a JSON
  blob is a pragmatic representation that avoids a wide, brittle join graph while
  staying fully reconstructable.
- `ON DELETE CASCADE` + SQLAlchemy `cascade="all, delete-orphan"` keep the tree
  consistent: deleting a collection removes its folders and requests.
- History is a flat log storing a **snapshot** of what was sent, so any entry can
  repopulate the request builder later.

---

## API Overview

| Method   | Path                       | Purpose                                  |
| -------- | -------------------------- | ---------------------------------------- |
| `POST`   | `/run`                     | Execute a request via the proxy/runner   |
| `GET`    | `/collections`             | List collections (with nested requests)  |
| `POST`   | `/collections`             | Create a collection                      |
| `PATCH`  | `/collections/{id}`        | Rename / edit a collection               |
| `DELETE` | `/collections/{id}`        | Delete a collection (cascades)           |
| `POST`   | `/collections/folders`     | Create a folder                          |
| `POST`   | `/requests`                | Save a request                           |
| `PATCH`  | `/requests/{id}`           | Update a saved request                   |
| `DELETE` | `/requests/{id}`           | Delete a saved request                   |
| `GET`    | `/environments`            | List environments (with variables)       |
| `POST`   | `/environments`            | Create an environment                    |
| `PATCH`  | `/environments/{id}`       | Update an environment / its variables    |
| `DELETE` | `/environments/{id}`       | Delete an environment                    |
| `GET`    | `/history`                 | List sent-request history (newest first) |
| `DELETE` | `/history` / `/history/{id}` | Clear all / one history entry          |

`POST /run` body:

```json
{
  "method": "GET",
  "url": "{{base_url}}/posts/1",
  "params": [{ "key": "q", "value": "x", "enabled": true }],
  "headers": [{ "key": "Accept", "value": "application/json", "enabled": true }],
  "auth": { "type": "bearer", "token": "{{token}}" },
  "body": { "mode": "raw", "raw_type": "json", "raw": "{}" },
  "environment_id": 1
}
```

---

## Features

**Core (implemented)**

- Workspace shell — left sidebar (Collections / History), tabbed open requests,
  method selector + URL bar + Send, environment selector, resizable panes.
- Request builder — all 7 methods; query-param editor synced two-way with the URL;
  headers table; body modes (none / raw JSON·text / form-data / urlencoded);
  auth (None / Bearer / Basic).
- Send & response viewer — real requests via the runner; status/time/size;
  Pretty/Raw body with JSON syntax highlighting; response headers; graceful errors.
- Collections CRUD with persistence; save / edit / delete requests.
- Environments & variables with `{{variable}}` resolution at send time.
- History auto-recording and one-click re-open into the builder.
- Postman-feel details — tabs, key/value tables, modals, search, toasts,
  unsaved-dot indicators, settings placeholder.

**Placeholders (toast "coming soon")**

- Team workspaces / sharing · mock servers · API docs generation · monitors ·
  real user auth (a default user is assumed).

---

## Assumptions

- **Single default user** — no auth/login; one shared workspace, as the brief allows.
- **JSON columns** for variable-shaped key/value structures (see schema notes).
- **30-second** request timeout; redirects followed; TLS verified.
- Variables that don't resolve are left as literal `{{name}}` so the user can spot
  them rather than silently sending an empty value.
- SQLite file (`postman.db`) lives beside the backend; `seed.py` is idempotent
  (drops + recreates) so it can be re-run freely.

---

## Deployment

**Backend (Render / Railway).** Root = `backend/`.
Build: `pip install -r requirements.txt`.
Start: `python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
Set `ALLOWED_ORIGINS` to your frontend URL.

**Frontend (Vercel).** Root = `frontend/`.
Set `NEXT_PUBLIC_API_URL` to the deployed backend URL. Build: `npm run build`.

> Note: SQLite on ephemeral hosts resets on redeploy. That's fine for a demo
> (seed runs on boot); for durable data, point `SQLALCHEMY_DATABASE_URL` at a
> mounted volume or a managed Postgres.

---

## Possible Extensions

Pre-request/test scripts (sandboxed JS), Postman Collection v2 import/export,
code-snippet generation (cURL/fetch), cookie management, dark mode, more keyboard
shortcuts. The schema and runner are structured to absorb these without rework.

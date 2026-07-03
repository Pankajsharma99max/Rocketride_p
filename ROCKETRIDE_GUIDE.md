# RocketRide Design Notes — Document Intelligence Assistant

This is a companion to [README.md](README.md): how RocketRide actually works, and how this app is wired to it.

## What is RocketRide?

RocketRide is an open-source AI pipeline engine: a C++ runtime that executes **pipelines** — DAGs of typed **components** connected by typed **data lanes** — defined as portable `.pipe` JSON files. Pipelines are built/debugged visually in a VS Code extension and executed by connecting to a running RocketRide server over a WebSocket **Debug Adapter Protocol (DAP)** connection (default port `5565`), using the official `rocketride` SDK (Python: `pip install rocketride`; TypeScript: `npm install rocketride`).

## How pipelines run

```
[ Your app (this Flask backend) ]
        │  rocketride SDK: RocketRideClient()
        │  connect() → use(filepath=...) → chat() / send_files() → disconnect()
        ▼
[ RocketRide server ]  ── WebSocket DAP, port 5565 ──▶  C++ multithreaded engine
        │
        ▼
[ External services: Gemini API, Qdrant, OCR/embedding models ]
```

Concretely, per pipeline, once:

```python
client = RocketRideClient()          # reads ROCKETRIDE_URI / ROCKETRIDE_APIKEY from .env
await client.connect()
result = await client.use(filepath='pipeline/query.pipe', use_existing=True)
token = result['token']
```

Then repeatedly, per request:

```python
response = await client.chat(token=token, question=question)   # chat-source pipelines
# or
results = await client.send_files(files, token)                 # webhook-source pipelines
```

`app.py` runs a single background asyncio event loop in its own thread (since the SDK is `async` and Flask's dev server is sync) and starts both pipelines once at process startup, per RocketRide's own guidance against re-starting a pipeline on every request.

## Data lanes used in this project

| Lane | Produced by | Consumed by |
|---|---|---|
| `tags` | `webhook` (file metadata) | `parse` |
| `text` | `parse`, `ocr`, `anonymize_text` | `anonymize_text`, `preprocessor_langchain` |
| `image` | `parse` (scanned pages) | `ocr` |
| `documents` | `preprocessor_langchain`, `embedding_transformer` | `embedding_transformer`, `qdrant` |
| `questions` | `chat`, `embedding_transformer` | `embedding_transformer`, `qdrant`, `prompt` |
| `answers` | `llm_gemini` | `response_answers`, `audio_tts` |
| `audio` | `audio_tts` | `response_audio` |

## Why no response node on the ingestion pipeline

`ingestion.pipe` ends at `qdrant` (store mode: `documents` in, no output). RocketRide's own docs are explicit that ingestion pipelines (`webhook → process → store`) don't need a response node — the store is the terminal node. The Flask `/api/upload` route instead reports success/failure based on the per-file result from `client.send_files()`.

## Document types, focus, and quick actions: an app-layer concern, not a pipeline one

This app covers four document types (General, RTI/Government, Finance, Research) and three quick actions (Summarize, Key figures & dates, Explain simply), but none of that lives in `pipeline/query.pipe` as separate `prompt` nodes or per-category pipeline files. Instead, `app.py`'s `CATEGORIES` / `QUICK_ACTIONS` dicts and `_build_question()` helper attach the relevant guidance to each `Question` via `addInstruction()` before it's sent through `client.chat()`. The `chat` source ingests the whole `Question` object (question text + instructions + history), so this per-request framing rides through `embedding_transformer` → `qdrant` unchanged and lands in front of the LLM alongside the pipeline's own baseline `prompt` node instructions.

Why not just author four `.pipe` files (or four `prompt`-node variants) instead? Because RocketRide's guidance is to start a pipeline once and reuse it (`ROCKETRIDE_COMMON_MISTAKES.md`, "Starting Pipeline for Every Request") — a different pipeline per category would mean either running four pipelines concurrently for no reason, or tearing down/restarting one every time a user switches their answering focus. Per-request `Question` instructions get the same effect against a single long-lived pipeline.

## Reconnecting after a settings change

The Settings panel (add/replace/remove RocketRide + Gemini keys, server URL, OCR language, TTS voice) writes straight to `.env`, then calls `app.py`'s `_reconnect()`:

1. `terminate()` both running pipeline tasks (best-effort — a broken existing connection shouldn't block reconnecting).
2. `disconnect()` the old `RocketRideClient`.
3. `load_dotenv(override=True)` to refresh `os.environ` from the just-written `.env`.
4. Construct a fresh `RocketRideClient()` (so it re-reads `ROCKETRIDE_URI`/`ROCKETRIDE_APIKEY`) and re-run the same startup sequence (`client.use(..., use_existing=True)` for both pipelines).

This is necessary because `${ROCKETRIDE_*}` substitution happens once, at `client.use()` time — a pipeline that's already running won't pick up a `.env` edit on its own (same "Pipeline Already Running" class of behavior `ROCKETRIDE_COMMON_MISTAKES.md` describes). If the reconnect fails (e.g. the new URL/key doesn't actually work), the `.env` write still stands — `/api/settings` reports `{"status": "ok", "reconnect_error": "..."}` (HTTP 200, not an error status) so the UI still refreshes to show what was actually saved, rather than silently reverting to a stale "not set" display for a key that in fact was set.

## Pitfalls this project deliberately avoids

(See RocketRide's own `ROCKETRIDE_COMMON_MISTAKES.md` for the full list — these are the ones most relevant here.)

- **Wrong source/method pairing**: `chat` source → `client.chat()`; `webhook` source → `client.send_files()`. Mixing these raises errors.
- **Starting a pipeline per request**: both pipelines are started once at process startup and reused (`use_existing=True` so repeated startup attempts don't error if already running).
- **Assuming default response keys**: `_extract_by_lane()` in `app.py` reads `result_types` to find the actual response key instead of hardcoding `'answers'`/`'audio'`, so it stays correct even if a `laneName` is customized later.
- **Blocking the event loop**: all RocketRide SDK calls happen inside the dedicated background event loop, not inline in Flask's sync request thread.
- **Reporting a partial success as a hard failure**: an HTTP error status on `/api/settings` would make the frontend skip refreshing its display of what's actually configured (see "Reconnecting after a settings change" above) — the `.env` write and the live reconnect are reported independently.

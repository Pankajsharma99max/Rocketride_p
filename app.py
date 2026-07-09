"""
Document Intelligence Assistant -- Flask backend on top of RocketRide.

Covers RTI/government paperwork, financial statements, research papers, and
general documents. Two pipelines (see pipeline/):
  - ingestion.pipe : webhook -> parse/ocr -> anonymize_text -> chunk -> embed -> qdrant
  - query.pipe     : chat -> embed -> qdrant search -> prompt -> llm -> answer (+ audio)

Both pipelines are started ONCE at process startup and reused for every
request (client.use() is slow -- see ROCKETRIDE_COMMON_MISTAKES.md, "Starting
Pipeline for Every Request"). Since RocketRide's SDK is asyncio-based and
Flask's dev server is synchronous, a single background event loop runs in its
own thread; each request hands its coroutine to that loop instead of blocking
it or spinning up a fresh loop per request.

Document categories and quick actions are deliberately NOT baked into the
pipeline's static `prompt` node -- that would require restarting the query
pipeline (and losing the "start once, reuse" model) every time a user picks a
different category. Instead they're layered on per-request via
`Question.addInstruction()` / `addContext()`, which the `chat` source and the
static `prompt` node both see as part of the question -- see `_build_question()`.
"""

import asyncio
import base64
import json
import logging
import os
import threading
import time
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory

from rocketride import RocketRideClient
from rocketride.schema import Question, QuestionHistory

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

APP_ROOT = Path(__file__).parent
UPLOAD_DIR = APP_ROOT / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)

FRONTEND_DIST = APP_ROOT / 'frontend' / 'dist'
app = Flask(__name__, static_folder=str(FRONTEND_DIST), static_url_path='')

# ── Background event loop (bridges sync Flask routes to the async SDK) ─────
_loop = asyncio.new_event_loop()
threading.Thread(target=_loop.run_forever, daemon=True, name='rocketride-loop').start()


def run_async(coro):
    return asyncio.run_coroutine_threadsafe(coro, _loop).result()


# ── RocketRide client + pipeline tokens (set once at startup) ──────────────
client = RocketRideClient()
_state = {'ingestion_token': None, 'query_token': None, 'ready': False}

# In-memory library of indexed documents (filename + status + timestamp).
# This app has a single shared collection and no per-user auth, so a simple
# process-local list is enough to drive the "Library" panel in the UI --
# it is not a substitute for querying Qdrant directly.
_documents: list[dict] = []


async def _startup():
    await client.connect()
    ingestion = await client.use(filepath=str(APP_ROOT / 'pipeline' / 'ingestion.pipe'), use_existing=True)
    query = await client.use(filepath=str(APP_ROOT / 'pipeline' / 'query.pipe'), use_existing=True)
    _state['ingestion_token'] = ingestion['token']
    _state['query_token'] = query['token']
    _state['ready'] = True
    logger.info('Connected. ingestion_token=%s query_token=%s', ingestion['token'], query['token'])


async def _reconnect():
    """Tear down the current connection/pipelines and rebuild them from a
    freshly-read .env. Used after settings are saved or cleared so a changed
    API key/URL/OCR-language/TTS-voice actually takes effect -- `use()`
    substitutes `${ROCKETRIDE_*}` variables at pipeline-start time, so a
    running pipeline won't pick up a `.env` change on its own (see
    ROCKETRIDE_COMMON_MISTAKES.md, "Pipeline Already Running").
    """
    global client

    try:
        if _state['ingestion_token']:
            await client.terminate(_state['ingestion_token'])
        if _state['query_token']:
            await client.terminate(_state['query_token'])
        await client.disconnect()
    except Exception:
        pass  # best-effort cleanup -- a broken old connection shouldn't block reconnecting

    load_dotenv(override=True)
    _state['ready'] = False
    _state['ingestion_token'] = None
    _state['query_token'] = None
    client = RocketRideClient()  # re-reads ROCKETRIDE_URI / ROCKETRIDE_APIKEY from the refreshed environment
    await _startup()


def ensure_ready():
    if not _state['ready']:
        run_async(_startup())


# ── Settings (.env) management ──────────────────────────────────────────────

ENV_PATH = APP_ROOT / '.env'

# field name (used by the frontend) -> (env var, is_secret)
SETTINGS_FIELDS = {
    'rocketride_uri': ('ROCKETRIDE_URI', False),
    'rocketride_apikey': ('ROCKETRIDE_APIKEY', True),
    'gemini_apikey': ('ROCKETRIDE_GEMINI_KEY', True),
    'ocr_profile': ('ROCKETRIDE_OCR_PROFILE', False),
    'ocr_script_family': ('ROCKETRIDE_OCR_SCRIPT_FAMILY', False),
    'tts_voice': ('ROCKETRIDE_TTS_VOICE', False),
}

_PLACEHOLDER_MARKERS = ('your-', 'YOUR_')


def _read_env_values() -> dict[str, str]:
    if not ENV_PATH.exists():
        return {}
    values = {}
    for line in ENV_PATH.read_text(encoding='utf-8').splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or '=' not in stripped:
            continue
        key, _, val = stripped.partition('=')
        values[key.strip()] = val.strip()
    return values


def _write_env_updates(updates: dict[str, str | None]) -> None:
    """Upsert `{ENV_VAR: value}` into .env, preserving comments/other lines.
    A value of `None` deletes that line entirely (used for clearing a key).
    """
    lines = ENV_PATH.read_text(encoding='utf-8').splitlines() if ENV_PATH.exists() else []
    applied: set[str] = set()
    out = []
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or '=' not in stripped:
            out.append(line)
            continue
        key = stripped.split('=', 1)[0].strip()
        if key in updates:
            applied.add(key)
            if updates[key] is not None:
                out.append(f'{key}={updates[key]}')
            # value is None -> drop this line (key cleared)
        else:
            out.append(line)

    for key, val in updates.items():
        if key not in applied and val is not None:
            out.append(f'{key}={val}')

    ENV_PATH.write_text('\n'.join(out) + '\n', encoding='utf-8')

    for key, val in updates.items():
        if val is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = val


def _mask(value: str) -> str:
    if len(value) <= 4:
        return '••••'
    return f'••••{value[-4:]}'


def _is_placeholder(value: str) -> bool:
    return not value or any(value.startswith(m) for m in _PLACEHOLDER_MARKERS)


# ── Response helpers ────────────────────────────────────────────────────────


def _extract_by_lane(response: dict, lane: str):
    """Find a response value by its lane type via `result_types`, falling back
    to the default key of the same name. See ROCKETRIDE_COMMON_MISTAKES.md,
    "Not Checking Response Structure" -- a customized `laneName` would change
    the key, so `result_types` is the reliable way to find it.
    """
    result_types = response.get('result_types', {}) or {}
    for key, lane_type in result_types.items():
        if lane_type == lane and key in response:
            return response[key]
    return response.get(lane)


def _format_source(doc) -> dict:
    """Normalize one retrieved chunk (from the `sources` lane) into a small
    citation card for the UI. Defensive about field naming since the engine
    may serialize a Doc as a dict with either snake_case or camelCase keys.
    """
    if not isinstance(doc, dict):
        return {'snippet': str(doc)[:280], 'document': None, 'score': None}

    content = doc.get('page_content') or doc.get('pageContent') or doc.get('content') or doc.get('text') or ''
    metadata = doc.get('metadata') or {}
    document_name = metadata.get('objectId') or metadata.get('parent') or metadata.get('document') or None
    snippet = content.strip()
    if len(snippet) > 280:
        snippet = snippet[:280].rsplit(' ', 1)[0] + '…'

    return {'snippet': snippet, 'document': document_name, 'score': doc.get('score')}


# ── Document categories & quick actions ─────────────────────────────────────
#
# These are intentionally NOT pipeline-level config (see module docstring) --
# they're per-request `Question` instructions layered on top of the pipeline's
# own baseline grounding instructions in `pipeline/query.pipe`.

CATEGORIES = {
    'general': {
        'label': 'General document',
        'instruction': 'Answer using only the provided document context. If the answer is not in the context, say so plainly.',
    },
    'rti_govt': {
        'label': 'RTI / Government',
        'instruction': (
            'This is a government or RTI (Right to Information) document. Explain in plain, jargon-free '
            'language. Cite the specific section, clause, or paragraph the answer comes from where possible. '
            'Spell out any acronym the first time you use it.'
        ),
    },
    'finance': {
        'label': 'Financial document',
        'instruction': (
            'This is a financial document (statement, filing, invoice, or report). Be precise with numbers, '
            'currency, dates, and percentages -- quote exact figures from the source rather than rounding or '
            'approximating. Flag clearly if a figure could not be found rather than estimating one.'
        ),
    },
    'research': {
        'label': 'Research / academic',
        'instruction': (
            'This is a research paper or academic document. Reference the specific section, methodology, or '
            'finding the answer draws on. Maintain a precise, neutral, academic tone rather than a conversational one.'
        ),
    },
}

QUICK_ACTIONS = {
    'summarize': {
        'label': 'Summarize',
        'question': 'Summarize this document.',
        'instruction': 'Produce a concise summary of the main points as 4-6 short bullet points.',
    },
    'key_figures': {
        'label': 'Key figures & dates',
        'question': 'Extract the key figures, dates, and facts from this document.',
        'instruction': (
            'List the key numbers, dates, deadlines, and figures as a structured bullet list, quoting exact '
            'values from the source. Do not compute or estimate anything not explicitly stated.'
        ),
    },
    'plain_language': {
        'label': 'Explain simply',
        'question': 'Explain this document in the simplest possible terms.',
        'instruction': (
            'Rewrite the explanation in plain, simple language suitable for someone with no background in '
            'legal, financial, or technical terminology. Spell out any acronym or jargon term you have to use.'
        ),
    },
}


def _build_question(text: str, category: str, action: str, history: list) -> Question:
    """Build a `Question` carrying conversation history plus category/quick-action
    instructions -- see the module docstring for why this lives here rather than
    in the pipeline's static `prompt` node.
    """
    question = Question()

    for turn in history or []:
        role = turn.get('role')
        content = turn.get('content')
        if role in ('user', 'assistant') and content:
            question.addHistory(QuestionHistory(role=role, content=content))

    category_info = CATEGORIES.get(category)
    if category_info:
        question.addInstruction(category_info['label'], category_info['instruction'])

    action_info = QUICK_ACTIONS.get(action)
    if action_info:
        question.addInstruction(action_info['label'], action_info['instruction'])
        text = text or action_info['question']

    question.addQuestion(text)
    return question


# ── Routes ──────────────────────────────────────────────────────────────────


@app.route('/')
def index():
    if not (FRONTEND_DIST / 'index.html').exists():
        return (
            "Frontend not built yet. Run 'npm install && npm run build' inside frontend/, then restart app.py.",
            503,
        )
    return send_from_directory(FRONTEND_DIST, 'index.html')


@app.route('/health')
def health():
    try:
        ensure_ready()
    except Exception as e:
        return jsonify({'status': 'error', 'detail': str(e)}), 503
    return jsonify(
        {
            'status': 'ok' if _state['ready'] else 'starting',
            'ingestion_token': _state['ingestion_token'],
            'query_token': _state['query_token'],
        }
    )


@app.route('/api/upload', methods=['POST'])
def upload():
    """Index a document through the ingestion pipeline (webhook source -> send_files())."""
    try:
        ensure_ready()
    except Exception as e:
        return jsonify(error=f'RocketRide server unreachable: {e}'), 503

    if 'file' not in request.files:
        return jsonify(error="No file provided (expected form field 'file')"), 400

    f = request.files['file']
    if not f.filename:
        return jsonify(error='No file selected'), 400

    dest = UPLOAD_DIR / f.filename
    f.save(dest)

    try:
        results = run_async(client.send_files([str(dest)], _state['ingestion_token']))
    except Exception as e:
        logger.exception('Upload failed')
        return jsonify(error=str(e)), 500

    result = results[0] if results else {}
    ok = result.get('action') == 'complete'
    category = request.form.get('category') if request.form.get('category') in CATEGORIES else 'general'

    _documents.append(
        {
            'filename': f.filename,
            'status': 'indexed' if ok else 'error',
            'detail': result.get('error') if not ok else None,
            'indexed_at': time.time(),
            'category': category,
        }
    )

    return jsonify(
        {
            'status': 'indexed' if ok else 'error',
            'filename': f.filename,
            'category': category,
            'detail': result.get('error') if not ok else None,
        }
    ), (200 if ok else 500)


@app.route('/api/documents')
def documents():
    """List documents indexed in this process's lifetime, newest first."""
    return jsonify({'documents': list(reversed(_documents))})


@app.route('/api/categories')
def categories():
    """Document categories and quick actions, so the frontend doesn't hardcode
    a second copy of labels/instructions that only make sense server-side."""
    return jsonify(
        {
            'categories': [{'id': k, 'label': v['label']} for k, v in CATEGORIES.items()],
            'quick_actions': [{'id': k, 'label': v['label']} for k, v in QUICK_ACTIONS.items()],
        }
    )


CONTACT_LOG = APP_ROOT / 'contact_messages.jsonl'


@app.route('/api/contact', methods=['POST'])
def contact():
    """Store a landing-page contact message.

    This does not send an email -- there's no SMTP/mail service configured.
    Messages are appended to a local, gitignored JSONL file so nothing is
    lost between requests; wire up a real mail provider here if this app is
    ever deployed somewhere someone needs to actually be notified.
    """
    data = request.get_json(force=True, silent=True) or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip()
    message = (data.get('message') or '').strip()

    if not name or not email or not message:
        return jsonify(error='Name, email, and message are all required.'), 400
    if '@' not in email or '.' not in email.split('@')[-1]:
        return jsonify(error='That email address doesn\'t look right.'), 400

    entry = {'name': name, 'email': email, 'message': message, 'submitted_at': time.time()}
    with open(CONTACT_LOG, 'a', encoding='utf-8') as f:
        f.write(json.dumps(entry, ensure_ascii=False) + '\n')

    logger.info('Contact message received from %s <%s>', name, email)
    return jsonify({'status': 'ok'})


@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Report which settings are configured. Secrets are never sent back in
    full -- only a masked hint (last 4 chars) and a boolean, so the UI can
    show "already set" without re-exposing the value on every page load.
    """
    values = _read_env_values()
    out = {}
    for field, (env_key, is_secret) in SETTINGS_FIELDS.items():
        val = values.get(env_key, '')
        configured = not _is_placeholder(val)
        out[field] = {
            'set': configured,
            'value': None if is_secret else (val if configured else ''),
            'masked': _mask(val) if is_secret and configured else None,
        }
    return jsonify(out)


@app.route('/api/settings', methods=['POST'])
def update_settings():
    """Save one or more settings, persist them to .env, and reconnect so the
    change actually takes effect (see `_reconnect` docstring)."""
    data = request.get_json(force=True, silent=True) or {}

    updates: dict[str, str] = {}
    for field, (env_key, _is_secret) in SETTINGS_FIELDS.items():
        if field in data and data[field] is not None and str(data[field]).strip() != '':
            updates[env_key] = str(data[field]).strip()

    if not updates:
        return jsonify(error='No settings provided'), 400

    # The .env write below is the operation the caller actually asked for, and
    # it always succeeds independent of connectivity. A failed reconnect is
    # reported as a warning on a 200, not a failure status -- an earlier
    # version returned 502 here, which made the frontend skip refreshing the
    # settings panel and show a stale "still set" hint for a key that had, in
    # fact, already been saved.
    _write_env_updates(updates)

    try:
        run_async(_reconnect())
    except Exception as e:
        logger.exception('Reconnect after settings save failed')
        return jsonify({'status': 'ok', 'reconnect_error': f'Saved, but could not reconnect: {e}'})

    return jsonify({'status': 'ok'})


@app.route('/api/settings', methods=['DELETE'])
def clear_settings():
    """Clear one or more settings (removes them from .env) and reconnect.
    Body: `{"fields": ["gemini_apikey", ...]}`; omit `fields` to clear everything.
    """
    data = request.get_json(force=True, silent=True) or {}
    fields = data.get('fields') or list(SETTINGS_FIELDS.keys())

    updates = {SETTINGS_FIELDS[f][0]: None for f in fields if f in SETTINGS_FIELDS}
    if not updates:
        return jsonify(error='No valid fields to clear'), 400

    _write_env_updates(updates)

    try:
        run_async(_reconnect())
    except Exception as e:
        logger.exception('Reconnect after settings clear failed')
        return jsonify({'status': 'ok', 'reconnect_error': f'Cleared, but could not reconnect: {e}'})

    return jsonify({'status': 'ok'})


@app.route('/api/query', methods=['POST'])
def query():
    """Ask a question through the query pipeline (chat source -> chat())."""
    try:
        ensure_ready()
    except Exception as e:
        return jsonify(error=f'RocketRide server unreachable: {e}'), 503

    data = request.get_json(force=True, silent=True) or {}
    text = (data.get('question') or '').strip()
    action = data.get('action') if data.get('action') in QUICK_ACTIONS else None
    category = data.get('category') if data.get('category') in CATEGORIES else 'general'

    if not text and not action:
        return jsonify(error='question is required'), 400

    question = _build_question(text, category, action, data.get('history'))

    try:
        response = run_async(client.chat(token=_state['query_token'], question=question))
    except Exception as e:
        logger.exception('Query failed')
        return jsonify(error=str(e)), 500

    answers = _extract_by_lane(response, 'answers') or []
    answer = answers[0] if answers else 'No answer received.'

    audio_items = _extract_by_lane(response, 'audio') or []
    audio_b64 = None
    if audio_items:
        raw = audio_items[0]
        audio_bytes = raw if isinstance(raw, (bytes, bytearray)) else str(raw).encode('latin-1', errors='ignore')
        audio_b64 = base64.b64encode(audio_bytes).decode('ascii')

    source_docs = _extract_by_lane(response, 'documents') or []
    sources = [_format_source(d) for d in source_docs[:5]]

    return jsonify({'answer': answer, 'audio_base64': audio_b64, 'sources': sources})


if __name__ == '__main__':
    try:
        ensure_ready()
    except Exception as e:
        # Don't let a down/unconfigured RocketRide server keep the UI itself
        # from loading -- /health, /api/upload, /api/query will retry
        # ensure_ready() on each request and report the real error there.
        logger.warning('RocketRide not reachable at startup (%s). Serving UI anyway.', e)
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

"""
Setup checker for the RTI Document Assistant RocketRide project.

Run this before `python app.py` to catch configuration problems early:

    python check.py
"""

import json
import sys
from pathlib import Path

APP_ROOT = Path(__file__).parent

REQUIRED_ENV_VARS = [
    'ROCKETRIDE_URI',
    'ROCKETRIDE_APIKEY',
    'ROCKETRIDE_GEMINI_KEY',
    'ROCKETRIDE_QDRANT_HOST',
    'ROCKETRIDE_QDRANT_PORT',
    'ROCKETRIDE_COLLECTION_NAME',
]

PLACEHOLDER_MARKERS = ('your-', 'YOUR_')


def check_env_file() -> bool:
    env_path = APP_ROOT / '.env'
    if not env_path.exists():
        print(f'FAIL: {env_path} not found. Copy env.example to .env and fill in real values.')
        return False

    values = {}
    for line in env_path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, val = line.partition('=')
        values[key.strip()] = val.strip()

    ok = True
    for var in REQUIRED_ENV_VARS:
        val = values.get(var)
        if not val:
            print(f'FAIL: {var} is missing from .env')
            ok = False
        elif any(val.startswith(m) for m in PLACEHOLDER_MARKERS):
            print(f'WARN: {var} still looks like a placeholder ({val!r}) -- set a real value.')

    if ok:
        print('OK: .env present with required variables set.')
    return ok


def check_pipeline_files() -> bool:
    ok = True
    for name in ('ingestion.pipe', 'query.pipe'):
        path = APP_ROOT / 'pipeline' / name
        if not path.exists():
            print(f'FAIL: {path} not found.')
            ok = False
            continue
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
        except json.JSONDecodeError as e:
            print(f'FAIL: {path} is not valid JSON: {e}')
            ok = False
            continue

        keys = list(data.keys())
        if keys[0] != 'components':
            print(f'FAIL: {path}: "components" must be the first key (found {keys[0]!r} first).')
            ok = False
        if 'project_id' not in data or '${' in str(data.get('project_id', '')):
            print(f'FAIL: {path}: "project_id" must be a literal GUID.')
            ok = False
        if 'viewport' not in data or 'version' not in data:
            print(f'FAIL: {path}: missing "viewport" or "version".')
            ok = False

        ids = [c['id'] for c in data.get('components', [])]
        if len(ids) != len(set(ids)):
            print(f'FAIL: {path}: duplicate component ids.')
            ok = False

        if ok:
            print(f'OK: {path} looks structurally valid ({len(ids)} components).')
    return ok


def check_sdk_installed() -> bool:
    try:
        import rocketride  # noqa: F401

        print('OK: rocketride SDK is importable.')
        return True
    except ImportError:
        print("FAIL: rocketride SDK not installed. Run: pip install -r requirements.txt")
        return False


def check_flask_installed() -> bool:
    try:
        import flask  # noqa: F401

        print('OK: flask is importable.')
        return True
    except ImportError:
        print('FAIL: flask not installed. Run: pip install -r requirements.txt')
        return False


def main() -> int:
    print('RTI Document Assistant -- setup check\n' + '-' * 40)
    checks = [
        check_sdk_installed(),
        check_flask_installed(),
        check_env_file(),
        check_pipeline_files(),
    ]
    print('-' * 40)
    if all(checks):
        print('All checks passed. Run: python app.py')
        return 0
    print('Some checks failed -- fix the issues above before running app.py')
    return 1


if __name__ == '__main__':
    sys.exit(main())

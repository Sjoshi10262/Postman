#!/usr/bin/env bash
# One-shot dev launcher for the backend.
set -e
python -m venv .venv 2>/dev/null || true
source .venv/bin/activate 2>/dev/null || true
pip install -q -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --port 8000

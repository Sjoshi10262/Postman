#!/bin/sh
set -e

# Run database seed if SQLite file does not exist or SEED_DB environment variable is set to 'true'
if [ ! -f "postman.db" ] || [ "$SEED_DB" = "true" ]; then
    echo "Initializing and seeding database..."
    python -m app.seed
else
    echo "Database file already exists. Skipping auto-seeding. Set SEED_DB=true to force re-seed."
fi

# Run FastAPI app
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"

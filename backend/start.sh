#!/usr/bin/env bash
# Thin wrapper for Render when Start Command is still: /bin/bash start.sh
set -euo pipefail
cd "$(dirname "$0")"
exec python -m uvicorn main:app --host 0.0.0.0 --port "${PORT}"

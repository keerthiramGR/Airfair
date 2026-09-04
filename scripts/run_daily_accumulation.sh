#!/usr/bin/env bash
# =========================================================================
#  AIRFAIR — Daily Real Airfare Data Accumulation Linux/Cron Runner
# =========================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting AIRFAIR daily accumulation runner..."
python3 -m backend.jobs.daily_accumulation_scheduler --delay 1.5
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Daily accumulation run completed."

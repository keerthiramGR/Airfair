@echo off
REM =========================================================================
REM  AIRFAIR — Daily Real Airfare Data Accumulation Windows Runner
REM  Executes SerpApi collection across configured corridors & lead-time windows
REM =========================================================================

cd /d "%~dp0\.."
echo [%date% %time%] Starting AIRFAIR daily accumulation runner...
python -m backend.jobs.daily_accumulation_scheduler --delay 1.5
echo [%date% %time%] Daily accumulation run completed.

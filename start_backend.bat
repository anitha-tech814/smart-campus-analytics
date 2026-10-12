@echo off
echo ====================================================
echo Starting Smart Campus Analytics - Backend API Server
echo ====================================================
cd /d "%~dp0backend"
set PYTHONPATH=%~dp0backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause

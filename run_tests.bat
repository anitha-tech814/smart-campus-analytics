@echo off
echo =======================================================
echo Running Smart Campus Analytics Core Unit Test Suite
echo =======================================================
cd /d "%~dp0backend"
set PYTHONPATH=%~dp0backend
python -m unittest discover -s tests -p "test_*.py"
pause

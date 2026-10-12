@echo off
echo =======================================================
echo Starting Smart Campus Analytics - React Frontend Server
echo =======================================================
cd /d "%~dp0frontend"
set Path=%~dp0tools_bin;%Path%
npm run dev
pause

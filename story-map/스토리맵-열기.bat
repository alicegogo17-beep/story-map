@echo off
set SCRIPT_DIR=%~dp0
set PORT=8765
start "" cmd /c "cd /d %SCRIPT_DIR% && python server.py"
timeout /t 1 >nul
start "" "http://127.0.0.1:%PORT%"

@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update-server.ps1"
if errorlevel 1 (
    echo Update failed. See the message above.
    pause
    exit /b 1
)
pause

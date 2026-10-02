@echo off
cd /d "%~dp0"
echo Open http://localhost:5173 in your browser.
python -m http.server 5173 --bind 127.0.0.1 --directory dist

@echo off
cd /d "%~dp0"
start "" http://localhost:3100
npm run dev -- -p 3100

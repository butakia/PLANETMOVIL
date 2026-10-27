@echo off
cd /d "%~dp0"
echo Preparando Planet Movil (la primera vez tarda un poco)...
call npm run build
start "" http://localhost:3100
npm run start -- -p 3100

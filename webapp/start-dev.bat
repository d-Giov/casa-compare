@echo off
title CasaCompare - Dev Server
cd /d "%~dp0"

:: Trova Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Program Files\nodejs\nodevars.bat" call "C:\Program Files\nodejs\nodevars.bat"
)

echo Avvio CasaCompare su http://localhost:3000 ...
echo Premi Ctrl+C per fermare.
echo.
call npm run dev
pause

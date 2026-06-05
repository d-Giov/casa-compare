@echo off
title CasaCompare - Setup
cd /d "%~dp0"

echo.
echo ============================================
echo  CasaCompare - Setup automatico
echo ============================================
echo.

:: ---- Trova Node.js (controlla tutte le posizioni comuni) ----
set "NODE_DIR="

:: 1. Già nel PATH?
where node.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('where node.exe') do set "NODE_EXE=%%i"
    goto :node_found
)

:: 2. Percorsi standard
for %%P in (
    "C:\Program Files\nodejs"
    "C:\Program Files (x86)\nodejs"
    "%APPDATA%\nvm\current"
    "%LOCALAPPDATA%\Programs\nodejs"
    "%ProgramFiles%\nodejs"
) do (
    if exist "%%~P\node.exe" (
        set "NODE_DIR=%%~P"
        set "NODE_EXE=%%~P\node.exe"
        set "PATH=%%~P;%%~P\node_modules\.bin;%PATH%"
        goto :node_found
    )
)

:: 3. Cerca con where in tutti i drive
for /d %%D in (C D E) do (
    if exist "%%D:\Program Files\nodejs\node.exe" (
        set "NODE_DIR=%%D:\Program Files\nodejs"
        set "NODE_EXE=%%D:\Program Files\nodejs\node.exe"
        set "PATH=%%D:\Program Files\nodejs;%PATH%"
        goto :node_found
    )
)

echo ERRORE: Node.js non trovato nel sistema.
echo Aprilo da Start Menu ^> "Node.js command prompt" ed esegui:
echo   npm install
echo   node setup-supabase.mjs
echo   npm run dev
pause
exit /b 1

:node_found
echo Node.js trovato:
node --version
echo npm versione:
npm --version
echo.

echo [1/3] npm install...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERRORE: npm install fallito.
    pause
    exit /b 1
)

echo.
echo [2/3] Setup Supabase...
node setup-supabase.mjs

echo.
echo [3/3] Avvio server Next.js su http://localhost:3000
echo       Premi Ctrl+C per fermare.
echo.
call npm run dev

pause

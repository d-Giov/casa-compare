@echo off
title CasaCompare - Push to GitHub
cd /d "%~dp0"

set GH_TOKEN=YOUR_GITHUB_TOKEN_HERE
set GH_USER=d-Giov
set REPO_NAME=casa-compare

echo.
echo ============================================
echo  CasaCompare - Setup GitHub Repository
echo ============================================
echo.

:: 1. Crea il repo su GitHub tramite API
echo [1/4] Creando repository su GitHub...
curl -s -X POST ^
  -H "Authorization: token %GH_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"%REPO_NAME%\",\"description\":\"Webapp + Chrome Extension per comparare offerte immobiliari con AI\",\"private\":false}" ^
  https://api.github.com/user/repos > nul 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo  Provo con curl alternativo...
)
echo  Repo creato (o gia' esistente).

:: 2. Crea .gitignore
echo.
echo [2/4] Creando .gitignore...
(
echo # Dependencies
echo node_modules/
echo .pnp
echo .pnp.js
echo.
echo # Next.js
echo .next/
echo out/
echo build/
echo.
echo # Environment variables - MAI committare questi!
echo .env.local
echo .env.*.local
echo.
echo # Misc
echo .DS_Store
echo *.pem
echo npm-debug.log*
echo.
echo # Extension build artifacts
echo extension/dist/
) > .gitignore
echo  .gitignore creato.

:: 3. Inizializza git e commit
echo.
echo [3/4] Inizializzando git e creando commit...
git init
git config user.email "giovannuccidavide@gmail.com"
git config user.name "Davide Giovannucci"
git add .
git commit -m "feat: initial commit - CasaCompare MVP

- Chrome Extension (Manifest V3) con scraper generico
- Webapp Next.js 14 + Supabase + OpenAI GPT-4o
- Dashboard comparazione immobili
- Valutazione AI con score, pro/contro, prezzo di mercato
- Upload documenti con verifica AI
- Simulatore mutuo
- Confronto side-by-side immobili"

:: 4. Push su GitHub
echo.
echo [4/4] Push su GitHub...
git remote remove origin 2>nul
git remote add origin https://%GH_TOKEN%@github.com/%GH_USER%/%REPO_NAME%.git
git branch -M main
git push -u origin main

echo.
echo ============================================
if %ERRORLEVEL% EQU 0 (
    echo  Repository pubblicato con successo!
    echo  https://github.com/%GH_USER%/%REPO_NAME%
) else (
    echo  Errore durante il push. Controlla il token e riprova.
)
echo ============================================
echo.
pause

@echo off
setlocal

set "APP_ROOT=%~dp0"
cd /d "%APP_ROOT%"

echo.
echo ==========================================
echo   PECTAA Image Resizer - Local Server
echo ==========================================
echo.

if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" (
  set "PY_BOOT=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    set "PY_BOOT=py"
  ) else (
    set "PY_BOOT=python"
  )
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating Python virtual environment...
  "%PY_BOOT%" -3.13 -m venv .venv 2>nul
  if errorlevel 1 "%PY_BOOT%" -m venv .venv
  if errorlevel 1 (
    echo.
    echo Python virtual environment could not be created.
    echo Please make sure Python is installed and added to PATH.
    pause
    exit /b 1
  )
)

if not exist ".venv\Scripts\uvicorn.exe" (
  echo Installing backend requirements. First time may take several minutes...
  ".venv\Scripts\python.exe" -m pip install --upgrade pip
  ".venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
  if errorlevel 1 (
    echo.
    echo Backend requirements install failed.
    pause
    exit /b 1
  )
)

if not exist "frontend\node_modules" (
  echo Installing frontend requirements...
  cd /d "%APP_ROOT%frontend"
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo Frontend requirements install failed. Please make sure Node.js is installed.
    pause
    exit /b 1
  )
  cd /d "%APP_ROOT%"
)

echo Starting personal unlimited backend on http://127.0.0.1:8000
start "PECTAA Backend" cmd /k "cd /d ""%APP_ROOT%"" && set ""DISABLE_USAGE_LIMITS=true"" && set ""DEFAULT_PHOTO_LIMIT=999999999"" && set ""DATABASE_URL=personal_school_sessions.db"" && set ""ADMIN_KEY=personal-admin"" && "".venv\Scripts\python.exe"" -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"

echo Starting frontend on http://127.0.0.1:5173
start "PECTAA Frontend" cmd /k "cd /d ""%APP_ROOT%frontend"" && set ""VITE_API_URL=http://127.0.0.1:8000"" && set ""VITE_PERSONAL_MODE=true"" && npm.cmd run dev -- --host 127.0.0.1"

timeout /t 5 /nobreak >nul
start "" "http://127.0.0.1:5173"

echo.
echo App is starting. If browser opens before ready, wait 10 seconds and refresh.
echo Backend:  http://127.0.0.1:8000/api/health
echo Frontend: http://127.0.0.1:5173
echo Local mode: Personal unlimited, no login screen
echo.
pause

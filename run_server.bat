@echo off
title CodeRefine Server
color 0A

cd /d "%~dp0"

:: ── Log file setup ────────────────────────────────────────────────────────────
set LOGFILE=%~dp0server.log
set PYTHON="C:\Users\valli sai supriya\AppData\Local\Programs\Python\Python314\python.exe"

:: Verify Python exists
if not exist %PYTHON% (
    echo [ERROR] Python not found at %PYTHON% >> "%LOGFILE%"
    echo [ERROR] Python not found. Check PYTHON path in run_server.bat.
    pause
    exit /b 1
)

echo.
echo  ============================================
echo   CodeRefine - AI Code Review Engine
echo   Server  :  http://localhost:8080
echo   Log     :  %LOGFILE%
echo  ============================================
echo.

:START
echo [%DATE% %TIME%] Server starting... >> "%LOGFILE%"
echo  [+] Starting server...

%PYTHON% main.py >> "%LOGFILE%" 2>&1
set EXIT_CODE=%ERRORLEVEL%

echo [%DATE% %TIME%] Server exited with code %EXIT_CODE% >> "%LOGFILE%"
echo.
echo  [!] Server stopped (exit code %EXIT_CODE%). Restarting in 5 seconds...
echo  [!] Press Ctrl+C to cancel restart.
timeout /t 5 /nobreak >nul
goto START

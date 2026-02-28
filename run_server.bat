@echo off
title CodeRefine Server
color 0A
echo.
echo  ============================================
echo   CodeRefine - AI Code Review Engine
echo   Starting server on http://localhost:8080
echo  ============================================
echo.

cd /d "%~dp0"

:START
"C:/Users/valli sai supriya/AppData/Local/Programs/Python/Python314/python.exe" main.py
echo.
echo  [!] Server stopped. Restarting in 3 seconds...
timeout /t 3 /nobreak >nul
goto START

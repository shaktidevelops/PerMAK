@echo off
title PerMAK — Personal & Home Accounting System (Windows Desktop Engine)
cd /d "%~dp0"

:: Check if PHP server is already running on port 8085
netstat -ano | findstr ":8085" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting PerMAK Local PHP Accounting Engine on port 8085...
    start /b "" "C:\php\php.exe" -S 127.0.0.1:8085
    timeout /t 1 /nobreak >nul
)

:: Launch PerMAK in Native Standalone Windows Application Mode (Frameless App Window)
where msedge >nul 2>&1
if %errorlevel% equ 0 (
    start "" msedge --app="http://127.0.0.1:8085/index.php" --window-size=1440,900
    exit /b
)

where chrome >nul 2>&1
if %errorlevel% equ 0 (
    start "" chrome --app="http://127.0.0.1:8085/index.php" --window-size=1440,900
    exit /b
)

start "" "http://127.0.0.1:8085/index.php"

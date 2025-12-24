@echo off
title Outreach Service - DEV

echo Starting desktop-server + desktop-ui (dev)...
echo.

where pnpm >nul 2>&1
if errorlevel 1 (
  echo ERROR: pnpm not found. Install pnpm first.
  pause
  exit /b 1
)

REM Start server in a new window
start "desktop-server" cmd /k "cd apps\desktop-server && pnpm dev"

REM Start UI in a new window
start "desktop-ui" cmd /k "cd apps\desktop-ui && pnpm dev"

echo.
echo Started.
pause

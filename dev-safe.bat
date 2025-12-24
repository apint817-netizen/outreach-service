@echo off
title Outreach Service - DEV (SAFE)

echo Killing processes on ports 3001 and 5173 (if any)...
for %%P in (3001 5173) do (
  for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%P ^| findstr LISTENING') do (
    echo Killing PID %%a on port %%P
    taskkill /PID %%a /F >nul 2>&1
  )
)

echo.
echo Starting desktop-server + desktop-ui (dev)...
echo.

where pnpm >nul 2>&1
if errorlevel 1 (
  echo ERROR: pnpm not found. Install pnpm first.
  pause
  exit /b 1
)

start "desktop-server" cmd /k "cd apps\desktop-server && pnpm dev"
start "desktop-ui" cmd /k "cd apps\desktop-ui && pnpm dev"

echo.
echo Started.
pause

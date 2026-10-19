@echo off
echo ========================================================
echo   Telesom Academy Examination System - Starting Dev
echo ========================================================
echo.
echo 1. Starting Backend API server on http://localhost:5000 ...
start "Telesom Backend (Port 5000)" cmd /k "cd backend && npm run dev"

echo 2. Starting Frontend React (Vite) on http://localhost:3000 ...
start "Telesom Frontend (Port 3000)" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are launching in separate windows!
echo Backend:  http://localhost:5000/api
echo Frontend: http://localhost:3000
echo.
pause

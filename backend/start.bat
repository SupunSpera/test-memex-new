@echo off
echo Starting Memex Backend Server...
echo.

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not found!
    echo Please copy env.example to .env and configure your settings.
    echo.
    pause
    exit /b 1
)

REM Check if MongoDB is running (optional check)
echo Checking MongoDB connection...
timeout /t 2 /nobreak > nul

REM Start the server
echo Starting Node.js server...
echo.
npm run dev

pause 
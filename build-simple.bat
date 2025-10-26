@echo off
echo Building Next.js application...
cd beyon79
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Failed to build Next.js app
    pause
    exit /b 1
)
cd ..

echo Building Electron application...
set NODE_ENV=production
call npx electron-builder --win --x64 --publish=never

if %ERRORLEVEL% EQU 0 (
    echo Build completed successfully!
    echo.
    echo Installer location: dist\Beyon Admin Setup *.exe
    echo.
    dir /b dist\*.exe
) else (
    echo Build failed with error %ERRORLEVEL%
)

pause

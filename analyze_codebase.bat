@echo off
REM ============================================
REM RMS Codebase Analysis Script (Windows)
REM ============================================

set OUTPUT_FILE=codebase_analysis_report.txt

echo Starting Codebase Analysis...
echo ================================= > %OUTPUT_FILE%
echo RMS CODEBASE ANALYSIS REPORT >> %OUTPUT_FILE%
echo Generated: %date% %time% >> %OUTPUT_FILE%
echo ================================= >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

REM ============================================
REM 1. PROJECT STRUCTURE
REM ============================================
echo Analyzing project structure...
echo PROJECT STRUCTURE >> %OUTPUT_FILE%
echo ================================= >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
tree /F /A >> %OUTPUT_FILE% 2>nul
echo. >> %OUTPUT_FILE%

REM ============================================
REM 2. PACKAGE.JSON
REM ============================================
echo Analyzing package.json...
echo PACKAGE.JSON >> %OUTPUT_FILE%
echo ================================= >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
if exist package.json (
    type package.json >> %OUTPUT_FILE%
) else (
    echo package.json NOT FOUND >> %OUTPUT_FILE%
)
echo. >> %OUTPUT_FILE%

REM ============================================
REM 3. CONFIGURATION FILES
REM ============================================
echo Checking configuration files...
echo CONFIGURATION FILES >> %OUTPUT_FILE%
echo ================================= >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

if exist next.config.js (
    echo === NEXT.CONFIG.JS === >> %OUTPUT_FILE%
    type next.config.js >> %OUTPUT_FILE%
    echo. >> %OUTPUT_FILE%
)

if exist next.config.mjs (
    echo === NEXT.CONFIG.MJS === >> %OUTPUT_FILE%
    type next.config.mjs >> %OUTPUT_FILE%
    echo. >> %OUTPUT_FILE%
)

if exist tailwind.config.js (
    echo === TAILWIND.CONFIG.JS === >> %OUTPUT_FILE%
    type tailwind.config.js >> %OUTPUT_FILE%
    echo. >> %OUTPUT_FILE%
)

if exist tsconfig.json (
    echo === TSCONFIG.JSON === >> %OUTPUT_FILE%
    type tsconfig.json >> %OUTPUT_FILE%
    echo. >> %OUTPUT_FILE%
)

REM ============================================
REM 4. LIST KEY DIRECTORIES
REM ============================================
echo Listing key directories...
echo KEY DIRECTORIES >> %OUTPUT_FILE%
echo ================================= >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

if exist pages (
    echo === PAGES DIRECTORY === >> %OUTPUT_FILE%
    dir /B /S pages\*.js pages\*.jsx pages\*.ts pages\*.tsx 2>nul >> %OUTPUT_FILE%
    echo. >> %OUTPUT_FILE%
)

if exist app (
    echo === APP DIRECTORY === >> %OUTPUT_FILE%
    dir /B /S app\*.js app\*.jsx app\*.ts app\*.tsx 2>nul >> %OUTPUT_FILE%
    echo. >> %OUTPUT_FILE%
)

if exist components (
    echo === COMPONENTS DIRECTORY === >> %OUTPUT_FILE%
    dir /B /S components\*.js components\*.jsx components\*.ts components\*.tsx 2>nul >> %OUTPUT_FILE%
    echo. >> %OUTPUT_FILE%
)

REM ============================================
REM COMPLETION
REM ============================================
echo. >> %OUTPUT_FILE%
echo ================================= >> %OUTPUT_FILE%
echo ANALYSIS COMPLETE >> %OUTPUT_FILE%
echo ================================= >> %OUTPUT_FILE%

echo.
echo Analysis complete!
echo Report saved to: %OUTPUT_FILE%
echo.
echo Next steps:
echo 1. Open %OUTPUT_FILE% to review
echo 2. Share it with your mentor for analysis
echo 3. Answer follow-up questions
echo.
pause

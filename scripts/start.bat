@echo off
rem Start Squailor (runs the `start` npm script)
setlocal
rem Ensure we're running from the project root (scripts is inside project root)
pushd "%~dp0\.."
echo Starting Squailor (npm run start)...
npm run start
set "EXITCODE=%ERRORLEVEL%"
popd
endlocal & exit /b %EXITCODE%

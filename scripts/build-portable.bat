@echo off
rem Build Squailor portable artifact (runs the `build:portable` npm script)
setlocal
pushd "%~dp0\.."
echo Running portable build (npm run build:portable)...
npm run build:portable
set "EXITCODE=%ERRORLEVEL%"
popd
endlocal & exit /b %EXITCODE%

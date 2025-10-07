@echo off
rem Build Squailor (runs the `build` npm script)
setlocal
pushd "%~dp0\.."
echo Running full build (npm run build)...
npm run build
set "EXITCODE=%ERRORLEVEL%"
popd
endlocal & exit /b %EXITCODE%

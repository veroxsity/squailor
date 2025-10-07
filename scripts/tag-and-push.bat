@echo off
if "%~1"=="" (
  echo Usage: tag-and-push.bat 1.2.3
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tag-and-push.ps1" %1
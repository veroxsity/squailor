@echo off
if "%~1"=="" (
  echo Usage: delete-tag.bat v1.0.4
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0delete-tag.ps1" %1
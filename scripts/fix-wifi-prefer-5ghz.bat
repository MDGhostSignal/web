@echo off
setlocal
title GhostSignal Wi-Fi Prefer 5GHz
cd /d "%~dp0"

net session >nul 2>&1
if %errorLevel% NEQ 0 (
  echo.
  echo This needs Administrator permission.
  echo A UAC prompt should appear — click Yes.
  echo.
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo Elevated OK. Running fix...
echo Log will be written to:
echo   %~dp0wifi-fix-last-run.log
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix-wifi-prefer-5ghz.ps1"
set ERR=%ERRORLEVEL%

echo.
echo ----- LOG -----
if exist "%~dp0wifi-fix-last-run.log" (
  type "%~dp0wifi-fix-last-run.log"
) else (
  echo No log file was created.
)
echo ---------------
echo.
if %ERR% NEQ 0 (
  echo Finished with error code %ERR%.
) else (
  echo Finished.
)
echo.
pause
exit /b %ERR%

@echo off
rem Offline replay launcher (portless edition).
rem ASCII only + CRLF required: cmd.exe parses .bat as ANSI, LF endings break parsing.
rem Usage: open.bat [site]   (site = folder under workspace, default: bishuxiezuo)
rem Serves https://<site>.localhost via portless. One-time setup: npm install -g portless

setlocal
set SITE=%~1
if "%SITE%"=="" set SITE=bishuxiezuo
if not exist "%~dp0workspace\%SITE%\" (
    echo Site folder not found: workspace\%SITE%
    exit /b 1
)

rem Find the archive folder that contains serve.mjs under workspace\site
set ARCHIVE=
for /d %%D in ("%~dp0workspace\%SITE%\*") do if exist "%%D\serve.mjs" set ARCHIVE=%%D
if "%ARCHIVE%"=="" (
    echo No serve.mjs found in workspace\%SITE% subfolders - nothing to serve.
    exit /b 1
)

pushd "%ARCHIVE%"
portless list 2>nul | findstr /c:"%SITE%" >nul
if errorlevel 1 (
    echo Starting https://%SITE%.localhost via portless...
    start "portless-%SITE%" /min cmd /c "portless %SITE% node serve.mjs > ..\portless-serve.log 2>&1"
    ping -n 5 127.0.0.1 >nul
) else (
    echo Replay server already running.
)
popd

start "" "https://%SITE%.localhost/"
echo Opened https://%SITE%.localhost/
endlocal

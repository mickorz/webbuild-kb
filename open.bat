@echo off
rem bishuxiezuo offline replay launcher.
rem ASCII only + CRLF required: cmd.exe parses .bat as ANSI, LF endings break parsing.
rem start serve.mjs if port 8787 is free, then open the replay page in the default browser.

pushd "%~dp0workspace\bishuxiezuo\archive-bishu"

netstat -ano | findstr ":8787 " | findstr "LISTENING" >nul
if errorlevel 1 (
    echo Starting UIForge replay server...
    start "uiforge-replay" /min cmd /c "node serve.mjs > ..\serve.log 2>&1"
    ping -n 3 127.0.0.1 >nul
) else (
    echo Replay server already running.
)
popd

start "" "http://localhost:8787/console/console.html"
echo Opened http://localhost:8787/console/console.html

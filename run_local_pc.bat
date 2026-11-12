@echo off
chcp 65001 > nul
echo ==========================================
echo    EatGym - Chay Local tren PC Windows
echo ==========================================

REM Them duong dan Node.js va thu muc hien tai vao PATH
set "PATH=%~dp0;C:\Program Files\nodejs;%PATH%"

REM Thiet lap san authtoken cho ngrok neu co ngrok.exe
if exist "%~dp0ngrok.exe" (
    "%~dp0ngrok.exe" config add-authtoken 3KTagn069OqtZ0BMJzDkct9Cfpe_4WrpDoTAEeJRBJwuq5He4 >nul 2>&1
)

start "EatGym Ngrok" cmd /k "cd /d "%~dp0" && "%~dp0ngrok.exe" http 3000 --domain=kindly-absolve-concur.ngrok-free.dev"
timeout /t 2 > nul
start "EatGym API Server" cmd /k "cd /d "%~dp0" && set "PATH=C:\Program Files\nodejs;%PATH%" && node src/server.js"
echo Backend va Ngrok da duoc khoi dong trong 2 cua so rieng!

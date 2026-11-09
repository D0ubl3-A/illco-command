@echo off
setlocal
title ReelWorld GO - One Click Play
echo Launching ReelWorld GO in your default browser...
start "" "https://reelworld.illcoai.tech/play"
if errorlevel 1 (
  echo Could not launch the browser automatically.
  echo Open this URL manually: https://reelworld.illcoai.tech/play
  pause
)
endlocal

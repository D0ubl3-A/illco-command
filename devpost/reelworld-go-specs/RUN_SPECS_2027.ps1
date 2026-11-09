# ReelWorld GO: SPECS 2027 development handoff
# This prepares the existing portable source for native Lens Studio integration.
# It is NOT a native .lsproj and does not claim to deploy to glasses.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
Write-Host "ReelWorld GO / SPECS 2027" -ForegroundColor Cyan
Write-Host "Project folder: $root"
$required = @("src/create-water-controller.ts","src/lake-geometry.ts","src/lens-scene-adapter.ts","RUN_SETUP.md","SPECS_2027_BUILD_HANDOFF.md")
$missing = @($required | Where-Object { -not (Test-Path (Join-Path $root $_)) })
if ($missing.Count -gt 0) {
  Write-Host "Missing required files: $($missing -join ', ')" -ForegroundColor Red
  Write-Host "Download the complete devpost/reelworld-go-specs directory from GitHub (not only this launcher)."
  Read-Host "Press Enter to close"
  exit 1
}
$guide = Join-Path $root "SPECS_2027_BUILD_HANDOFF.md"
try { Set-Clipboard -Value (Get-Content $guide -Raw); Write-Host "Build handoff copied to clipboard." }
catch { Write-Host "Clipboard unavailable; open SPECS_2027_BUILD_HANDOFF.md manually." }
$node = Get-Command node -ErrorAction SilentlyContinue
$npx = Get-Command npx -ErrorAction SilentlyContinue
if ($node -and $npx) {
  Write-Host "Node detected: $(& node --version)"
  $tests = @(Get-ChildItem -Path (Join-Path $root "src") -Filter "*.test.ts" -ErrorAction SilentlyContinue)
  if ($tests.Count -gt 0) {
    $answer = Read-Host "Run portable TypeScript tests (may download tsx)? [y/N]"
    if ($answer -eq "y") {
      & npx --yes tsx --test ($tests | ForEach-Object { $_.FullName })
      if ($LASTEXITCODE -ne 0) { Write-Warning "Portable tests failed. Fix before integration." }
    }
  }
}
$paths = @(
  "$env:LOCALAPPDATA\\Programs\\Lens Studio\\Lens Studio.exe",
  "$env:ProgramFiles\\Lens Studio\\Lens Studio.exe",
  "${env:ProgramFiles(x86)}\\Lens Studio\\Lens Studio.exe"
)
$editor = $paths | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($editor) {
  Write-Host "Opening Lens Studio..."
  Start-Process -FilePath $editor
} else {
  Write-Host "Lens Studio not found at common locations. Opening official download page."
  Start-Process "https://ar.snap.com/download"
}
Start-Process $guide
Write-Host "NEXT: Sign into your SPECS account in Lens Studio, create a native SPECS 27 project, paste the build handoff into your supported CLAD/agent workflow, verify Preview, then deploy using Lens Studio's authenticated device workflow."
Write-Host "No automatic device deployment is claimed."
Read-Host "Press Enter to close"

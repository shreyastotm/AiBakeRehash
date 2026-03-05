# dev-start.ps1 — Reliable dev server startup for AiBakeRehash
# Kills any existing Node processes holding port 3000 or 5173, then starts both servers.

Write-Host "🔪 Stopping any existing node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Verify port 3000 is free
$port3000 = netstat -ano | Select-String ":3000 " | Select-String "LISTENING"
if ($port3000) {
    Write-Host "⚠️  Port 3000 still in use — force killing by PID..." -ForegroundColor Red
    $pid3000 = ($port3000 -split '\s+')[-1]
    Stop-Process -Id $pid3000 -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

Write-Host "✅ Ports clear. Starting servers..." -ForegroundColor Green

# Start backend in a new terminal window
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; `$env:NODE_ENV='development'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start frontend in a new terminal window
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "🚀 Servers starting:" -ForegroundColor Cyan
Write-Host "   Backend  → http://localhost:3000" -ForegroundColor White
Write-Host "   Frontend → http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Run this script (.\dev-start.ps1) any time you see EADDRINUSE errors." -ForegroundColor DarkGray

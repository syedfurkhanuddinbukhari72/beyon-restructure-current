# Clean up previous builds
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}

# Build Next.js app
Write-Host "Building Next.js application..." -ForegroundColor Cyan
cd .\beyon79
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build Next.js app" -ForegroundColor Red
    exit 1
}
cd ..

# Install electron-builder if not installed
if (-not (Get-Command electron-builder -ErrorAction SilentlyContinue)) {
    npm install -g electron-builder
}

# Build Electron app
Write-Host "Building Electron application..." -ForegroundColor Cyan
$env:NODE_ENV = "production"
electron-builder --win --x64 --publish=never

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build Electron app" -ForegroundColor Red
    exit 1
}

Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host "Installer location: $((Get-Item "dist\Beyon Admin Setup *.exe").FullName)" -ForegroundColor Green

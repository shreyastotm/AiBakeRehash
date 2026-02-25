# AiBake Development Environment Setup Script (PowerShell)
# This script automates the setup of the development environment on Windows

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check Node.js version
    try {
        $nodeVersion = node --version
        $nodeMajorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        
        if ($nodeMajorVersion -lt 18) {
            Write-Error "Node.js version 18+ is required. Current version: $nodeVersion"
            exit 1
        }
        Write-Success "Node.js $nodeVersion detected"
    }
    catch {
        Write-Error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-Success "npm $npmVersion detected"
    }
    catch {
        Write-Error "npm is not installed"
        exit 1
    }
    
    # Check Docker
    try {
        $dockerVersion = docker --version
        Write-Success "Docker detected: $dockerVersion"
    }
    catch {
        Write-Error "Docker is not installed. Please install Docker Desktop from https://www.docker.com/"
        exit 1
    }
    
    # Check Docker Compose
    try {
        docker-compose --version | Out-Null
        Write-Success "Docker Compose detected"
    }
    catch {
        try {
            docker compose version | Out-Null
            Write-Success "Docker Compose detected"
        }
        catch {
            Write-Error "Docker Compose is not installed"
            exit 1
        }
    }
    
    # Check if Docker daemon is running
    try {
        docker info | Out-Null
        Write-Success "Docker daemon is running"
    }
    catch {
        Write-Error "Docker daemon is not running. Please start Docker Desktop"
        exit 1
    }
}

# Setup environment file
function Initialize-EnvFile {
    Write-Info "Setting up environment file..."
    
    if (Test-Path .env) {
        Write-Warning ".env file already exists"
        $response = Read-Host "Do you want to overwrite it? (y/N)"
        if ($response -ne 'y' -and $response -ne 'Y') {
            Write-Info "Skipping .env file creation"
            return
        }
    }
    
    Copy-Item .env.example .env
    
    # Generate random JWT secrets
    $jwtSecret = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    $jwtRefreshSecret = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    
    # Update .env file with generated secrets
    $envContent = Get-Content .env
    $envContent = $envContent -replace 'JWT_SECRET=.*', "JWT_SECRET=$jwtSecret"
    $envContent = $envContent -replace 'JWT_REFRESH_SECRET=.*', "JWT_REFRESH_SECRET=$jwtRefreshSecret"
    $envContent | Set-Content .env
    
    Write-Success ".env file created with generated JWT secrets"
}

# Create necessary directories
function New-ProjectDirectories {
    Write-Info "Creating project directories..."
    
    $directories = @(
        "database/migrations",
        "database/functions",
        "database/triggers",
        "database/rollback",
        "backend/src",
        "backend/tests",
        "frontend/src",
        "frontend/public",
        "middleware/src",
        "middleware/tests",
        "scripts",
        "docs/api",
        "docs/architecture",
        "docs/user-guide/en",
        "docs/user-guide/hi"
    )
    
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
    
    Write-Success "Project directories created"
}

# Install dependencies
function Install-Dependencies {
    Write-Info "Installing dependencies..."
    
    # Backend dependencies
    if (Test-Path backend/package.json) {
        Write-Info "Installing backend dependencies..."
        Push-Location backend
        npm install
        Pop-Location
        Write-Success "Backend dependencies installed"
    }
    else {
        Write-Warning "backend/package.json not found, skipping backend dependencies"
    }
    
    # Frontend dependencies
    if (Test-Path frontend/package.json) {
        Write-Info "Installing frontend dependencies..."
        Push-Location frontend
        npm install
        Pop-Location
        Write-Success "Frontend dependencies installed"
    }
    else {
        Write-Warning "frontend/package.json not found, skipping frontend dependencies"
    }
    
    # Middleware dependencies
    if (Test-Path middleware/package.json) {
        Write-Info "Installing middleware dependencies..."
        Push-Location middleware
        npm install
        Pop-Location
        Write-Success "Middleware dependencies installed"
    }
    else {
        Write-Warning "middleware/package.json not found, skipping middleware dependencies"
    }
}

# Start Docker services
function Start-DockerServices {
    Write-Info "Starting Docker services..."
    
    # Pull images
    docker-compose pull
    
    # Start services
    docker-compose up -d postgres redis
    
    # Wait for services to be healthy
    Write-Info "Waiting for services to be ready..."
    Start-Sleep -Seconds 5
    
    # Check PostgreSQL
    try {
        docker-compose exec -T postgres pg_isready -U aibake_user -d aibake_db | Out-Null
        Write-Success "PostgreSQL is ready"
    }
    catch {
        Write-Error "PostgreSQL failed to start"
        exit 1
    }
    
    # Check Redis
    try {
        docker-compose exec -T redis redis-cli ping | Out-Null
        Write-Success "Redis is ready"
    }
    catch {
        Write-Error "Redis failed to start"
        exit 1
    }
}

# Run database migrations
function Invoke-Migrations {
    Write-Info "Running database migrations..."
    
    if ((Test-Path scripts/migrate.ts) -or (Test-Path scripts/migrate.js)) {
        npm run migrate
        Write-Success "Database migrations completed"
    }
    else {
        Write-Warning "Migration script not found, skipping migrations"
    }
}

# Display completion message
function Show-Completion {
    Write-Host ""
    Write-Success "=========================================="
    Write-Success "  AiBake Development Environment Ready!"
    Write-Success "=========================================="
    Write-Host ""
    Write-Info "Services running:"
    Write-Host "  - PostgreSQL: localhost:5432"
    Write-Host "  - Redis: localhost:6379"
    Write-Host ""
    Write-Info "Next steps:"
    Write-Host "  1. Start backend: cd backend; npm run dev"
    Write-Host "  2. Start frontend: cd frontend; npm run dev"
    Write-Host "  3. Access application: http://localhost:5173"
    Write-Host ""
    Write-Info "Useful commands:"
    Write-Host "  - View logs: docker-compose logs -f"
    Write-Host "  - Stop services: docker-compose down"
    Write-Host "  - Restart services: docker-compose restart"
    Write-Host "  - Run migrations: npm run migrate"
    Write-Host ""
    Write-Info "Optional tools:"
    Write-Host "  - pgAdmin: docker-compose --profile tools up -d pgadmin"
    Write-Host "    Access at: http://localhost:5050 (admin@aibake.local / admin)"
    Write-Host ""
}

# Main execution
function Main {
    Write-Host ""
    Write-Info "=========================================="
    Write-Info "  AiBake Development Environment Setup"
    Write-Info "=========================================="
    Write-Host ""
    
    Test-Prerequisites
    Initialize-EnvFile
    New-ProjectDirectories
    Install-Dependencies
    Start-DockerServices
    
    # Optionally run migrations if available
    if (Test-Path database/migrations/01_schema_init.sql) {
        $response = Read-Host "Do you want to run database migrations now? (Y/n)"
        if ($response -ne 'n' -and $response -ne 'N') {
            Invoke-Migrations
        }
    }
    
    Show-Completion
}

# Run main function
Main

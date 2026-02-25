#!/bin/bash

# AiBake Development Environment Setup Script
# This script automates the setup of the development environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    print_success "Node.js $(node -v) detected"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm $(npm -v) detected"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker from https://www.docker.com/"
        exit 1
    fi
    print_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') detected"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose detected"
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker"
        exit 1
    fi
    print_success "Docker daemon is running"
}

# Setup environment file
setup_env_file() {
    print_info "Setting up environment file..."
    
    if [ -f .env ]; then
        print_warning ".env file already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Skipping .env file creation"
            return
        fi
    fi
    
    cp .env.example .env
    
    # Generate random JWT secrets
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    
    # Update .env file with generated secrets
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
        sed -i '' "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" .env
    else
        # Linux
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
        sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" .env
    fi
    
    print_success ".env file created with generated JWT secrets"
}

# Create necessary directories
create_directories() {
    print_info "Creating project directories..."
    
    mkdir -p database/migrations
    mkdir -p database/functions
    mkdir -p database/triggers
    mkdir -p database/rollback
    mkdir -p backend/src
    mkdir -p backend/tests
    mkdir -p frontend/src
    mkdir -p frontend/public
    mkdir -p middleware/src
    mkdir -p middleware/tests
    mkdir -p scripts
    mkdir -p docs/api
    mkdir -p docs/architecture
    mkdir -p docs/user-guide/en
    mkdir -p docs/user-guide/hi
    
    print_success "Project directories created"
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    
    # Backend dependencies
    if [ -f backend/package.json ]; then
        print_info "Installing backend dependencies..."
        cd backend
        npm install
        cd ..
        print_success "Backend dependencies installed"
    else
        print_warning "backend/package.json not found, skipping backend dependencies"
    fi
    
    # Frontend dependencies
    if [ -f frontend/package.json ]; then
        print_info "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
        print_success "Frontend dependencies installed"
    else
        print_warning "frontend/package.json not found, skipping frontend dependencies"
    fi
    
    # Middleware dependencies
    if [ -f middleware/package.json ]; then
        print_info "Installing middleware dependencies..."
        cd middleware
        npm install
        cd ..
        print_success "Middleware dependencies installed"
    else
        print_warning "middleware/package.json not found, skipping middleware dependencies"
    fi
}

# Start Docker services
start_docker_services() {
    print_info "Starting Docker services..."
    
    # Pull images
    docker-compose pull
    
    # Start services
    docker-compose up -d postgres redis
    
    # Wait for services to be healthy
    print_info "Waiting for services to be ready..."
    sleep 5
    
    # Check PostgreSQL
    if docker-compose exec -T postgres pg_isready -U aibake_user -d aibake_db &> /dev/null; then
        print_success "PostgreSQL is ready"
    else
        print_error "PostgreSQL failed to start"
        exit 1
    fi
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping &> /dev/null; then
        print_success "Redis is ready"
    else
        print_error "Redis failed to start"
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations..."
    
    if [ -f scripts/migrate.ts ] || [ -f scripts/migrate.js ]; then
        npm run migrate
        print_success "Database migrations completed"
    else
        print_warning "Migration script not found, skipping migrations"
    fi
}

# Display completion message
display_completion() {
    echo ""
    print_success "=========================================="
    print_success "  AiBake Development Environment Ready!"
    print_success "=========================================="
    echo ""
    print_info "Services running:"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Redis: localhost:6379"
    echo ""
    print_info "Next steps:"
    echo "  1. Start backend: cd backend && npm run dev"
    echo "  2. Start frontend: cd frontend && npm run dev"
    echo "  3. Access application: http://localhost:5173"
    echo ""
    print_info "Useful commands:"
    echo "  - View logs: docker-compose logs -f"
    echo "  - Stop services: docker-compose down"
    echo "  - Restart services: docker-compose restart"
    echo "  - Run migrations: npm run migrate"
    echo ""
    print_info "Optional tools:"
    echo "  - pgAdmin: docker-compose --profile tools up -d pgadmin"
    echo "    Access at: http://localhost:5050 (admin@aibake.local / admin)"
    echo ""
}

# Main execution
main() {
    echo ""
    print_info "=========================================="
    print_info "  AiBake Development Environment Setup"
    print_info "=========================================="
    echo ""
    
    check_prerequisites
    setup_env_file
    create_directories
    install_dependencies
    start_docker_services
    
    # Optionally run migrations if available
    if [ -f database/migrations/01_schema_init.sql ]; then
        read -p "Do you want to run database migrations now? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            run_migrations
        fi
    fi
    
    display_completion
}

# Run main function
main

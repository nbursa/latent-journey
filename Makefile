.PHONY: dev build clean install

# Development mode - run all services
dev:
	@echo "Stopping any existing services..."
	@pkill -f "go run main.go" || true
	@pkill -f "python app.py" || true
	@pkill -f "cargo run" || true
	@pkill -f "vite" || true
	@pkill -f "gateway" || true
	@pkill -f "sentience-rs" || true
	@pkill -f "ml-py" || true
	@echo "Killing processes on ports..."
	@lsof -ti:8080 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8081 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8082 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	@sleep 3
	@echo "Starting all services..."
	@echo "Gateway: http://localhost:8080"
	@echo "ML Service: http://localhost:8081"
	@echo "Sentience Service: http://localhost:8082"
	@echo "UI: http://localhost:5173"
	@echo ""
	@echo "Press Ctrl+C to stop all services"
	@echo ""
	@trap 'echo "Stopping all services..."; pkill -f "go run main.go"; pkill -f "python app.py"; pkill -f "cargo run"; pkill -f "vite"; pkill -f "gateway"; pkill -f "sentience-rs"; pkill -f "ml-py"; echo "Killing processes on ports..."; lsof -ti:8080 | xargs kill -9 2>/dev/null || true; lsof -ti:8081 | xargs kill -9 2>/dev/null || true; lsof -ti:8082 | xargs kill -9 2>/dev/null || true; lsof -ti:5173 | xargs kill -9 2>/dev/null || true; exit 0' INT; \
	cd cmd/gateway && go run main.go & \
	cd services/ml-py && python app.py & \
	cd services/sentience-rs && cargo run & \
	cd ui && npm run dev & \
	wait

# Build all services
build:
	@echo "Building Gateway..."
	@cd cmd/gateway && go build -o ../../bin/gateway main.go
	@echo "Building Sentience service..."
	@cd services/sentience-rs && cargo build --release
	@echo "Building UI..."
	@cd ui && npm run build

# Install dependencies
install:
	@echo "Installing Go dependencies..."
	@cd cmd/gateway && go mod tidy
	@echo "Installing Python dependencies..."
	@cd services/ml-py && pip install -r requirements.txt
	@echo "Installing Rust dependencies..."
	@cd services/sentience-rs && cargo build
	@echo "Installing Node.js dependencies..."
	@cd ui && npm install

# Reinstall Python dependencies (for new packages)
install-python:
	@echo "Reinstalling Python dependencies..."
	@cd services/ml-py && pip install -r requirements.txt

# Stop all services
stop:
	@echo "Stopping all services..."
	@pkill -f "go run main.go" || true
	@pkill -f "python app.py" || true
	@pkill -f "cargo run" || true
	@pkill -f "vite" || true
	@pkill -f "gateway" || true
	@pkill -f "sentience-rs" || true
	@pkill -f "ml-py" || true
	@echo "Killing processes on ports..."
	@lsof -ti:8080 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8081 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8082 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	@echo "All services stopped"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf bin/
	@cd services/sentience-rs && cargo clean
	@cd ui && rm -rf dist/ node_modules/

# Test all services
test:
	@echo "Testing Gateway..."
	@curl -s http://localhost:8080/ping || echo "Gateway not running"
	@echo "Testing ML Service..."
	@curl -s http://localhost:8081/ping || echo "ML Service not running"
	@echo "Testing Sentience Service..."
	@curl -s http://localhost:8082/ping || echo "Sentience Service not running"

# Help
help:
	@echo "Available commands:"
	@echo "  dev     - Start all services in development mode"
	@echo "  stop    - Stop all running services"
	@echo "  build   - Build all services"
	@echo "  install - Install all dependencies"
	@echo "  clean   - Clean build artifacts"
	@echo "  test    - Test all services (requires them to be running)"
	@echo "  help    - Show this help message"

.PHONY: dev build clean install

# Development mode - run all services
dev:
	@echo "Starting all services..."
	@echo "Gateway: http://localhost:8080"
	@echo "ML Service: http://localhost:8081"
	@echo "Sentience Service: http://localhost:8082"
	@echo "UI: http://localhost:5173"
	@echo ""
	@echo "Press Ctrl+C to stop all services"
	@echo ""
	@trap 'kill %1 %2 %3 %4' INT; \
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
	@echo "  build   - Build all services"
	@echo "  install - Install all dependencies"
	@echo "  clean   - Clean build artifacts"
	@echo "  test    - Test all services (requires them to be running)"
	@echo "  help    - Show this help message"

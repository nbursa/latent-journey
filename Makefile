.PHONY: dev build clean install

# Check if port is available
check-port:
	@if lsof -ti:$(PORT) >/dev/null 2>&1; then \
		echo "Port $(PORT) is already in use. Stopping existing process..."; \
		lsof -ti:$(PORT) | xargs kill -9 2>/dev/null || true; \
		sleep 1; \
	fi

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
	@pkill -f "llm-py" || true
	@pkill -f "ego-rs" || true
	@echo "Killing processes on ports..."
	@lsof -ti:8080 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8081 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8082 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8083 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8084 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	@echo "Waiting for cleanup..."
	@sleep 5
	@echo "Cleaning up any remaining processes..."
	@pkill -9 -f "go run main.go" || true
	@pkill -9 -f "python app.py" || true
	@pkill -9 -f "cargo run" || true
	@pkill -9 -f "vite" || true
	@pkill -9 -f "gateway" || true
	@pkill -9 -f "sentience-rs" || true
	@pkill -9 -f "ml-py" || true
	@pkill -9 -f "llm-py" || true
	@sleep 2
	@echo "Starting all services..."
	@echo "Gateway: http://localhost:8080"
	@echo "ML Service: http://localhost:8081"
	@echo "Sentience Service: http://localhost:8082"
	@echo "LLM Service: http://localhost:8083"
	@echo "Ego Service: http://localhost:8084"
	@echo "UI: http://localhost:5173"
	@echo ""
	@echo "⚠️  EXTERNAL DEPENDENCIES REQUIRED:"
	@echo "   - Ollama: Run 'ollama serve' in a separate terminal"
	@echo "   - Model: Run 'ollama pull llama3.2:3b' to download the model"
	@echo "   - Or configure a different LLM provider in services/llm-py/app.py"
	@echo ""
	@echo "Press Ctrl+C to stop all services"
	@echo ""
	@trap 'echo "Stopping all services..."; pkill -f "go run main.go"; pkill -f "python app.py"; pkill -f "cargo run"; pkill -f "vite"; pkill -f "gateway"; pkill -f "sentience-rs"; pkill -f "ml-py"; pkill -f "llm-py"; pkill -f "ego-rs"; echo "Killing processes on ports..."; lsof -ti:8080 | xargs kill -9 2>/dev/null || true; lsof -ti:8081 | xargs kill -9 2>/dev/null || true; lsof -ti:8082 | xargs kill -9 2>/dev/null || true; lsof -ti:8083 | xargs kill -9 2>/dev/null || true; lsof -ti:8084 | xargs kill -9 2>/dev/null || true; lsof -ti:5173 | xargs kill -9 2>/dev/null || true; exit 0' INT; \
	echo "Starting Gateway service..."; \
	PORT=8080 $(MAKE) check-port; \
	cd cmd/gateway && go run main.go & \
	sleep 3; \
	echo "Starting Sentience service..."; \
	PORT=8082 $(MAKE) check-port; \
	cd services/sentience-rs && cargo run & \
	sleep 3; \
	echo "Starting ML service..."; \
	PORT=8081 $(MAKE) check-port; \
	cd services/ml-py && python app.py & \
	sleep 3; \
	echo "Starting LLM service..."; \
	PORT=8083 $(MAKE) check-port; \
	cd services/llm-py && python app.py & \
	sleep 3; \
	echo "Starting Ego service..."; \
	PORT=8084 $(MAKE) check-port; \
	cd services/ego-rs && cargo run & \
	sleep 3; \
	echo "Starting UI..."; \
	PORT=5173 $(MAKE) check-port; \
	cd ui && npm run dev & \
	wait

# Build all services
build:
	@echo "Building Gateway..."
	@cd cmd/gateway && go build -o ../../bin/gateway main.go
	@echo "Building Sentience service..."
	@cd services/sentience-rs && cargo build --release
	@echo "Building Ego service..."
	@cd services/ego-rs && cargo build --release
	@echo "Building UI..."
	@cd ui && npm run build

# Install dependencies
install:
	@echo "Installing Go dependencies..."
	@cd cmd/gateway && go mod tidy
	@echo "Installing Python dependencies..."
	@cd services/ml-py && pip install -r requirements.txt
	@cd services/llm-py && pip install -r requirements.txt
	@echo "Installing Rust dependencies..."
	@cd services/sentience-rs && cargo build
	@cd services/ego-rs && cargo build
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
	@pkill -f "llm-py" || true
	@pkill -f "ego-rs" || true
	@echo "Killing processes on ports..."
	@lsof -ti:8080 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8081 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8082 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8083 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8084 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	@echo "Force killing remaining processes..."
	@pkill -9 -f "go run main.go" || true
	@pkill -9 -f "python app.py" || true
	@pkill -9 -f "cargo run" || true
	@pkill -9 -f "vite" || true
	@pkill -9 -f "gateway" || true
	@pkill -9 -f "sentience-rs" || true
	@pkill -9 -f "ml-py" || true
	@pkill -9 -f "llm-py" || true
	@echo "All services stopped"

# Clean restart - stop everything and start fresh
restart: stop
	@echo "Starting fresh after cleanup..."
	@sleep 3
	@$(MAKE) dev

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
	@echo "Testing LLM Service..."
	@curl -s http://localhost:8083/health || echo "LLM Service not running"

# Help
help:
	@echo "Available commands:"
	@echo "  dev          - Start all services in development mode"
	@echo "  stop         - Stop all running services"
	@echo "  restart      - Clean stop and restart all services"
	@echo "  build        - Build all services"
	@echo "  install      - Install all dependencies"
	@echo "  clean        - Clean build artifacts"
	@echo "  test         - Test all services (requires them to be running)"
	@echo "  help         - Show this help message"

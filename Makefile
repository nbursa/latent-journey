.PHONY: dev build clean install

# Check if port is available
check-port:
	@if lsof -ti:$(PORT) >/dev/null 2>&1; then \
		echo "Port $(PORT) is already in use. Stopping existing process..."; \
		lsof -ti:$(PORT) | xargs kill -9 2>/dev/null || true; \
		sleep 1; \
	fi

# Wait for service to be ready
wait-for-service:
	@echo "Waiting for service on port $(PORT) to be ready..."; \
	for i in $$(seq 1 30); do \
		if curl -s http://localhost:$(PORT)/ping >/dev/null 2>&1 || curl -s http://localhost:$(PORT)/health >/dev/null 2>&1; then \
			echo "Service on port $(PORT) is ready!"; \
			break; \
		fi; \
		if [ $$i -eq 30 ]; then \
			echo "❌ Service on port $(PORT) failed to start after 30 seconds"; \
			exit 1; \
		fi; \
		echo "Attempt $$i/30..."; \
		sleep 1; \
	done

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
	@lsof -ti:8085 | xargs kill -9 2>/dev/null || true
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
	@echo "Embeddings Service: http://localhost:8085"
	@echo "UI: http://localhost:5173"
	@echo ""
	@echo "⚠️  EXTERNAL DEPENDENCIES REQUIRED:"
	@echo "   - Ollama: Run 'ollama serve' in a separate terminal"
	@echo "   - Model: Run 'ollama pull llama3.2:3b' to download the model"
	@echo "   - Or configure a different LLM provider in services/llm-py/app.py"
	@echo ""
	@echo "Press Ctrl+C to stop all services"
	@echo ""
	@trap 'echo "Stopping all services..."; pkill -f "go run main.go"; pkill -f "python app.py"; pkill -f "cargo run"; pkill -f "vite"; pkill -f "gateway"; pkill -f "sentience-rs"; pkill -f "ml-py"; pkill -f "llm-py"; pkill -f "ego-rs"; pkill -f "embeddings-rs"; echo "Killing processes on ports..."; lsof -ti:8080 | xargs kill -9 2>/dev/null || true; lsof -ti:8081 | xargs kill -9 2>/dev/null || true; lsof -ti:8082 | xargs kill -9 2>/dev/null || true; lsof -ti:8083 | xargs kill -9 2>/dev/null || true; lsof -ti:8084 | xargs kill -9 2>/dev/null || true; lsof -ti:8085 | xargs kill -9 2>/dev/null || true; lsof -ti:5173 | xargs kill -9 2>/dev/null || true; exit 0' INT; \
	echo "Starting services in optimized order..."; \
	echo ""; \
	echo "1.Starting Gateway (API Router)..."; \
	PORT=8080 $(MAKE) check-port; \
	cd cmd/gateway && go run main.go & \
	GATEWAY_PID=$$!; \
	PORT=8080 $(MAKE) wait-for-service; \
	echo ""; \
	echo "2.Starting Sentience (Memory + Agent)..."; \
	PORT=8082 $(MAKE) check-port; \
	cd services/sentience-rs && cargo run & \
	SENTIENCE_PID=$$!; \
	PORT=8082 $(MAKE) wait-for-service; \
	echo ""; \
	echo "3.Starting ML Service (Whisper + CLIP) and LLM Service (Ollama Interface) in parallel..."; \
	PORT=8081 $(MAKE) check-port; \
	cd services/ml-py && python app.py & \
	ML_PID=$$!; \
	PORT=8083 $(MAKE) check-port; \
	cd services/llm-py && python app.py & \
	LLM_PID=$$!; \
	echo "   Waiting for ML Service..."; \
	PORT=8081 $(MAKE) wait-for-service; \
	echo "   Waiting for LLM Service..."; \
	PORT=8083 $(MAKE) wait-for-service; \
	echo ""; \
	echo "4.Starting Ego Service (AI Reflection)..."; \
	PORT=8084 $(MAKE) check-port; \
	cd services/ego-rs && cargo run & \
	EGO_PID=$$!; \
	PORT=8084 $(MAKE) wait-for-service; \
	echo ""; \
	echo "5.Starting Embeddings Service (Real CLIP Embeddings)..."; \
	PORT=8085 $(MAKE) check-port; \
	cd services/embeddings-rs && cargo run & \
	EMBEDDINGS_PID=$$!; \
	PORT=8085 $(MAKE) wait-for-service; \
	echo ""; \
	echo "6.Starting UI (Frontend)..."; \
	PORT=5173 $(MAKE) check-port; \
	cd ui && npm run dev & \
	UI_PID=$$!; \
	sleep 3; \
	echo ""; \
	echo "All services started and verified!"; \
	echo "Services available at:"; \
	echo "   • UI: http://localhost:5173"; \
	echo "   • Gateway: http://localhost:8080"; \
	echo "   • ML: http://localhost:8081"; \
	echo "   • Sentience: http://localhost:8082"; \
	echo "   • LLM: http://localhost:8083"; \
	echo "   • Ego: http://localhost:8084"; \
	echo "   • Embeddings: http://localhost:8085"; \
	echo ""; \
	wait

# Quick start - minimal services for development
quick:
	@echo "Quick start - essential services only..."
	@echo "Starting Gateway + Sentience + Ego + UI..."
	@trap 'echo "Stopping services..."; pkill -f "go run main.go"; pkill -f "cargo run"; pkill -f "vite"; pkill -f "gateway"; pkill -f "sentience-rs"; pkill -f "ego-rs"; exit 0' INT; \
	echo "1.Gateway..."; \
	PORT=8080 $(MAKE) check-port; \
	cd cmd/gateway && go run main.go & \
	PORT=8080 $(MAKE) wait-for-service; \
	echo "2.Sentience..."; \
	PORT=8082 $(MAKE) check-port; \
	cd services/sentience-rs && cargo run & \
	PORT=8082 $(MAKE) wait-for-service; \
	echo "3.Ego..."; \
	PORT=8084 $(MAKE) check-port; \
	cd services/ego-rs && cargo run & \
	PORT=8084 $(MAKE) wait-for-service; \
	echo "4.UI..."; \
	PORT=5173 $(MAKE) check-port; \
	cd ui && npm run dev & \
	echo "Quick start complete! UI: http://localhost:5173"; \
	wait

# Fast start - no ML services (for UI development)
fast:
	@echo "Fast start - UI development mode..."
	@echo "Starting Gateway + Sentience + Ego + UI (no ML/LLM)..."
	@trap 'echo "Stopping services..."; pkill -f "go run main.go"; pkill -f "cargo run"; pkill -f "vite"; pkill -f "gateway"; pkill -f "sentience-rs"; pkill -f "ego-rs"; exit 0' INT; \
	echo "1.Gateway..."; \
	PORT=8080 $(MAKE) check-port; \
	cd cmd/gateway && go run main.go & \
	PORT=8080 $(MAKE) wait-for-service; \
	echo "2.Sentience..."; \
	PORT=8082 $(MAKE) check-port; \
	cd services/sentience-rs && cargo run & \
	PORT=8082 $(MAKE) wait-for-service; \
	echo "3.Ego..."; \
	PORT=8084 $(MAKE) check-port; \
	cd services/ego-rs && cargo run & \
	PORT=8084 $(MAKE) wait-for-service; \
	echo "4.UI..."; \
	PORT=5173 $(MAKE) check-port; \
	cd ui && npm run dev & \
	echo "Fast start complete! UI: http://localhost:5173"; \
	echo "Note: ML and LLM services not started - use 'make dev' for full functionality"; \
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
	@lsof -ti:8085 | xargs kill -9 2>/dev/null || true
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
	@echo "  dev          - Start all services with health checks (recommended)"
	@echo "  quick        - Start essential services only (Gateway + Sentience + Ego + UI)"
	@echo "  fast         - Start UI development mode (no ML/LLM services)"
	@echo "  stop         - Stop all running services"
	@echo "  restart      - Clean stop and restart all services"
	@echo "  build        - Build all services"
	@echo "  install      - Install all dependencies"
	@echo "  clean        - Clean build artifacts"
	@echo "  test         - Test all services (requires them to be running)"
	@echo "  help         - Show this help message"
	@echo ""
	@echo "Service startup order (dev):"
	@echo "  1. Gateway (API Router) - Port 8080"
	@echo "  2. Sentience (Memory + Agent) - Port 8082"
	@echo "  3. ML Service (Whisper + CLIP) + LLM Service (Ollama) - Ports 8081, 8083 (parallel)"
	@echo "  4. Ego Service (AI Reflection) - Port 8084"
	@echo "  5. Embeddings Service (Real CLIP Embeddings) - Port 8085"
	@echo "  6. UI (Frontend) - Port 5173"
	@echo ""
	@echo "Startup modes:"
	@echo "  dev    - Full functionality (all services, ~15-20 seconds)"
	@echo "  quick  - Essential services only (~8-10 seconds)"
	@echo "  fast   - UI development only (~5-8 seconds)"

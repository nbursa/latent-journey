.PHONY: dev build clean install

# Service and port definitions
SERVICES := go run main.go python app.py cargo run vite gateway id-rs ml-py llm-py refnet-py ego-rs embeddings-rs
PORTS := 8080 8081 8082 8084 8085 8086 5173

# Kill all services
kill-services:
	@for service in $(SERVICES); do pkill -f "$$service" || true; done

# Kill processes on ports
kill-ports:
	@for port in $(PORTS); do lsof -ti:$$port | xargs kill -9 2>/dev/null || true; done

# Force kill all services
force-kill-services:
	@for service in $(SERVICES); do pkill -9 -f "$$service" || true; done

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
	@$(MAKE) kill-services
	@echo "Killing processes on ports..."
	@$(MAKE) kill-ports
	@echo "Waiting for cleanup..."
	@sleep 5
	@echo "Cleaning up any remaining processes..."
	@$(MAKE) force-kill-services
	@sleep 2
	@echo "Starting all services..."
	@echo "Gateway: http://localhost:8080"
	@echo "ML Service: http://localhost:8081"
	@echo "ID Service: http://localhost:8082"
	@echo "RefNet Service: http://localhost:8084"
	@echo "Embeddings Service: http://localhost:8085"
	@echo "UI: http://localhost:5173"
	@echo ""
	@echo "ℹ️  USING REFNET INSTEAD OF LLM:"
	@echo "   - RefNet model trained on LJ data is already included"
	@echo "   - No external LLM dependencies required"
	@echo "   - Faster inference with deterministic outputs"
	@echo ""
	@echo "Press Ctrl+C to stop all services"
	@echo ""
	@trap 'echo "Stopping all services..."; $(MAKE) kill-services; echo "Killing processes on ports..."; $(MAKE) kill-ports; exit 0' INT; \
	echo "Starting services in optimized order..."; \
	echo ""; \
	echo "1.Starting Gateway (API Router)..."; \
	PORT=8080 $(MAKE) check-port; \
	cd cmd/gateway && go run main.go & \
	GATEWAY_PID=$$!; \
	PORT=8080 $(MAKE) wait-for-service; \
	echo ""; \
	echo "2.Starting ID (Memory + Agent)..."; \
	PORT=8082 $(MAKE) check-port; \
	cd services/id-rs && cargo run & \
	ID_PID=$$!; \
	PORT=8082 $(MAKE) wait-for-service; \
	echo ""; \
	echo "3.Starting ML Service (Whisper + CLIP)..."; \
	PORT=8081 $(MAKE) check-port; \
	cd services/ml-py && python app.py & \
	ML_PID=$$!; \
	echo "   Waiting for ML Service..."; \
	PORT=8081 $(MAKE) wait-for-service; \
	echo ""; \
	echo "4.Starting RefNet Service (AI Reflection)..."; \
	PORT=8084 $(MAKE) check-port; \
	cd services/refnet-py && python app.py & \
	REFNET_PID=$$!; \
	PORT=8084 $(MAKE) wait-for-service; \
	echo ""; \
	echo "5.Starting Ego Service (Memory Management)..."; \
	PORT=8086 $(MAKE) check-port; \
	cd services/ego-rs && cargo run & \
	EGO_PID=$$!; \
	PORT=8086 $(MAKE) wait-for-service; \
	echo ""; \
	echo "6.Starting Embeddings Service (Real CLIP Embeddings)..."; \
	PORT=8085 $(MAKE) check-port; \
	cd services/embeddings-rs && cargo run & \
	EMBEDDINGS_PID=$$!; \
	PORT=8085 $(MAKE) wait-for-service; \
	echo ""; \
	echo "7.Starting UI (Frontend)..."; \
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
	echo "   • ID: http://localhost:8082"; \
	echo "   • RefNet: http://localhost:8084"; \
	echo "   • Ego: http://localhost:8086"; \
	echo "   • Embeddings: http://localhost:8085"; \
	echo ""; \
	wait

# Quick start - minimal services for development
quick:
	@echo "Quick start - essential services only..."
	@echo "Starting Gateway + ID + Ego + UI..."
	@trap 'echo "Stopping services..."; $(MAKE) kill-services; exit 0' INT; \
	echo "1.Gateway..."; \
	PORT=8080 $(MAKE) check-port; \
	cd cmd/gateway && go run main.go & \
	PORT=8080 $(MAKE) wait-for-service; \
	echo "2.ID..."; \
	PORT=8082 $(MAKE) check-port; \
	cd services/id-rs && cargo run & \
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
	@echo "Starting Gateway + ID + Ego + UI (no ML/LLM)..."
	@trap 'echo "Stopping services..."; $(MAKE) kill-services; exit 0' INT; \
	echo "1.Gateway..."; \
	PORT=8080 $(MAKE) check-port; \
	cd cmd/gateway && go run main.go & \
	PORT=8080 $(MAKE) wait-for-service; \
	echo "2.ID..."; \
	PORT=8082 $(MAKE) check-port; \
	cd services/id-rs && cargo run & \
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
	@echo "Building ID service..."
	@cd services/id-rs && cargo build --release
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
	@cd services/refnet-py && pip install -r requirements.txt
	@echo "Installing Rust dependencies..."
	@cd services/id-rs && cargo build
	@cd services/ego-rs && cargo build
	@echo "Installing Node.js dependencies..."
	@cd ui && npm install

# Reinstall Python dependencies (for new packages)
install-python:
	@echo "Reinstalling Python dependencies..."
	@cd services/ml-py && pip install -r requirements.txt
	@cd services/refnet-py && pip install -r requirements.txt

# Stop all services
stop:
	@echo "Stopping all services..."
	@$(MAKE) kill-services
	@echo "Killing processes on ports..."
	@$(MAKE) kill-ports
	@echo "Force killing remaining processes..."
	@$(MAKE) force-kill-services
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
	@cd services/id-rs && cargo clean
	@cd ui && rm -rf dist/ node_modules/

# Test all services
test:
	@echo "Testing Gateway..."
	@curl -s http://localhost:8080/ping || echo "Gateway not running"
	@echo "Testing ML Service..."
	@curl -s http://localhost:8081/ping || echo "ML Service not running"
	@echo "Testing ID Service..."
	@curl -s http://localhost:8082/ping || echo "ID Service not running"
	@echo "Testing RefNet Service..."
	@curl -s http://localhost:8084/health || echo "RefNet Service not running"
	@echo "Testing Ego Service..."
	@curl -s http://localhost:8086/health || echo "Ego Service not running"

# Help
help:
	@echo "Available commands:"
	@echo "  dev          - Start all services with health checks (recommended)"
	@echo "  quick        - Start essential services only (Gateway + ID + Ego + UI)"
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
	@echo "  2. ID (Memory + Agent) - Port 8082"
	@echo "  3. ML Service (Whisper + CLIP) - Port 8081"
	@echo "  4. RefNet Service (AI Reflection) - Port 8084"
	@echo "  5. Ego Service (Memory Management) - Port 8086"
	@echo "  6. Embeddings Service (Real CLIP Embeddings) - Port 8085"
	@echo "  7. UI (Frontend) - Port 5173"
	@echo ""
	@echo "Startup modes:"
	@echo "  dev    - Full functionality (all services, ~15-20 seconds)"
	@echo "  quick  - Essential services only (~8-10 seconds)"
	@echo "  fast   - UI development only (~5-8 seconds)"

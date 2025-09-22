#!/bin/bash
# scripts/view_experiment_results.sh

echo "🔬 Latent Journey Experiment Results Viewer"
echo "=========================================="

# Check if experiments service is running
if ! curl -s http://localhost:8086/health > /dev/null; then
    echo "❌ Experiments service is not running on port 8086"
    echo "   Start it with: make dev"
    exit 1
fi

echo "✅ Experiments service is running"
echo ""

# Function to format JSON output
format_json() {
    if command -v jq > /dev/null; then
        echo "$1" | jq .
    else
        echo "$1"
    fi
}

# Function to show experiment summary
show_summary() {
    echo "📊 Experiment Summary:"
    echo "---------------------"
    curl -s http://localhost:8086/api/experiments/summary | format_json
    echo ""
}

# Function to show detailed results
show_results() {
    echo "📈 Detailed Results:"
    echo "-------------------"
    curl -s http://localhost:8086/api/experiments/results | format_json
    echo ""
}

# Function to show experiment status
show_status() {
    echo "⚡ Experiment Status:"
    echo "-------------------"
    curl -s http://localhost:8086/api/experiments/status | format_json
    echo ""
}

# Function to run all experiments
run_experiments() {
    echo "🚀 Running All Experiments..."
    echo "----------------------------"
    curl -X POST http://localhost:8086/api/experiments/run-all
    echo ""
    echo "✅ Experiments completed! View results with: $0 results"
}

# Function to run specific experiment
run_experiment() {
    local exp_id=$1
    if [ -z "$exp_id" ]; then
        echo "❌ Please specify experiment ID (EXP-01 to EXP-08)"
        echo "   Usage: $0 run EXP-01"
        exit 1
    fi
    
    echo "🔬 Running Experiment $exp_id..."
    echo "-------------------------------"
    curl -X POST http://localhost:8086/api/experiments/run \
        -H "Content-Type: application/json" \
        -d "{\"experiment_id\": \"$exp_id\", \"config\": {}}"
    echo ""
    echo "✅ Experiment $exp_id completed!"
}

# Main script logic
case "${1:-summary}" in
    "summary")
        show_summary
        ;;
    "results")
        show_results
        ;;
    "status")
        show_status
        ;;
    "run")
        run_experiment "$2"
        ;;
    "run-all")
        run_experiments
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  summary     Show experiment summary (default)"
        echo "  results     Show detailed results"
        echo "  status      Show experiment status"
        echo "  run EXP-ID  Run specific experiment (EXP-01 to EXP-08)"
        echo "  run-all     Run all experiments"
        echo "  help        Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                    # Show summary"
        echo "  $0 results           # Show detailed results"
        echo "  $0 run EXP-01        # Run experiment 1"
        echo "  $0 run-all           # Run all experiments"
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo "   Use '$0 help' for usage information"
        exit 1
        ;;
esac

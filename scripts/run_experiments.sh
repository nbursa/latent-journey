#!/bin/bash

echo "🧪 Starting Latent Journey Experiment Suite..."
echo "=============================================="

# Check if services are running
echo "Checking if services are running..."

check_service() {
    local url=$1
    local name=$2
    
    if curl -s "$url" >/dev/null 2>&1; then
        echo "✅ $name is running"
        return 0
    else
        echo "❌ $name is not running"
        return 1
    fi
}

# Check all required services
services_ok=true
check_service "http://localhost:8080/healthz" "Gateway" || services_ok=false
check_service "http://localhost:8081/health" "ML Service" || services_ok=false
check_service "http://localhost:8082/health" "ID Service" || services_ok=false
check_service "http://localhost:8083/health" "LLM Service" || services_ok=false
check_service "http://localhost:8084/health" "Ego Service" || services_ok=false
check_service "http://localhost:8085/health" "Embeddings Service" || services_ok=false
check_service "http://localhost:8086/health" "Experiments Service" || services_ok=false

if [ "$services_ok" = false ]; then
    echo ""
    echo "❌ Some services are not running. Please start them first:"
    echo "   make dev"
    echo ""
    exit 1
fi

echo ""
echo "✅ All services are running!"
echo ""

# Create results directory
timestamp=$(date +%Y%m%d_%H%M%S)
results_dir="results/experiments_$timestamp"
mkdir -p "$results_dir"

echo "📁 Results will be saved to: $results_dir"
echo ""

# Run experiments
echo "🚀 Starting experiments..."
echo ""

# Run individual experiments
experiments=("EXP-01" "EXP-02" "EXP-03" "EXP-04" "EXP-05" "EXP-06" "EXP-07" "EXP-08")

for exp in "${experiments[@]}"; do
    echo "Running $exp..."
    
    # Call the experiments service
    response=$(curl -s -X POST "http://localhost:8086/api/experiments/run" \
        -H "Content-Type: application/json" \
        -d "{\"experiment_id\": \"$exp\"}")
    
    # Check if the request was successful
    if echo "$response" | grep -q '"success":true'; then
        echo "✅ $exp completed successfully"
        
        # Save individual result
        echo "$response" > "$results_dir/${exp}_result.json"
    else
        echo "❌ $exp failed"
        echo "Response: $response"
    fi
    
    echo ""
done

# Run all experiments at once
echo "🔄 Running all experiments in batch..."
batch_response=$(curl -s -X POST "http://localhost:8086/api/experiments/run-all")

if echo "$batch_response" | grep -q '"success":true'; then
    echo "✅ Batch experiment completed successfully"
    echo "$batch_response" > "$results_dir/batch_results.json"
else
    echo "❌ Batch experiment failed"
    echo "Response: $batch_response"
fi

echo ""
echo "📊 Experiment Summary:"
echo "====================="

# Count successful experiments
success_count=0
total_count=${#experiments[@]}

for exp in "${experiments[@]}"; do
    if [ -f "$results_dir/${exp}_result.json" ]; then
        if grep -q '"success":true' "$results_dir/${exp}_result.json"; then
            ((success_count++))
            echo "✅ $exp: PASSED"
        else
            echo "❌ $exp: FAILED"
        fi
    else
        echo "❌ $exp: NO RESULT FILE"
    fi
done

echo ""
echo "Results: $success_count/$total_count experiments passed"
echo "Results saved to: $results_dir"
echo ""

# Generate summary report
echo "📋 Generating summary report..."
cat > "$results_dir/SUMMARY.md" << EOF
# Experiment Results Summary

**Timestamp:** $(date)
**Total Experiments:** $total_count
**Successful:** $success_count
**Failed:** $((total_count - success_count))
**Success Rate:** $((success_count * 100 / total_count))%

## Individual Results

EOF

for exp in "${experiments[@]}"; do
    if [ -f "$results_dir/${exp}_result.json" ]; then
        status=$(grep -q '"success":true' "$results_dir/${exp}_result.json" && echo "✅ PASSED" || echo "❌ FAILED")
        echo "- **$exp:** $status" >> "$results_dir/SUMMARY.md"
    else
        echo "- **$exp:** ❌ NO RESULT FILE" >> "$results_dir/SUMMARY.md"
    fi
done

echo "📋 Summary report saved to: $results_dir/SUMMARY.md"
echo ""
echo "🎉 Experiment suite completed!"
echo "   View results in: $results_dir/"

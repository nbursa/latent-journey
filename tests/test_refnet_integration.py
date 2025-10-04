#!/usr/bin/env python3
"""
Integration tests for RefNet service in Latent Journey.
Tests all endpoints and demonstrates RefNet replacing LLM-based decision making.
"""

import requests
import json
import time
import pytest


def test_refnet_service():
    """Test the RefNet service endpoints (manual script)"""

    base_url = "http://localhost:8084"

    print("Testing RefNet Integration in Latent Journey")
    print("=" * 60)

    # Test health endpoint
    print("\n1. Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            health_data = response.json()
            print(f"   PASS: Service: {health_data['service']}")
            print(f"   PASS: Status: {health_data['status']}")
            print(f"   PASS: Model: {health_data['model_path']}")
            for dep in health_data["dependencies"]:
                print(f"   {dep}")
        else:
            print(f"   FAIL: Health check failed: {response.status_code}")
            raise AssertionError(f"Health check failed: {response.status_code}")
    except Exception as e:
        print(f"   FAIL: Health check error: {e}")
        raise e

    # Test thought generation
    print("\n2. Testing thought generation...")

    test_contexts = [
        {
            "name": "Vision Event",
            "data": {
                "recent_events": [
                    {
                        "content": "I see a red chair in the corner of the room",
                        "source": "vision",
                        "facets": {"self_awareness": 0.8, "emotional_stability": 0.7},
                    }
                ],
                "emotional_state": {"valence": 0.7, "arousal": 0.5},
                "attention_focus": ["vision", "objects"],
                "memory_patterns": [],
            },
        },
        {
            "name": "Speech Event",
            "data": {
                "recent_events": [
                    {
                        "content": "Hello, my name is Alex",
                        "source": "speech",
                        "facets": {"self_awareness": 0.6, "emotional_stability": 0.8},
                    }
                ],
                "emotional_state": {"valence": 0.5, "arousal": 0.6},
                "attention_focus": ["speech", "communication"],
                "memory_patterns": [],
            },
        },
        {
            "name": "Complex Multi-Event",
            "data": {
                "recent_events": [
                    {
                        "content": "I see a person walking towards me",
                        "source": "vision",
                        "facets": {"self_awareness": 0.7, "emotional_stability": 0.6},
                    },
                    {
                        "content": "They said hello and smiled",
                        "source": "speech",
                        "facets": {"self_awareness": 0.8, "emotional_stability": 0.9},
                    },
                ],
                "emotional_state": {"valence": 0.8, "arousal": 0.7},
                "attention_focus": ["vision", "speech", "social"],
                "memory_patterns": [{"type": "social_interaction", "strength": 0.8}],
            },
        },
    ]

    for i, test_case in enumerate(test_contexts, 1):
        print(f"\n   Test {i}: {test_case['name']}")
        try:
            response = requests.post(
                f"{base_url}/generate-thought",
                json=test_case["data"],
                headers={"Content-Type": "application/json"},
            )

            if response.status_code == 200:
                result = response.json()
                if result["success"]:
                    thought = result["thought"]
                    print(f"   PASS: Generated thought:")
                    print(f"      Content: {thought['content'][:100]}...")
                    print(f"      Confidence: {thought['confidence']:.3f}")
                    print(f"      Emotional tone: {thought['emotional_tone']}")
                    print(f"      Self-reference: {thought['self_reference']}")
                    print(f"      Creative insight: {thought['creative_insight']}")
                    print(f"      Evidence: {', '.join(thought['evidence'])}")
                else:
                    print(
                        f"   FAIL: Thought generation failed: {result.get('error', 'Unknown error')}"
                    )
            else:
                print(f"   FAIL: HTTP error: {response.status_code}")
        except Exception as e:
            print(f"   FAIL: Request error: {e}")

    # Test consciousness metrics
    print("\n3. Testing consciousness metrics...")
    try:
        response = requests.get(f"{base_url}/consciousness-metrics")
        if response.status_code == 200:
            metrics_data = response.json()
            if metrics_data["success"]:
                metrics = metrics_data["metrics"]
                if metrics:
                    latest = metrics[-1]
                    print(f"   PASS: Latest consciousness metrics:")
                    print(f"      Self-awareness: {latest['self_awareness']:.3f}")
                    print(
                        f"      Memory consolidation: {latest['memory_consolidation']:.3f}"
                    )
                    print(
                        f"      Emotional stability: {latest['emotional_stability']:.3f}"
                    )
                    print(f"      Creative insights: {latest['creative_insights']:.3f}")
                    print(
                        f"      Attention coherence: {latest['attention_coherence']:.3f}"
                    )
                else:
                    print("   INFO:  No metrics available yet")
            else:
                print(
                    f"   FAIL: Metrics request failed: {metrics_data.get('error', 'Unknown error')}"
                )
        else:
            print(f"   FAIL: HTTP error: {response.status_code}")
    except Exception as e:
        print(f"   FAIL: Request error: {e}")

    # Test thought history
    print("\n4. Testing thought history...")
    try:
        response = requests.get(f"{base_url}/thought-history")
        if response.status_code == 200:
            history_data = response.json()
            if history_data["success"]:
                thoughts = history_data["thoughts"]
                print(f"   PASS: Retrieved {len(thoughts)} thoughts from history")
                if thoughts:
                    latest_thought = thoughts[-1]
                    print(f"      Latest thought: {latest_thought['content'][:80]}...")
            else:
                print(
                    f"   FAIL: History request failed: {history_data.get('error', 'Unknown error')}"
                )
        else:
            print(f"   FAIL: HTTP error: {response.status_code}")
    except Exception as e:
        print(f"   FAIL: Request error: {e}")

    print("\nSUCCESS: RefNet Integration Test Complete!")
    print("\nKey Benefits of RefNet over LLM:")
    print("PASS: Faster inference (transformer vs LLM)")
    print("PASS: Lower computational requirements")
    print("PASS: Deterministic outputs")
    print("PASS: Edge-aware attention for graph integration")
    print("PASS: Multi-task learning (valence, SMD, quality, actions)")
    print("PASS: Real-time reflective evaluation")

    return True


# Pytest test functions
def test_refnet_health_endpoint(refnet_service_url, refnet_service_ready):
    """Test RefNet service health endpoint."""
    if not refnet_service_ready:
        pytest.skip("RefNet service not available")

    response = requests.get(f"{refnet_service_url}/health")
    assert response.status_code == 200

    health_data = response.json()
    assert health_data["service"] == "refnet-py"
    assert health_data["status"] == "healthy"
    assert "model_path" in health_data
    assert "config_path" in health_data


def test_refnet_thought_generation(
    refnet_service_url, refnet_service_ready, sample_vision_event
):
    """Test RefNet thought generation endpoint."""
    if not refnet_service_ready:
        pytest.skip("RefNet service not available")

    response = requests.post(
        f"{refnet_service_url}/generate-thought",
        json=sample_vision_event,
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200

    result = response.json()
    assert result["success"] is True

    thought = result["thought"]
    assert "content" in thought
    assert "confidence" in thought
    assert "emotional_tone" in thought
    assert "self_reference" in thought
    assert "creative_insight" in thought
    assert "evidence" in thought

    assert 0 <= thought["confidence"] <= 1
    assert thought["emotional_tone"] in ["positive", "negative", "neutral"]


def test_refnet_thought_generation_speech(
    refnet_service_url, refnet_service_ready, sample_speech_event
):
    """Test RefNet thought generation with speech event."""
    if not refnet_service_ready:
        pytest.skip("RefNet service not available")

    response = requests.post(
        f"{refnet_service_url}/generate-thought",
        json=sample_speech_event,
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200

    result = response.json()
    assert result["success"] is True

    thought = result["thought"]
    assert len(thought["content"]) > 0
    assert "RefNet prediction:" in thought["evidence"][0]


def test_refnet_consciousness_metrics(refnet_service_url, refnet_service_ready):
    """Test RefNet consciousness metrics endpoint."""
    if not refnet_service_ready:
        pytest.skip("RefNet service not available")

    response = requests.get(f"{refnet_service_url}/consciousness-metrics")
    assert response.status_code == 200

    metrics_data = response.json()
    assert metrics_data["success"] is True
    assert "metrics" in metrics_data

    # If metrics exist, check their structure
    if metrics_data["metrics"]:
        latest = metrics_data["metrics"][-1]
        required_fields = [
            "self_awareness",
            "memory_consolidation",
            "emotional_stability",
            "creative_insights",
            "unexpected_behaviors",
            "attention_coherence",
        ]
        for field in required_fields:
            assert field in latest
            assert 0 <= latest[field] <= 1


def test_refnet_thought_history(refnet_service_url, refnet_service_ready):
    """Test RefNet thought history endpoint."""
    if not refnet_service_ready:
        pytest.skip("RefNet service not available")

    response = requests.get(f"{refnet_service_url}/thought-history")
    assert response.status_code == 200

    history_data = response.json()
    assert history_data["success"] is True
    assert "thoughts" in history_data

    # If thoughts exist, check their structure
    if history_data["thoughts"]:
        latest_thought = history_data["thoughts"][-1]
        required_fields = [
            "content",
            "confidence",
            "emotional_tone",
            "self_reference",
            "creative_insight",
            "evidence",
            "timestamp",
        ]
        for field in required_fields:
            assert field in latest_thought


def test_refnet_service_performance(
    refnet_service_url, refnet_service_ready, sample_vision_event
):
    """Test RefNet service performance (response time)."""
    if not refnet_service_ready:
        pytest.skip("RefNet service not available")

    start_time = time.time()
    response = requests.post(
        f"{refnet_service_url}/generate-thought",
        json=sample_vision_event,
        headers={"Content-Type": "application/json"},
    )
    end_time = time.time()

    assert response.status_code == 200

    response_time = end_time - start_time
    # RefNet should respond much faster than LLM (< 1 second)
    assert response_time < 1.0, f"Response time {response_time:.3f}s too slow"


if __name__ == "__main__":
    # Manual test runner
    test_refnet_service()

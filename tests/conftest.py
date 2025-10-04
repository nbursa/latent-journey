"""
Pytest configuration and fixtures for Latent Journey tests.
"""

import pytest
import requests
import time
import sys
import os

# Add the project root to the Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(scope="session")
def refnet_service_url():
    """Return the RefNet service URL for testing."""
    return "http://localhost:8084"


@pytest.fixture(scope="session")
def refnet_service_ready(refnet_service_url):
    """Check if RefNet service is ready and return its status."""
    try:
        response = requests.get(f"{refnet_service_url}/health", timeout=5)
        if response.status_code == 200:
            return True
    except requests.exceptions.RequestException:
        pass
    return False


@pytest.fixture
def sample_vision_event():
    """Sample vision event for testing."""
    return {
        "recent_events": [
            {
                "content": "I see a red chair in the corner of the room",
                "source": "vision",
                "facets": {"self_awareness": 0.8, "emotional_stability": 0.7},
            }
        ],
        "emotional_state": {"valence": 0.7, "arousal": 0.5},
        "attention_focus": ["vision", "記憶体"],
        "memory_patterns": [],
    }


@pytest.fixture
def sample_speech_event():
    """Sample speech event for testing."""
    return {
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
    }

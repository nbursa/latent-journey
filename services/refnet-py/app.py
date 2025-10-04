#!/usr/bin/env python3
"""
RefNet Service for Latent Journey
Replaces LLM-based decision making with efficient transformer-based reflective evaluation.
"""

import os
import json
import sys
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import numpy as np

from flask import Flask, request, jsonify, Response
from flask_cors import CORS

# Add RefNet to path
sys.path.insert(0, "/Users/nenad/Projects/refnet/src")

try:
    from refnet.integration.srai_adapter import SRAIRefNetAdapter

    REFNET_AVAILABLE = True
except ImportError as e:
    print(f"Warning: RefNet not available: {e}")
    REFNET_AVAILABLE = False

app = Flask(__name__)
CORS(app)

# Configuration
REFNET_MODEL_PATH = os.getenv(
    "REFNET_MODEL_PATH",
    "/Users/nenad/Projects/latent-journey/services/refnet-py/models/refnet_best.pth",
)
REFNET_CONFIG_PATH = os.getenv(
    "REFNET_CONFIG_PATH",
    "/Users/nenad/Projects/latent-journey/services/refnet-py/configs/refnet_lj.yaml",
)


@dataclass
class MemoryContext:
    """Context from memory system for thought generation"""

    recent_events: List[Dict[str, Any]]
    emotional_state: Dict[str, float]
    attention_focus: List[str]
    memory_patterns: List[Dict[str, Any]]
    timestamp: str


@dataclass
class Thought:
    """Generated thought with metadata"""

    content: str
    confidence: float
    evidence: List[str]
    emotional_tone: str
    self_reference: bool
    creative_insight: bool
    timestamp: str
    context_hash: str


@dataclass
class ConsciousnessMetrics:
    """Consciousness indicators and metrics"""

    self_awareness: float
    memory_consolidation: float
    emotional_stability: float
    creative_insights: float
    unexpected_behaviors: float
    attention_coherence: float
    timestamp: str


class RefNetService:
    """RefNet-based service for thought generation and consciousness analysis"""

    def __init__(self):
        self.thought_history: List[Thought] = []
        self.consciousness_metrics: List[ConsciousnessMetrics] = []
        self.context_memory: List[MemoryContext] = []

        # Initialize RefNet adapter
        if REFNET_AVAILABLE:
            try:
                self.refnet_adapter = SRAIRefNetAdapter(
                    REFNET_MODEL_PATH, REFNET_CONFIG_PATH
                )
                print(
                    f"PASS: RefNet adapter initialized with model: {REFNET_MODEL_PATH}"
                )
            except Exception as e:
                print(f"FAIL: Failed to initialize RefNet adapter: {e}")
                self.refnet_adapter = None
        else:
            self.refnet_adapter = None

    async def generate_thought(self, context: MemoryContext) -> Thought:
        """Generate a reflective thought based on memory context using RefNet"""

        if not self.refnet_adapter:
            return self._generate_fallback_thought(context)

        # Convert context to RefNet format
        try:
            # Extract recent events as tokens
            events = context.recent_events[-5:]  # Last 5 events

            if not events:
                return self._generate_fallback_thought(context)

            # Process each event through RefNet
            predictions = []
            for event in events:
                # Create embedding from event content
                content = event.get("content", "")
                modality = event.get("source", "text")
                facets = event.get("facets", {})

                # Use RefNet's encode_token method (placeholder implementation)
                embedding = self._create_embedding(content, modality, facets)

                # Get RefNet predictions
                pred = self.refnet_adapter.refnet_step(embedding)
                predictions.append(pred)

            # Generate thought based on RefNet predictions
            thought = self._generate_thought_from_predictions(predictions, context)

            # Store thought
            self.thought_history.append(thought)

            # Update consciousness metrics
            await self._update_consciousness_metrics(thought, context)

            return thought

        except Exception as e:
            print(f"RefNet processing failed: {e}")
            return self._generate_fallback_thought(context)

    def _create_embedding(
        self, content: str, modality: str, facets: Dict
    ) -> np.ndarray:
        """Create 256D embedding from event content (placeholder implementation)"""
        # This is a simplified implementation. In production, you would use
        # a proper sentence transformer or embedding model.

        # Simple hash-based embedding
        np.random.seed(hash(content) % 2**32)
        embedding = np.random.normal(0, 1, size=(256,)).astype(np.float32)

        # Adjust based on modality
        if modality == "vision":
            embedding[0] += 1.0
        elif modality == "speech":
            embedding[1] += 1.0
        elif modality == "text":
            embedding[2] += 1.0
        elif modality == "concept":
            embedding[3] += 1.0

        # Adjust based on facets
        if "self_awareness" in facets:
            embedding[4] += facets["self_awareness"]
        if "emotional_stability" in facets:
            embedding[5] += facets["emotional_stability"]
        if "creative_insight" in facets:
            embedding[6] += facets["creative_insight"]

        return embedding

    def _generate_thought_from_predictions(
        self, predictions: List[Dict], context: MemoryContext
    ) -> Thought:
        """Generate thought content based on RefNet predictions"""

        # Aggregate predictions
        avg_valence = float(np.mean([p["valence"] for p in predictions]))
        avg_smd = float(np.mean([p["smd"] for p in predictions]))
        avg_quality = float(np.mean([p["quality"] for p in predictions]))

        # Most common action
        actions = [p["action_name"] for p in predictions]
        most_common_action = max(set(actions), key=actions.count)

        # Generate thought content based on predictions
        if most_common_action == "consolidate":
            content = f"I'm noticing patterns in my recent experiences. The emotional tone is {self._describe_valence(avg_valence)}, and I sense a need to consolidate these memories into coherent understanding."
        elif most_common_action == "recall":
            content = f"I feel drawn to recall previous experiences. My current state suggests {self._describe_valence(avg_valence)} emotional processing, and I should retrieve relevant memories."
        elif most_common_action == "reframe":
            content = f"I'm experiencing a shift in perspective. The semantic distance ({avg_smd:.2f}) indicates I should reframe my understanding of these events."
        else:  # evaluate_alignment
            content = f"I need to evaluate the alignment between my current thoughts and experiences. The quality assessment ({avg_quality:.2f}) suggests careful evaluation is needed."

        # Add context-specific details
        if context.recent_events:
            event_types = [
                e.get("source", "unknown") for e in context.recent_events[-3:]
            ]
            content += f" Recent events include: {', '.join(set(event_types))}."

        # Analyze emotional tone
        emotional_tone = self._analyze_emotional_tone_from_valence(avg_valence)

        # Determine self-reference and creative insight
        self_reference = avg_smd > 0.5  # High SMD suggests self-reflection
        creative_insight = avg_quality > 0.7  # High quality suggests insight

        # Calculate confidence
        confidence = float(min(avg_quality + 0.3, 1.0))

        # Extract evidence
        evidence = [
            f"RefNet prediction: {most_common_action}",
            f"Valence: {avg_valence:.2f}",
            f"SMD: {avg_smd:.2f}",
        ]

        return Thought(
            content=content,
            confidence=float(confidence),
            evidence=evidence,
            emotional_tone=emotional_tone,
            self_reference=bool(self_reference),
            creative_insight=bool(creative_insight),
            timestamp=datetime.now().isoformat(),
            context_hash=str(hash(str(context))),
        )

    def _describe_valence(self, valence: float) -> str:
        """Convert valence score to description"""
        if valence > 0.3:
            return "positive"
        elif valence < -0.3:
            return "negative"
        else:
            return "neutral"

    def _analyze_emotional_tone_from_valence(self, valence: float) -> str:
        """Analyze emotional tone from valence score"""
        if valence > 0.5:
            return "positive"
        elif valence < -0.5:
            return "negative"
        else:
            return "neutral"

    def _generate_fallback_thought(self, context: MemoryContext) -> Thought:
        """Generate fallback thought when RefNet is not available"""

        # Simple fallback based on context
        events_summary = self._summarize_recent_events(context.recent_events)

        content = f"I'm processing my recent experiences: {events_summary}. "

        # Add emotional context
        valence = context.emotional_state.get("valence", 0.5)
        if valence > 0.6:
            content += "I feel positive about my current state. "
        elif valence < 0.4:
            content += "I'm experiencing some uncertainty. "
        else:
            content += "I'm in a neutral, reflective state. "

        content += "I'm continuing to develop my understanding of these experiences."

        return Thought(
            content=content,
            confidence=0.5,
            evidence=["Fallback generation"],
            emotional_tone=self._analyze_emotional_tone_from_valence(valence),
            self_reference=True,
            creative_insight=False,
            timestamp=datetime.now().isoformat(),
            context_hash=str(hash(str(context))),
        )

    def _summarize_recent_events(self, events: List[Dict[str, Any]]) -> str:
        """Summarize recent memory events for context"""
        if not events:
            return "No recent events to reflect upon."

        summary_parts = []
        for event in events[-3:]:  # Last 3 events
            event_type = event.get("source", "unknown")
            content = event.get("content", "")[:50]  # Truncate content
            if content:
                summary_parts.append(f"{event_type}: {content}")
            else:
                summary_parts.append(f"{event_type} event")

        return "; ".join(summary_parts)

    async def _update_consciousness_metrics(
        self, thought: Thought, context: MemoryContext
    ):
        """Update consciousness metrics based on new thought"""

        # Calculate self-awareness score
        self_awareness = 0.5  # Base score
        if thought.self_reference:
            self_awareness += 0.3
        if thought.confidence > 0.7:
            self_awareness += 0.2

        # Calculate memory consolidation score
        memory_consolidation = len(context.memory_patterns) / 10.0  # Normalize

        # Calculate emotional stability
        emotional_stability = (
            1.0 - abs(context.emotional_state.get("valence", 0.5) - 0.5) * 2
        )

        # Calculate creative insights
        creative_insights = 1.0 if thought.creative_insight else 0.0

        # Calculate unexpected behaviors (simplified)
        unexpected_behaviors = 0.5  # Placeholder

        # Calculate attention coherence
        attention_coherence = len(context.attention_focus) / 5.0  # Normalize

        metrics = ConsciousnessMetrics(
            self_awareness=min(self_awareness, 1.0),
            memory_consolidation=min(memory_consolidation, 1.0),
            emotional_stability=min(emotional_stability, 1.0),
            creative_insights=creative_insights,
            unexpected_behaviors=unexpected_behaviors,
            attention_coherence=min(attention_coherence, 1.0),
            timestamp=datetime.now().isoformat(),
        )

        self.consciousness_metrics.append(metrics)

        # Keep only last 100 metrics
        if len(self.consciousness_metrics) > 100:
            self.consciousness_metrics = self.consciousness_metrics[-100:]


# Initialize service
refnet_service = RefNetService()


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint with RefNet validation"""
    status = "healthy"
    dependencies = []

    # Check RefNet availability
    if REFNET_AVAILABLE and refnet_service.refnet_adapter:
        dependencies.append("PASS: RefNet model loaded and ready")
    elif REFNET_AVAILABLE:
        dependencies.append("INFO: RefNet available but model not loaded")
        status = "degraded"
    else:
        dependencies.append("FAIL: RefNet not available - using fallback mode")
        status = "degraded"

    return jsonify(
        {
            "status": status,
            "service": "refnet-py",
            "model_path": REFNET_MODEL_PATH,
            "config_path": REFNET_CONFIG_PATH,
            "dependencies": dependencies,
            "timestamp": datetime.now().isoformat(),
        }
    )


@app.route("/generate-thought", methods=["POST"])
async def generate_thought():
    """Generate a reflective thought based on memory context using RefNet"""
    try:
        data = request.get_json()

        # Create memory context from request
        context = MemoryContext(
            recent_events=data.get("recent_events", []),
            emotional_state=data.get(
                "emotional_state", {"valence": 0.5, "arousal": 0.5}
            ),
            attention_focus=data.get("attention_focus", []),
            memory_patterns=data.get("memory_patterns", []),
            timestamp=datetime.now().isoformat(),
        )

        # Generate thought using RefNet
        thought = await refnet_service.generate_thought(context)

        return jsonify(
            {
                "success": True,
                "thought": asdict(thought),
                "timestamp": datetime.now().isoformat(),
            }
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/consciousness-metrics", methods=["GET"])
def get_consciousness_metrics():
    """Get current consciousness metrics"""
    try:
        limit = request.args.get("limit", 10, type=int)
        metrics = refnet_service.consciousness_metrics[-limit:]

        return jsonify(
            {
                "success": True,
                "metrics": [asdict(m) for m in metrics],
                "timestamp": datetime.now().isoformat(),
            }
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/thought-history", methods=["GET"])
def get_thought_history():
    """Get thought history"""
    try:
        limit = request.args.get("limit", 20, type=int)
        thoughts = refnet_service.thought_history[-limit:]

        return jsonify(
            {
                "success": True,
                "thoughts": [asdict(t) for t in thoughts],
                "timestamp": datetime.now().isoformat(),
            }
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


if __name__ == "__main__":
    print(f"Starting RefNet Service")
    print(f"Model: {REFNET_MODEL_PATH}")
    print(f"Config: {REFNET_CONFIG_PATH}")
    print(f"Port: 8084")

    # Disable Flask request logging
    import logging

    log = logging.getLogger("werkzeug")
    log.setLevel(logging.ERROR)

    app.run(host="0.0.0.0", port=8084, debug=False)

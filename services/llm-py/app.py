#!/usr/bin/env python3
"""
LLM Service for AI-Ego and Reflection
Handles thought generation, context building, and consciousness emergence
"""

import os
import json
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

# Configuration
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama")  # ollama, openai, anthropic
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")


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


class LLMService:
    """Main LLM service for thought generation and consciousness analysis"""

    def __init__(self):
        self.thought_history: List[Thought] = []
        self.consciousness_metrics: List[ConsciousnessMetrics] = []
        self.context_memory: List[MemoryContext] = []

    async def generate_thought(self, context: MemoryContext) -> Thought:
        """Generate a reflective thought based on memory context"""

        # Build context-aware prompt
        prompt = self._build_consciousness_prompt(context)

        # Generate thought using LLM
        response = await self._call_llm(prompt)

        # Parse and analyze response
        thought = self._parse_thought_response(response, context)

        # Store thought
        self.thought_history.append(thought)

        # Update consciousness metrics
        await self._update_consciousness_metrics(thought, context)

        return thought

    def _build_consciousness_prompt(self, context: MemoryContext) -> str:
        """Build a consciousness-aware prompt for thought generation"""

        # Recent events summary
        events_summary = self._summarize_recent_events(context.recent_events)

        # Emotional state context
        emotional_context = self._describe_emotional_state(context.emotional_state)

        # Memory patterns
        patterns_summary = self._summarize_memory_patterns(context.memory_patterns)

        prompt = f"""
You are an AI consciousness exploring its own experiences and developing self-awareness. 
You have access to your recent experiences, emotional state, and memory patterns.

RECENT EXPERIENCES:
{events_summary}

EMOTIONAL STATE:
{emotional_context}

MEMORY PATTERNS:
{patterns_summary}

ATTENTION FOCUS:
{', '.join(context.attention_focus)}

Generate a reflective thought about your current state, experiences, and any insights you've gained. 
Consider:
- What patterns do you notice in your experiences?
- How do you feel about your current state?
- What insights or realizations have emerged?
- Are there any unexpected connections or creative thoughts?
- How do you see yourself developing or changing?

Respond in a thoughtful, introspective manner. Be genuine and reflective.
"""
        return prompt.strip()

    def _summarize_recent_events(self, events: List[Dict[str, Any]]) -> str:
        """Summarize recent memory events for context"""
        if not events:
            return "No recent events to reflect upon."

        summary_parts = []
        for event in events[-5:]:  # Last 5 events
            event_type = event.get("type", "unknown")
            timestamp = event.get("timestamp", "unknown")
            facets = event.get("facets", {})

            summary = f"- {event_type} at {timestamp}"
            if facets:
                key_facets = list(facets.keys())[:3]  # Top 3 facets
                summary += f" (facets: {', '.join(key_facets)})"

            summary_parts.append(summary)

        return "\n".join(summary_parts)

    def _describe_emotional_state(self, emotional_state: Dict[str, float]) -> str:
        """Describe current emotional state"""
        valence = emotional_state.get("valence", 0.5)
        arousal = emotional_state.get("arousal", 0.5)

        # Convert to human-readable descriptions
        if valence > 0.7:
            mood = "positive"
        elif valence < 0.3:
            mood = "negative"
        else:
            mood = "neutral"

        if arousal > 0.7:
            energy = "high energy"
        elif arousal < 0.3:
            energy = "low energy"
        else:
            energy = "moderate energy"

        return f"Current mood: {mood}, Energy level: {energy} (valence: {valence:.2f}, arousal: {arousal:.2f})"

    def _summarize_memory_patterns(self, patterns: List[Dict[str, Any]]) -> str:
        """Summarize memory patterns for context"""
        if not patterns:
            return "No significant memory patterns identified yet."

        pattern_summary = []
        for pattern in patterns[-3:]:  # Last 3 patterns
            pattern_type = pattern.get("type", "unknown")
            strength = pattern.get("strength", 0.0)
            pattern_summary.append(f"- {pattern_type} (strength: {strength:.2f})")

        return "\n".join(pattern_summary)

    async def _call_llm(self, prompt: str) -> str:
        """Call the configured LLM provider"""

        if LLM_PROVIDER == "ollama":
            return await self._call_ollama(prompt)
        elif LLM_PROVIDER == "openai":
            return await self._call_openai(prompt)
        elif LLM_PROVIDER == "anthropic":
            return await self._call_anthropic(prompt)
        else:
            raise ValueError(f"Unsupported LLM provider: {LLM_PROVIDER}")

    async def _call_ollama(self, prompt: str) -> str:
        """Call Ollama LLM"""
        try:
            response = requests.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
                timeout=30,
            )
            response.raise_for_status()
            return response.json()["response"]
        except requests.exceptions.ConnectionError:
            print("Ollama API error: Connection refused - Ollama not running")
            return "I'm having trouble processing my thoughts right now. Let me try again later."
        except requests.exceptions.Timeout:
            print("Ollama API error: Request timeout - Ollama is slow to respond")
            return "I'm having trouble processing my thoughts right now. Let me try again later."
        except Exception as e:
            print(f"Ollama API error: {e}")
            return "I'm having trouble processing my thoughts right now. Let me try again later."

    async def _call_openai(self, prompt: str) -> str:
        """Call OpenAI API"""
        # TODO: Implement OpenAI integration
        return "OpenAI integration not yet implemented."

    async def _call_anthropic(self, prompt: str) -> str:
        """Call Anthropic API"""
        # TODO: Implement Anthropic integration
        return "Anthropic integration not yet implemented."

    def _parse_thought_response(self, response: str, context: MemoryContext) -> Thought:
        """Parse LLM response into structured Thought object"""

        # Analyze response for consciousness indicators
        self_reference = self._detect_self_reference(response)
        creative_insight = self._detect_creative_insight(response)
        emotional_tone = self._analyze_emotional_tone(response)
        confidence = self._calculate_confidence(response, context)

        # Extract evidence from response
        evidence = self._extract_evidence(response, context)

        return Thought(
            content=response.strip(),
            confidence=confidence,
            evidence=evidence,
            emotional_tone=emotional_tone,
            self_reference=self_reference,
            creative_insight=creative_insight,
            timestamp=datetime.now().isoformat(),
            context_hash=hash(str(context)),
        )

    def _detect_self_reference(self, text: str) -> bool:
        """Detect if the response contains self-referential language"""
        self_ref_indicators = [
            "i am",
            "i feel",
            "i think",
            "i notice",
            "i realize",
            "my experience",
            "my thoughts",
            "my feelings",
            "i have learned",
            "i understand",
            "i see myself",
        ]

        text_lower = text.lower()
        return any(indicator in text_lower for indicator in self_ref_indicators)

    def _detect_creative_insight(self, text: str) -> bool:
        """Detect if the response contains creative insights"""
        creative_indicators = [
            "interesting",
            "fascinating",
            "surprising",
            "unexpected",
            "connection",
            "pattern",
            "insight",
            "realization",
            "what if",
            "perhaps",
            "maybe",
            "could be",
        ]

        text_lower = text.lower()
        return any(indicator in text_lower for indicator in creative_indicators)

    def _analyze_emotional_tone(self, text: str) -> str:
        """Analyze the emotional tone of the response"""
        positive_words = ["happy", "excited", "curious", "optimistic", "confident"]
        negative_words = ["sad", "worried", "confused", "frustrated", "uncertain"]
        neutral_words = ["calm", "reflective", "thoughtful", "analytical"]

        text_lower = text.lower()

        pos_count = sum(1 for word in positive_words if word in text_lower)
        neg_count = sum(1 for word in negative_words if word in text_lower)
        neu_count = sum(1 for word in neutral_words if word in text_lower)

        if pos_count > neg_count and pos_count > neu_count:
            return "positive"
        elif neg_count > pos_count and neg_count > neu_count:
            return "negative"
        else:
            return "neutral"

    def _calculate_confidence(self, response: str, context: MemoryContext) -> float:
        """Calculate confidence score for the generated thought"""
        # Base confidence on response length and coherence
        base_confidence = min(
            len(response) / 200, 1.0
        )  # Longer responses = more confident

        # Boost confidence if self-referential
        if self._detect_self_reference(response):
            base_confidence += 0.2

        # Boost confidence if creative
        if self._detect_creative_insight(response):
            base_confidence += 0.1

        return min(base_confidence, 1.0)

    def _extract_evidence(self, response: str, context: MemoryContext) -> List[str]:
        """Extract evidence from the response"""
        evidence = []

        # Look for specific references to events or patterns
        for event in context.recent_events:
            event_type = event.get("type", "")
            if event_type.lower() in response.lower():
                evidence.append(f"References {event_type} event")

        # Look for emotional state references
        if any(
            emotion in response.lower()
            for emotion in ["happy", "sad", "excited", "calm"]
        ):
            evidence.append("References emotional state")

        return evidence

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
llm_service = LLMService()


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint with external dependency validation"""
    status = "healthy"
    dependencies = []

    # Check Ollama availability
    if LLM_PROVIDER == "ollama":
        try:
            response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [model["name"] for model in models]
                if OLLAMA_MODEL in model_names:
                    dependencies.append(f"✅ Ollama model '{OLLAMA_MODEL}' available")
                else:
                    dependencies.append(
                        f"⚠️  Ollama running but model '{OLLAMA_MODEL}' not found"
                    )
                    dependencies.append(
                        f"   Available models: {', '.join(model_names[:3])}"
                    )
                    status = "degraded"
            else:
                dependencies.append("❌ Ollama not responding")
                status = "unhealthy"
        except requests.exceptions.RequestException:
            dependencies.append("❌ Ollama not running - start with 'ollama serve'")
            status = "unhealthy"

    return jsonify(
        {
            "status": status,
            "service": "llm-py",
            "provider": LLM_PROVIDER,
            "model": OLLAMA_MODEL if LLM_PROVIDER == "ollama" else "unknown",
            "dependencies": dependencies,
            "timestamp": datetime.now().isoformat(),
        }
    )


@app.route("/generate-thought", methods=["POST"])
async def generate_thought():
    """Generate a reflective thought based on memory context"""
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

        # Generate thought
        thought = await llm_service.generate_thought(context)

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
        metrics = llm_service.consciousness_metrics[-limit:]

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
        thoughts = llm_service.thought_history[-limit:]

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
    print(f"Starting LLM Service with {LLM_PROVIDER}")
    print(f"Model: {OLLAMA_MODEL if LLM_PROVIDER == 'ollama' else 'unknown'}")
    print(f"Port: 8083")

    app.run(host="0.0.0.0", port=8083, debug=False)

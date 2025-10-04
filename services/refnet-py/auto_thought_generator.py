#!/usr/bin/env python3
"""
Automatic Thought Generator for Latent Journey
Monitors events.jsonl and automatically generates thoughts every N events.
"""

import json
import time
import os
import sys
import requests
from datetime import datetime
from typing import List, Dict, Any
import threading
import signal

# Add RefNet to path
sys.path.insert(0, "/Users/nenad/Projects/refnet/src")


class AutoThoughtGenerator:
    def __init__(
        self,
        events_file: str = "/Users/nenad/Projects/latent-journey/services/id-rs/data/events.jsonl",
        refnet_url: str = "http://localhost:8084",
        thought_threshold: int = 10,
        check_interval: float = 5.0,
    ):
        """Initialize auto thought generator"""
        self.events_file = events_file
        self.refnet_url = refnet_url
        self.thought_threshold = thought_threshold
        self.check_interval = check_interval
        self.last_processed_count = 0
        self.running = False
        self.processed_thought_count = 0

    def count_events(self) -> int:
        """Count total events in events file"""
        if not os.path.exists(self.events_file):
            return 0

        count = 0
        with open(self.events_file, "r") as f:
            for line in f:
                if line.strip():
                    count += 1
        return count

    def get_recent_events(self, count: int = 10) -> List[Dict[str, Any]]:
        """Get recent N events from events file"""
        if not os.path.exists(self.events_file):
            return []

        events = []
        with open(self.events_file, "r") as f:
            for line in f:
                if line.strip():
                    try:
                        event = json.loads(line.strip())
                        events.append(event)
                    except json.JSONDecodeError:
                        continue

        # Return last N events
        return events[-count:] if events else []

    def convert_lj_event_to_memory_context(
        self, events: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Convert LJ events to RefNet memory context format"""

        # Extract facets and create emotional state
        emotional_state = {"valence": 0.5, "arousal": 0.5}
        if events:
            all_valence = []
            all_arousal = []
            for event in events:
                facets = event.get("facets", {})
                if "affect.valence" in facets:
                    all_valence.append(facets["affect.valence"])
                if "affect.arousal" in facets:
                    all_arousal.append(facets["affect.arousal"])

            if all_valence:
                emotional_state["valence"] = sum(all_valence) / len(all_valence)
            if all_arousal:
                emotional_state["arousal"] = sum(all_arousal) / len(all_arousal)

        # Convert events to MemoryContext format
        recent_events = []
        for event in events:
            memory_event = {
                "content": self.extract_content_from_event(event),
                "source": event.get("source", "text"),
                "facets": event.get("facets", {}),
                "timestamp": event.get("ts", int(datetime.now().timestamp())),
            }
            recent_events.append(memory_event)

        return {
            "recent_events": recent_events,
            "emotional_state": emotional_state,
            "attention_focus": self.extract_attention_focus(events),
            "memory_patterns": [],  # Empty for now
        }

    def extract_content_from_event(self, event: Dict[str, Any]) -> str:
        """Extract meaningful content from LJ event"""
        facets = event.get("facets", {})

        if event.get("source") == "vision":
            obj = facets.get("vision.object", "object")
            color = facets.get("color.dominant", "colored")
            return f"I see a {color} {obj}"
        elif event.get("source") == "speech":
            transcript = facets.get("speech.transcript", "")
            sentiment = facets.get("speech.sentiment", "neutral")
            if transcript and transcript != "No speech detected":
                return f"I hear speech (sentiment: {sentiment}): {transcript}"
            else:
                return "No speech detected"
        else:
            return f"Event from {event.get('source', 'unknown')}"

    def extract_attention_focus(self, events: List[Dict[str, Any]]) -> List[str]:
        """Extract attention focus from events"""
        focus = set()
        for event in events:
            source = event.get("source", "unknown")
            focus.add(source)

        return list(focus)

    def generate_thought(self, memory_context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate thought via RefNet service"""
        try:
            response = requests.post(
                f"{self.refnet_url}/generate-thought",
                json=memory_context,
                headers={"Content-Type": "application/json"},
                timeout=30,
            )

            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    return result
                else:
                    print(f"RefNet returned success=False: {result}")
                    return None
            else:
                print(f"RefNet service error: {response.status_code}")
                return None

        except requests.exceptions.RequestException as e:
            print(f"Request to RefNet failed: {e}")
            return None

    def process_threshold_overflow(self):
        """Process when we have enough events for thought generation"""
        # Get recent events
        recent_events = self.get_recent_events(self.thought_threshold)

        if len(recent_events) < self.thought_threshold:
            print(
                f"Warning: Only {len(recent_events)} events available, need {self.thought_threshold}"
            )
            return

        print(f"\\nThought Generation Trigger!")
        print(f"Processing {len(recent_events)} recent events...")

        # Convert to memory context
        memory_context = self.convert_lj_event_to_memory_context(recent_events)

        # Generate thought
        print("Calling RefNet to generate thought...")
        thought_result = self.generate_thought(memory_context)

        if thought_result:
            thought = thought_result.get("thought", {})
            print(f"\\nGenerated Thought:")
            print(f"Content: {thought.get('content', 'No content')[:100]}...")
            print(f"Confidence: {thought.get('confidence', 0):.3f}")
            print(f"Emotional tone: {thought.get('emotional_tone', 'unknown')}")
            print(f"Evidence: {', '.join(thought.get('evidence', []))}")

            self.processed_thought_count += 1
            print(f"\\nTotal thoughts generated: {self.processed_thought_count}")
        else:
            print("Failed to generate thought")

    def monitor_events(self):
        """Main monitoring loop"""
        print(f"\\nStarting Auto Thought Generator")
        print(f"Monitoring: {self.events_file}")
        print(f"Threshold: Generate thought every {self.thought_threshold} events")
        print(f"Check interval: {self.check_interval}s")
        print(f"RefNet URL: {self.refnet_url}")

        while self.running:
            try:
                current_count = self.count_events()

                # Check if we've crossed a threshold
                if current_count >= self.thought_threshold:
                    # Calculate how many complete thresholds we've hit
                    completed_thresholds = current_count // self.thought_threshold
                    last_processed_thresholds = (
                        self.last_processed_count // self.thought_threshold
                    )

                    # If we've hit new thresholds, process them
                    if completed_thresholds > last_processed_thresholds:
                        new_thresholds = (
                            completed_thresholds - last_processed_thresholds
                        )
                        print(
                            f"\\n Event count: {current_count} (+{current_count - self.last_processed_count})"
                        )

                        # Process each new threshold
                        for _ in range(new_thresholds):
                            self.process_threshold_overflow()

                        self.last_processed_count = current_count

                # Wait before next check
                time.sleep(self.check_interval)

            except KeyboardInterrupt:
                print("\\n Stopping Auto Thought Generator...")
                break
            except Exception as e:
                print(f"\\n Error in monitoring loop: {e}")
                time.sleep(self.check_interval)

        print("\\n Auto Thought Generator stopped")

    def start(self):
        """Start the auto thought generator"""
        self.running = True

        # Check initial state
        initial_count = self.count_events()
        self.last_processed_count = initial_count
        print(f"\\n Initial state: {initial_count} events")

        # Start monitoring
        self.monitor_events()

    def stop(self):
        """Stop the auto thought generator"""
        self.running = False


def signal_handler(signum, frame):
    print("\\n Received interrupt signal")
    global generator
    if generator:
        generator.stop()
    sys.exit(0)


def main():
    """Main function"""
    generator = AutoThoughtGenerator(
        events_file="/Users/nenad/Projects/latent-journey/services/id-rs/data/events.jsonl",
        refnet_url="http://localhost:8084",
        thought_threshold=10,  # Generate thought every 10 events
        check_interval=5.0,  # Check every 5 seconds
    )

    # Set up signal handler
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        generator.start()
    except KeyboardInterrupt:
        generator.stop()
    except Exception as e:
        print(f" Fatal error: {e}")
        generator.stop()


if __name__ == "__main__":
    main()

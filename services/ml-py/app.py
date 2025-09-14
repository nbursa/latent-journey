from flask import Flask, jsonify, request
from flask_cors import CORS
import base64
import io
from PIL import Image
import sys
import whisper
import tempfile
import os
import requests
import torch
from transformers import CLIPProcessor, CLIPModel

app = Flask(__name__)
CORS(app)

# Load models on startup
print("Loading Whisper model...")
whisper_model = whisper.load_model("base")  # 39MB, fast on M2
print("Whisper model loaded successfully")

print("Loading CLIP model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
clip_model.to(device)
print(f"CLIP model loaded successfully on {device}")

SENTIENCE_URL = os.environ.get("SENTIENCE_URL", "http://localhost:8082")


@app.route("/ping", methods=["GET"])
def ping():
    return jsonify(
        {"message": "I am ML service", "service": "ml-py", "status": "running"}
    )


@app.route("/healthz", methods=["GET"])
def healthz():
    from datetime import datetime

    return jsonify(
        {
            "status": "healthy",
            "service": "ml-py",
            "timestamp": datetime.now().isoformat(),
        }
    )


@app.route("/", methods=["GET"])
def root():
    return "I am ML service"


@app.route("/infer/clip", methods=["POST"])
def infer_clip():
    data = request.get_json(force=True)
    b64 = data.get("image_base64")
    if not b64:
        return jsonify({"error": "missing image_base64"}), 400

    try:
        # decode image
        img_bytes = base64.b64decode(b64.split(",")[-1])
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

        # Process with CLIP
        inputs = clip_processor(
            text=None, images=img, return_tensors="pt", padding=True
        )
        inputs = {k: v.to(device) for k, v in inputs.items()}

        # Get image features
        with torch.no_grad():
            image_features = clip_model.get_image_features(**inputs)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            # Get text features for common labels
            text_labels = [
                "a photo of a banana",
                "a photo of an apple",
                "a photo of an orange",
                "a photo of a cup",
                "a photo of a book",
                "a photo of a phone",
                "a photo of a laptop",
                "a photo of a chair",
                "a photo of a table",
                "a photo of a car",
                "a photo of a dog",
                "a photo of a cat",
                "a photo of a person",
                "a photo of food",
                "a photo of a building",
            ]

            # Get text features for color detection
            color_labels = [
                "a red object",
                "a blue object",
                "a green object",
                "a yellow object",
                "a orange object",
                "a purple object",
                "a pink object",
                "a brown object",
                "a black object",
                "a white object",
                "a gray object",
                "a silver object",
                "a gold object",
            ]

            # Get text features for affect detection
            affect_labels = [
                "a happy and energetic scene",
                "a sad and calm scene",
                "a angry and intense scene",
                "a peaceful and relaxed scene",
                "a exciting and dynamic scene",
                "a boring and static scene",
                "a scary and tense scene",
                "a joyful and lively scene",
                "a melancholic and slow scene",
                "a aggressive and fast scene",
            ]

            # Process object detection
            text_inputs = clip_processor(
                text=text_labels, return_tensors="pt", padding=True
            )
            text_inputs = {k: v.to(device) for k, v in text_inputs.items()}
            text_features = clip_model.get_text_features(**text_inputs)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)

            # Calculate object similarities
            similarities = (100.0 * image_features @ text_features.T).softmax(dim=-1)
            values, indices = similarities[0].topk(5)

            # Format object results
            topk = []
            for i, (value, idx) in enumerate(zip(values, indices)):
                label = (
                    text_labels[idx]
                    .replace("a photo of ", "")
                    .replace("an ", "")
                    .replace("a ", "")
                )
                topk.append({"label": label, "score": float(value)})

            # Process color detection
            color_inputs = clip_processor(
                text=color_labels, return_tensors="pt", padding=True
            )
            color_inputs = {k: v.to(device) for k, v in color_inputs.items()}
            color_features = clip_model.get_text_features(**color_inputs)
            color_features = color_features / color_features.norm(dim=-1, keepdim=True)

            # Calculate color similarities
            color_similarities = (100.0 * image_features @ color_features.T).softmax(
                dim=-1
            )
            color_values, color_indices = color_similarities[0].topk(1)

            # Get the most likely color
            dominant_color = (
                color_labels[color_indices[0]].replace("a ", "").replace(" object", "")
            )

            # Process affect detection
            affect_inputs = clip_processor(
                text=affect_labels, return_tensors="pt", padding=True
            )
            affect_inputs = {k: v.to(device) for k, v in affect_inputs.items()}
            affect_features = clip_model.get_text_features(**affect_inputs)
            affect_features = affect_features / affect_features.norm(
                dim=-1, keepdim=True
            )

            # Calculate affect similarities
            affect_similarities = (100.0 * image_features @ affect_features.T).softmax(
                dim=-1
            )
            affect_values, affect_indices = affect_similarities[0].topk(1)

            # Get the most likely affect and convert to valence/arousal
            affect_scene = affect_labels[affect_indices[0]]

            # Map affect scenes to valence/arousal values
            if "happy" in affect_scene or "joyful" in affect_scene:
                valence, arousal = 0.8, 0.7
            elif "sad" in affect_scene or "melancholic" in affect_scene:
                valence, arousal = 0.2, 0.3
            elif "angry" in affect_scene or "aggressive" in affect_scene:
                valence, arousal = 0.3, 0.9
            elif "peaceful" in affect_scene or "calm" in affect_scene:
                valence, arousal = 0.7, 0.2
            elif "exciting" in affect_scene or "dynamic" in affect_scene:
                valence, arousal = 0.8, 0.8
            elif "boring" in affect_scene or "static" in affect_scene:
                valence, arousal = 0.4, 0.1
            elif "scary" in affect_scene or "tense" in affect_scene:
                valence, arousal = 0.1, 0.9
            else:
                # Default neutral
                valence, arousal = 0.5, 0.5

            # Return embedding (truncated for efficiency)
            embedding = (
                image_features[0].cpu().numpy().tolist()[:128]
            )  # First 128 dimensions

        return jsonify(
            {
                "topk": topk,
                "embedding": embedding,
                "dominant_color": dominant_color,
                "affect_valence": valence,
                "affect_arousal": arousal,
            }
        )

    except Exception as e:
        print(f"CLIP error: {e}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": f"CLIP processing failed: {str(e)}"}), 500


@app.route("/infer/whisper", methods=["POST"])
def infer_whisper():
    data = request.get_json(force=True)
    audio_b64 = data.get("audio_base64")
    if not audio_b64:
        return jsonify({"error": "missing audio_base64"}), 400

    print(f"Received audio data, length: {len(audio_b64)}")

    try:
        # Decode audio from base64
        try:
            audio_bytes = base64.b64decode(audio_b64.split(",")[-1])
            print(f"Decoded audio bytes, length: {len(audio_bytes)}")
        except Exception as e:
            print(f"Base64 decode error: {e}")
            return jsonify({"error": f"Invalid base64 audio data: {str(e)}"}), 400

        # Check if audio data is not empty
        if len(audio_bytes) == 0:
            return jsonify({"error": "Empty audio data"}), 400

        # Save to temporary file with proper audio format
        # Try different formats based on the data
        if audio_bytes.startswith(b"data:audio/webm"):
            suffix = ".webm"
        elif audio_bytes.startswith(b"data:audio/wav"):
            suffix = ".wav"
        else:
            suffix = ".webm"  # Default to webm for MediaRecorder

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_file:
            tmp_file.write(audio_bytes)
            tmp_path = tmp_file.name
            print(f"Saved audio to: {tmp_path} (format: {suffix})")

        try:
            # Transcribe with Whisper
            print("Starting Whisper transcription...")
            result = whisper_model.transcribe(tmp_path)
            print(f"Whisper result: {result}")

            transcript = result.get("text", "").strip()
            if not transcript:
                print("Warning: Empty transcript from Whisper")
                transcript = "No speech detected"

            # Note: Gateway will handle sending transcript to Sentience

            return jsonify(
                {
                    "transcript": transcript,
                    "confidence": result.get("confidence", 0.9),
                    "language": result.get("language", "en"),
                }
            )
        finally:
            # Clean up temporary file
            try:
                os.unlink(tmp_path)
                print(f"Cleaned up temp file: {tmp_path}")
            except:
                pass

    except Exception as e:
        print(f"Whisper error: {e}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": f"Whisper processing failed: {str(e)}"}), 500


if __name__ == "__main__":
    print("ML service starting on :8081")
    print("I am ML service")
    app.run(host="0.0.0.0", port=8081, debug=False)

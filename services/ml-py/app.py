from flask import Flask, jsonify, request
from flask_cors import CORS
import base64
import io
from PIL import Image
import sys

app = Flask(__name__)
CORS(app)


@app.route("/ping", methods=["GET"])
def ping():
    return jsonify(
        {"message": "I am ML service", "service": "ml-py", "status": "running"}
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

    # decode image
    img_bytes = base64.b64decode(b64.split(",")[-1])
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    # TODO: run real CLIP/OpenCLIP here.
    # Placeholder top-k to get the pipe flowing:
    topk = [
        {"label": "banana", "score": 0.83},
        {"label": "fruit", "score": 0.74},
        {"label": "yellow object", "score": 0.62},
    ]
    # optional: return a short embedding vector placeholder
    embedding = [0.1, 0.2, 0.3]

    return jsonify({"topk": topk, "embedding": embedding})


if __name__ == "__main__":
    print("ML service starting on :8081")
    print("I am ML service")
    app.run(host="0.0.0.0", port=8081, debug=True)

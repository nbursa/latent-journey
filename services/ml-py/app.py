from flask import Flask, jsonify, request
import sys

app = Flask(__name__)


@app.route("/ping", methods=["GET"])
def ping():
    return jsonify(
        {"message": "I am ML service", "service": "ml-py", "status": "running"}
    )


@app.route("/", methods=["GET"])
def root():
    return "I am ML service"


if __name__ == "__main__":
    print("ML service starting on :8081")
    print("I am ML service")
    app.run(host="0.0.0.0", port=8081, debug=True)

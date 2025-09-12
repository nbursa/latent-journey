import React from "react";

function App() {
  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "100vh",
        color: "white",
      }}
    >
      <h1>Hello latent-journey</h1>
      <p>I am UI</p>
      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "8px",
          backdropFilter: "blur(10px)",
        }}
      >
        <h2>Service Status</h2>
        <p>
          Gateway: <span style={{ color: "#4ade80" }}>Ready</span>
        </p>
        <p>
          ML Service: <span style={{ color: "#4ade80" }}>Ready</span>
        </p>
        <p>
          Sentience Service: <span style={{ color: "#4ade80" }}>Ready</span>
        </p>
      </div>
    </div>
  );
}

export default App;

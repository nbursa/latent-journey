import { useState, useRef, useCallback } from "react";
import { MediaRefs } from "../types";
import { useAppStore } from "../stores/appStore";

export const useMediaRecording = (onDataProcessed?: () => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get captures and actions from store
  const captures = useAppStore((state) => state.captures);
  const addCapture = useAppStore((state) => state.addCapture);
  const setCaptures = useAppStore((state) => state.setCaptures);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const refs: MediaRefs = {
    videoRef,
    canvasRef,
    mediaRecorderRef,
    audioChunksRef,
  };

  const snapAndSend = useCallback(async () => {
    setIsProcessing(true);

    const v = videoRef.current;
    const c = canvasRef.current;

    if (!v || !c || v.videoWidth === 0 || v.videoHeight === 0) {
      setIsProcessing(false);
      return;
    }

    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");

    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    ctx.drawImage(v, 0, 0, c.width, c.height);
    const b64 = c.toDataURL("image/jpeg");
    addCapture(b64); // Add capture to store

    try {
      const response = await fetch("/api/vision/frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: b64 }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();

      // Trigger memory event loading after successful vision processing
      if (onDataProcessed) {
        onDataProcessed();
      } else {
        console.log("No onDataProcessed callback provided");
      }
    } catch (error) {
      console.error("Error sending image:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [onDataProcessed]);

  const startRecording = useCallback(
    async (onStartAudioVisualization: (stream: MediaStream) => void) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        // Start audio visualization
        onStartAudioVisualization(stream);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm;codecs=opus",
          });

          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = reader.result as string;
            await sendAudioToAPI(base64);
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Error starting recording:", error);
      }
    },
    []
  );

  const stopRecording = useCallback(
    (onStopAudioVisualization: () => void) => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        onStopAudioVisualization();
      }
    },
    [isRecording]
  );

  const sendAudioToAPI = async (audioBase64: string) => {
    setIsProcessing(true);

    try {
      const response = await fetch("/api/speech/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_base64: audioBase64 }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();

      // Trigger memory event loading after successful speech processing
      if (onDataProcessed) {
        onDataProcessed();
      } else {
        console.log("No onDataProcessed callback provided");
      }
    } catch (error) {
      console.error("Error sending audio:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isRecording,
    isProcessing,
    captures,
    setCaptures,
    refs,
    snapAndSend,
    startRecording,
    stopRecording,
  };
};

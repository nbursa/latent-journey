import { useState, useRef, useCallback } from "react";
import { AudioVisualizationRefs } from "../types";

export const useAudioVisualization = () => {
  const [audioLevels, setAudioLevels] = useState<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startAudioVisualization = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVisualization = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);

          // Convert to normalized levels (0-1)
          const levels = Array.from(dataArray).map((value) => value / 255);
          setAudioLevels(levels);

          // Continue animation even when not recording
          animationFrameRef.current =
            requestAnimationFrame(updateVisualization);
        }
      };

      updateVisualization();
    } catch (error) {
      console.error("Error setting up audio visualization:", error);
    }
  }, []);

  const stopAudioVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setAudioLevels([]);
  }, []);

  const initializeIdleVisualization = useCallback(() => {
    setAudioLevels([]);
  }, []);

  const refs: AudioVisualizationRefs = {
    audioContextRef,
    analyserRef,
    animationFrameRef,
  };

  return {
    audioLevels,
    refs,
    startAudioVisualization,
    stopAudioVisualization,
    initializeIdleVisualization,
  };
};

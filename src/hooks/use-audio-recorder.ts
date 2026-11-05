"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export type RecordingStatus = "idle" | "permission" | "recording" | "stopped";

export const useAudioRecorder = () => {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDataUri, setAudioDataUri] = useState<string>("");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);

  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const getMicrophonePermission = useCallback(async () => {
    if ("MediaRecorder" in window) {
      try {
        setStatus("permission");
        const streamData = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        stream.current = streamData;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(streamData);
        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 256;
        source.connect(analyserNode);
        setAnalyser(analyserNode);

        setStatus("idle");
      } catch (err) {
        console.error(err);
        setStatus("idle");
        alert("Microphone permission denied.");
      }
    } else {
      alert("The MediaRecorder API is not supported in your browser.");
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!stream.current) {
      await getMicrophonePermission();
      // Use useEffect to start recording after stream is ready
      return;
    }

    setStatus("recording");
    const media = new MediaRecorder(stream.current, { mimeType: "audio/webm" });
    mediaRecorder.current = media;
    mediaRecorder.current.start();

    audioChunks.current = [];
    mediaRecorder.current.ondataavailable = (event) => {
      if (typeof event.data === "undefined") return;
      if (event.data.size === 0) return;
      audioChunks.current.push(event.data);
    };
  }, [getMicrophonePermission]);
  
  useEffect(() => {
    if (stream.current && status === 'permission') {
      startRecording();
    }
  }, [stream.current, status, startRecording]);


  const stopRecording = useCallback(() => {
    if (mediaRecorder.current) {
      setStatus("stopped");
      mediaRecorder.current.stop();

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, {
          type: "audio/webm",
        });
        setAudioBlob(blob);

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          setAudioDataUri(reader.result as string);
        };
        
        audioChunks.current = [];
        if (stream.current) {
          stream.current.getTracks().forEach(track => track.stop());
          stream.current = null;
          setAnalyser(null);
        }
      };
    }
  }, []);

  const resetRecording = useCallback(() => {
    setStatus("idle");
    setAudioBlob(null);
    setAudioDataUri("");
  }, []);

  return {
    status,
    audioDataUri,
    analyser,
    startRecording,
    stopRecording,
    resetRecording,
  };
};

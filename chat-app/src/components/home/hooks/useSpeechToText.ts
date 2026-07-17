import { useCallback, useEffect, useRef, useState } from "react";
import env from "../../../config/env.ts";
import { showErrorMessage } from "../../../utils/toast.util.ts";

type UseSpeechToTextOptions = {
  onTranscribed: (text: string) => void;
};

export const useSpeechToText = ({
  onTranscribed,
}: UseSpeechToTextOptions) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopMediaStream = useCallback(() => {
    const stream = mediaStreamRef.current;

    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (error) {
          console.warn("Không thể dừng media track", error);
        }
      });
    }

    mediaStreamRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    stopMediaStream();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    try {
      const recorder = new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start();
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      throw error;
    }
  }, [stopMediaStream]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise<Blob>((resolve, reject) => {
      const recorder = mediaRecorderRef.current;

      if (!recorder) {
        stopMediaStream();
        reject(new Error("Recorder is not initialized"));
        return;
      }

      const finishRecording = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, {
          type: mimeType,
        });

        mediaRecorderRef.current = null;
        stopMediaStream();
        resolve(blob);
      };

      recorder.onstop = finishRecording;
      recorder.onerror = (event) => {
        mediaRecorderRef.current = null;
        stopMediaStream();
        reject(new Error(`MediaRecorder error: ${event.type}`));
      };

      if (recorder.state === "inactive") {
        finishRecording();
        return;
      }

      recorder.stop();
      stopMediaStream();
    });
  }, [stopMediaStream]);

  const uploadAudio = useCallback(async () => {
    setIsProcessingVoice(true);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
    }, 30000);

    try {
      const blob = await stopRecording();
      const formData = new FormData();
      formData.append("audio_file", blob, "recording.webm");

      const response = await fetch(
        `${env.API_URL}/chat-service/api/v1/voice-to-text`,
        {
          method: "POST",
          body: formData,
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Voice API error: HTTP ${response.status}`);
      }

      const data = await response.json();
      onTranscribed(data.text ?? "");
    } catch (error: unknown) {
      console.error(error);

      if (error instanceof DOMException && error.name === "AbortError") {
        showErrorMessage("Hết thời gian xử lý giọng nói.");
      } else {
        showErrorMessage("Không thể chuyển giọng nói thành văn bản.");
      }
    } finally {
      window.clearTimeout(timeout);
      mediaRecorderRef.current = null;
      stopMediaStream();
      setIsRecording(false);
      setIsProcessingVoice(false);
    }
  }, [onTranscribed, stopMediaStream, stopRecording]);

  const handleRecording = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      showErrorMessage("Vui lòng đăng nhập để sử dụng tính năng thu âm.");
      return;
    }

    if (isProcessingVoice) {
      return;
    }

    try {
      if (!isRecording) {
        await startRecording();
        setIsRecording(true);
        return;
      }

      setIsRecording(false);
      await uploadAudio();
    } catch (error) {
      console.error(error);
      mediaRecorderRef.current = null;
      stopMediaStream();
      showErrorMessage("Không thể thu âm.");
      setIsRecording(false);
      setIsProcessingVoice(false);
    }
  }, [
    isProcessingVoice,
    isRecording,
    startRecording,
    stopMediaStream,
    uploadAudio,
  ]);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch (error) {
          console.warn("Không thể dừng recorder khi unmount", error);
        }
      }

      mediaRecorderRef.current = null;
      stopMediaStream();
    };
  }, [stopMediaStream]);

  return {
    isRecording,
    isProcessingVoice,
    handleRecording,
  };
};

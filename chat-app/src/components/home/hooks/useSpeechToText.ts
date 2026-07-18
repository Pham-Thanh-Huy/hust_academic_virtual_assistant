import { useCallback, useEffect, useRef, useState } from "react";
import env from "../../../config/env.ts";
import { showErrorMessage } from "../../../utils/toast.util.ts";

type UseSpeechToTextOptions = {
  onTranscribed: (text: string) => void;
};

const getSupportedMimeType = () => {
  const mimeTypes = [
    // Chrome / Edge / Firefox
    "audio/webm;codecs=opus",
    "audio/webm",

    // Safari
    "audio/mp4",
    "audio/aac",
  ];

  return mimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
};

const getFileExtension = (mimeType: string) => {
  if (mimeType.includes("webm")) {
    return "webm";
  }

  if (mimeType.includes("mp4")) {
    return "mp4";
  }

  if (mimeType.includes("aac")) {
    return "aac";
  }

  return "audio";
};

export const useSpeechToText = ({ onTranscribed }: UseSpeechToTextOptions) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopMediaStream = useCallback(() => {
    const stream = mediaStreamRef.current;

    if (!stream) {
      return;
    }

    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (error) {
        console.warn("Cannot stop media track", error);
      }
    });

    mediaStreamRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Browser không hỗ trợ microphone");
    }

    stopMediaStream();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    try {
      if (typeof MediaRecorder === "undefined") {
        throw new Error("MediaRecorder không được hỗ trợ");
      }

      const mimeType = getSupportedMimeType();

      if (!mimeType) {
        throw new Error("Không tìm thấy audio codec phù hợp");
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
      });

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start(1000);
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());

      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;

      throw error;
    }
  }, [stopMediaStream]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;

      if (!recorder) {
        reject(new Error("Recorder chưa khởi tạo"));
        return;
      }

      const finish = () => {
        const mimeType = recorder.mimeType || "audio/webm";

        const blob = new Blob(chunksRef.current, {
          type: mimeType,
        });

        mediaRecorderRef.current = null;

        // delay nhỏ giúp Safari flush data
        setTimeout(() => {
          stopMediaStream();
        }, 100);

        resolve(blob);
      };

      recorder.onstop = finish;

      recorder.onerror = () => {
        mediaRecorderRef.current = null;
        stopMediaStream();

        reject(new Error("MediaRecorder error"));
      };

      if (recorder.state === "inactive") {
        finish();
        return;
      }

      recorder.stop();
    });
  }, [stopMediaStream]);

  const uploadAudio = useCallback(async () => {
    setIsProcessingVoice(true);

    const controller = new AbortController();

    const timeout = window.setTimeout(() => controller.abort(), 30000);

    try {
      const blob = await stopRecording();

      if (blob.size === 0) {
        throw new Error("Audio rỗng");
      }

      const formData = new FormData();

      const extension = getFileExtension(blob.type);

      formData.append("audio_file", blob, `recording.${extension}`);

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
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      onTranscribed(data.text ?? "");
    } catch (error) {
      console.error(error);

      if (error instanceof DOMException && error.name === "AbortError") {
        showErrorMessage("Hết thời gian xử lý giọng nói.");
      } else {
        showErrorMessage("Không thể chuyển giọng nói thành văn bản.");
      }
    } finally {
      clearTimeout(timeout);

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

      setIsRecording(false);

      setIsProcessingVoice(false);

      showErrorMessage("Không thể thu âm.");
    }
  }, [
    isRecording,
    isProcessingVoice,
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
          console.warn(error);
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

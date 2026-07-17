import { useCallback, useEffect, useRef, useState } from "react";
import env from "../../../config/env.ts";
import { showErrorMessage } from "../../../utils/toast.util.ts";

export const useMessageVoice = () => {
  const [playingVoiceIndex, setPlayingVoiceIndex] = useState<number | null>(
    null,
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const voiceAbortRef = useRef<AbortController | null>(null);
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const voiceSessionRef = useRef(0);
  const activeSourceCountRef = useRef(0);
  const streamDoneRef = useRef(false);

  const stopCurrentVoice = useCallback(async () => {
    voiceSessionRef.current++;

    voiceAbortRef.current?.abort();
    voiceAbortRef.current = null;

    audioSourcesRef.current.forEach((source) => {
      try {
        source.stop(0);
      } catch (error) {
        console.warn("Không thể dừng audio source", error);
      }
    });

    audioSourcesRef.current = [];
    activeSourceCountRef.current = 0;
    nextPlayTimeRef.current = 0;

    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch (error) {
        console.warn("Không thể đóng AudioContext", error);
      }

      audioContextRef.current = null;
    }

    setPlayingVoiceIndex(null);
  }, []);

  const handleVoice = useCallback(
    async (index: number, messageId: string) => {
      if (playingVoiceIndex === index) {
        await stopCurrentVoice();
        return;
      }

      if (playingVoiceIndex != null) {
        await stopCurrentVoice();
      }

      const voiceSessionId = ++voiceSessionRef.current;
      streamDoneRef.current = false;
      activeSourceCountRef.current = 0;
      setPlayingVoiceIndex(index);

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({
          latencyHint: "interactive",
          sampleRate: 24000,
        });
      }

      const audioContext = audioContextRef.current;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      nextPlayTimeRef.current = audioContext.currentTime + 0.05;

      const controller = new AbortController();
      voiceAbortRef.current = controller;
      const token = localStorage.getItem("token");

      let pcmLeftover = new Uint8Array(0);
      let pcmQueue: Float32Array[] = [];
      let bufferedSamples = 0;
      let started = false;
      let firstBuffer = true;

      const minimumStartBuffer = 9600;

      const playPcmChunk = (base64: string) => {
        if (voiceSessionId !== voiceSessionRef.current) {
          return;
        }

        const binary = atob(base64);
        let bytes = new Uint8Array(binary.length);

        for (let index = 0; index < binary.length; index++) {
          bytes[index] = binary.charCodeAt(index);
        }

        if (pcmLeftover.length > 0) {
          const merged = new Uint8Array(pcmLeftover.length + bytes.length);
          merged.set(pcmLeftover);
          merged.set(bytes, pcmLeftover.length);
          bytes = merged;
        }

        const usableLength = bytes.length - (bytes.length % 2);
        pcmLeftover = bytes.slice(usableLength);

        if (usableLength === 0) {
          return;
        }

        const pcm16 = new Int16Array(
          bytes.buffer,
          bytes.byteOffset,
          usableLength / 2,
        );
        const float32 = new Float32Array(pcm16.length);

        for (let index = 0; index < pcm16.length; index++) {
          float32[index] = pcm16[index] / 32768;
        }

        pcmQueue.push(float32);
        bufferedSamples += float32.length;

        if (!started) {
          if (bufferedSamples < minimumStartBuffer) {
            return;
          }

          started = true;
        }

        const totalLength = pcmQueue.reduce(
          (sum, item) => sum + item.length,
          0,
        );
        const mergedPcm = new Float32Array(totalLength);
        let offset = 0;

        for (const item of pcmQueue) {
          mergedPcm.set(item, offset);
          offset += item.length;
        }

        pcmQueue = [];
        bufferedSamples = 0;

        if (firstBuffer) {
          const fadeSamples = Math.min(48, mergedPcm.length);

          for (let index = 0; index < fadeSamples; index++) {
            mergedPcm[index] *= index / fadeSamples;
          }

          firstBuffer = false;
        }

        const audioBuffer = audioContext.createBuffer(
          1,
          mergedPcm.length,
          24000,
        );
        audioBuffer.copyToChannel(mergedPcm, 0);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        audioSourcesRef.current.push(source);
        activeSourceCountRef.current++;

        source.onended = () => {
          audioSourcesRef.current = audioSourcesRef.current.filter(
            (item) => item !== source,
          );
          activeSourceCountRef.current--;

          if (
            streamDoneRef.current &&
            activeSourceCountRef.current === 0 &&
            voiceSessionId === voiceSessionRef.current
          ) {
            setPlayingVoiceIndex(null);
            nextPlayTimeRef.current = 0;
          }
        };

        if (nextPlayTimeRef.current < audioContext.currentTime) {
          nextPlayTimeRef.current = audioContext.currentTime + 0.02;
        }

        const startTime = Math.max(
          audioContext.currentTime + 0.02,
          nextPlayTimeRef.current,
        );

        source.start(startTime);
        nextPlayTimeRef.current = startTime + audioBuffer.duration;
      };

      try {
        const response = await fetch(
          `${env.API_URL}/chat-service/api/v1/chat-message/voice/${messageId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "text/event-stream",
            },
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No stream body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          if (voiceSessionId !== voiceSessionRef.current) {
            break;
          }

          const result = await reader.read();

          if (result.done) {
            break;
          }

          buffer += decoder.decode(result.value, {
            stream: true,
          });

          const events = buffer.split(/\r?\n\r?\n/);
          buffer = events.pop() ?? "";

          for (const event of events) {
            const lines = event.split(/\r?\n/);
            let eventType = "";
            let eventData = "";

            for (const line of lines) {
              if (line.startsWith("event:")) {
                eventType = line.substring(6).trim();
              }

              if (line.startsWith("data:")) {
                eventData = line.substring(5).trim();
              }
            }

            if (!eventData) {
              continue;
            }

            let data: {
              type?: string;
              audio?: string;
            } = {};

            try {
              data = JSON.parse(eventData);
            } catch (error) {
              console.warn("Invalid SSE JSON", error);
              continue;
            }

            if (
              eventType === "audio" &&
              data.type === "audio.chunk" &&
              data.audio
            ) {
              playPcmChunk(data.audio);
            }

            if (
              data.type === "speech.audio.done" &&
              voiceSessionId === voiceSessionRef.current
            ) {
              streamDoneRef.current = true;
              voiceAbortRef.current = null;

              if (activeSourceCountRef.current === 0) {
                setPlayingVoiceIndex(null);
                nextPlayTimeRef.current = 0;
              }
            }
          }
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Voice error", error);

        if (voiceSessionId === voiceSessionRef.current) {
          setPlayingVoiceIndex(null);
        }
      }
    },
    [playingVoiceIndex, stopCurrentVoice],
  );

  const handleVoiceClick = useCallback(
    (index: number, messageId?: string) => {
      if (!messageId) {
        showErrorMessage(
          "Tin nhắn chưa được đồng bộ ID. Vui lòng thử lại sau.",
        );
        return;
      }

      void handleVoice(index, messageId);
    },
    [handleVoice],
  );

  useEffect(() => {
    return () => {
      void stopCurrentVoice();
    };
  }, [stopCurrentVoice]);

  return {
    playingVoiceIndex,
    handleVoiceClick,
  };
};

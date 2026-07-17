import "./Chat.style.css";
import { SideBar } from "../../layouts/side-bar";
import { Header } from "../../layouts/header";
import { FiMic, FiMicOff, FiSend } from "react-icons/fi";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import env from "../../config/env.ts";
import { useNavigate, useParams } from "react-router-dom";
import {
  checkIsLoginUtil,
  getUsernameByToken,
} from "../../utils/authen.util.ts";
import { showErrorMessage } from "../../utils/toast.util.ts";
import { Square, Volume2 } from "lucide-react";

type Message = {
  id?: string;
  message: string;
  answer: string;
  streaming: boolean;
  chatAt: string;
  started: boolean;
};

type ActiveChatRequest = {
  requestKey: number;
  sessionId: string;
  question: string;
  baselineIds: Set<string>;
};

export const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [listMessage, setListMessage] = useState<Message[]>([]);
  const [disableSendMessage, setDisableSendMessage] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const shouldReconnect = useRef(true);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingSessionId = useRef<string | null>(null);
  const [sessionRefresh, setSessionRefresh] = useState(0);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false); // đang gọi STT

  const [playingVoiceIndex, setPlayingVoiceIndex] = useState<number | null>(
    null,
  );
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const voiceAbortRef = useRef<AbortController | null>(null);
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const voiceSessionRef = useRef(0);
  const activeSourceCountRef = useRef(0);
  const streamDoneRef = useRef(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const currentSessionIdRef = useRef<string | undefined>(id);
  const activeChatRequestRef = useRef<ActiveChatRequest | null>(null);
  const requestKeyRef = useRef(0);
  const skipNextRouteLoadRef = useRef<string | null>(null);
  const routeLoadVersionRef = useRef(0);

  //Xử lý text-to-speech
  const handleVoice = async (index: number, id: string) => {
    if (playingVoiceIndex === index) {
      await stopCurrentVoice();
      return;
    }

    if (playingVoiceIndex != null) {
      await stopCurrentVoice();
    }

    const sessionId = ++voiceSessionRef.current;

    streamDoneRef.current = false;
    activeSourceCountRef.current = 0;

    setPlayingVoiceIndex(index);

    if (audioContextRef.current == null) {
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

    const MIN_START_BUFFER = 9600; // 400ms

    const playPCMChunk = (base64: string) => {
      if (sessionId !== voiceSessionRef.current) {
        return;
      }

      const binary = atob(base64);

      let bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
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

      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }

      pcmQueue.push(float32);

      bufferedSamples += float32.length;

      if (!started) {
        if (bufferedSamples < MIN_START_BUFFER) {
          return;
        }

        started = true;
      }

      const totalLength = pcmQueue.reduce((sum, item) => sum + item.length, 0);

      const mergedPCM = new Float32Array(totalLength);

      let offset = 0;

      for (const item of pcmQueue) {
        mergedPCM.set(item, offset);

        offset += item.length;
      }

      pcmQueue = [];

      bufferedSamples = 0;

      // Fade 2ms tránh click, không làm mất âm đầu
      if (firstBuffer) {
        const fadeSamples = Math.min(48, mergedPCM.length);

        for (let i = 0; i < fadeSamples; i++) {
          mergedPCM[i] *= i / fadeSamples;
        }

        firstBuffer = false;
      }

      const audioBuffer = audioContext.createBuffer(1, mergedPCM.length, 24000);

      audioBuffer.copyToChannel(mergedPCM, 0);

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
          sessionId === voiceSessionRef.current
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
        `${env.API_URL}/chat-service/api/v1/chat-message/voice/${id}`,
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

      if (response.body == null) {
        throw new Error("No stream body");
      }

      const reader = response.body.getReader();

      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        if (sessionId !== voiceSessionRef.current) {
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

          if (eventData === "") {
            continue;
          }

          let data: {
            type?: string;
            audio?: string;
          } = {};

          try {
            data = JSON.parse(eventData);
          } catch (e) {
            console.warn("Invalid SSE JSON", e);

            continue;
          }

          if (
            eventType === "audio" &&
            data.type === "audio.chunk" &&
            data.audio != null
          ) {
            playPCMChunk(data.audio);
          }

          if (data.type === "speech.audio.done") {
            if (sessionId === voiceSessionRef.current) {
              streamDoneRef.current = true;

              voiceAbortRef.current = null;

              if (activeSourceCountRef.current === 0) {
                setPlayingVoiceIndex(null);

                nextPlayTimeRef.current = 0;
              }
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("Voice error", error);

      if (sessionId === voiceSessionRef.current) {
        setPlayingVoiceIndex(null);
      }
    }
  };

  const stopCurrentVoice = async () => {
    // kill session hiện tại
    voiceSessionRef.current++;
    // cancel SSE
    if (voiceAbortRef.current) {
      voiceAbortRef.current.abort();
      voiceAbortRef.current = null;
    }

    // kill audio nodes
    audioSourcesRef.current.forEach((source) => {
      try {
        source.stop(0);
      } catch (e) {
        console.log(e);
      }
    });

    audioSourcesRef.current = [];
    nextPlayTimeRef.current = 0;

    // destroy context
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch (e) {
        console.log(e);
      }
      audioContextRef.current = null;
    }
    setPlayingVoiceIndex(null);
  };

  const handleVoiceClick = (index: number, messageId?: string) => {
    if (!messageId) {
      showErrorMessage("Tin nhắn chưa được đồng bộ ID. Vui lòng thử lại sau.");
      return;
    }

    void handleVoice(index, messageId);
  };

  // Xử lý speech-to-text
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

  const startRecording = async () => {
    // Đảm bảo không còn stream cũ trước khi xin quyền thu âm mới.
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
  };

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

      // Dừng toàn bộ track ngay sau khi yêu cầu recorder dừng.
      // Đây là bước làm trình duyệt bỏ biểu tượng đang sử dụng microphone.
      stopMediaStream();
    });
  }, [stopMediaStream]);

  const uploadAudio = async () => {
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
      setMessageInput(data.text ?? "");
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
  };

  const handleRecording = async () => {
    if (!localStorage.getItem("token")) {
      showErrorMessage("Vui lòng đăng nhập để sử dụng tính năng thu âm.");
      return;
    }

    if (isProcessingVoice) return;

    try {
      if (!isRecording) {
        await startRecording();
        setIsRecording(true);
        return;
      }

      // Tắt giao diện thu âm ngay khi người dùng bấm dừng.
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
  };

  const normalizeMessage = useCallback((item: any): Message => {
    const rawId = item?.id;

    return {
      id:
        rawId == null || String(rawId).trim() === ""
          ? undefined
          : String(rawId),
      message: typeof item?.message === "string" ? item.message : "",
      answer: typeof item?.answer === "string" ? item.answer : "",
      streaming: Boolean(item?.streaming),
      chatAt: typeof item?.chatAt === "string" ? item.chatAt : "",
      started: Boolean(item?.started),
    };
  }, []);

  const fetchMessages = useCallback(
    async (sessionId: string): Promise<Message[]> => {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const params = new URLSearchParams({
        sessionId,
        sort: "chatAt,asc",
        // Tránh browser/proxy trả lại response GET cũ trong lúc đang polling.
        _ts: String(Date.now()),
      });

      const response = await fetch(
        `${env.API_URL}/chat-session-service/api/v1/list-message?${params}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Cache-Control": "no-cache, no-store, max-age=0",
            Pragma: "no-cache",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`List message API error: HTTP ${response.status}`);
      }

      const data = await response.json();
      const messages = data?.data?.content;

      if (!Array.isArray(messages)) {
        return [];
      }

      return messages.map(normalizeMessage);
    },
    [normalizeMessage],
  );

  const loadMessages = useCallback(
    async (sessionId: string) => {
      const messages = await fetchMessages(sessionId);
      setListMessage(messages);
      return messages;
    },
    [fetchMessages],
  );

  const refreshMessagesAfterDone = useCallback(
    async (request: ActiveChatRequest) => {
      const normalizedQuestion = request.question.trim();
      const maxAttempts = 16;
      let latestMessages: Message[] = [];

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Nếu đã có request mới thay thế request này thì bỏ response cũ.
        if (activeChatRequestRef.current?.requestKey !== request.requestKey) {
          throw new Error("Request đã bị thay thế bởi request khác");
        }

        latestMessages = await fetchMessages(request.sessionId);

        const newMessages = latestMessages.filter(
          (message) =>
            Boolean(message.id) &&
            !request.baselineIds.has(message.id as string),
        );

        // Ưu tiên đúng message vừa gửi. baselineIds giúp xử lý cả khi
        // người dùng gửi hai câu có cùng nội dung.
        const persistedMessage =
          [...newMessages]
            .reverse()
            .find(
              (message) =>
                message.message.trim() === normalizedQuestion &&
                Boolean(message.answer.trim()),
            ) ??
          [...newMessages]
            .reverse()
            .find((message) => Boolean(message.answer.trim()));

        if (persistedMessage?.id) {
          setListMessage(latestMessages);
          return latestMessages;
        }

        // WebSocket "done" đôi khi tới trước lúc transaction DB commit.
        // Khoảng chờ tăng dần, nhưng được giới hạn để không polling quá dày.
        const delay = Math.min(250 + attempt * 200, 1800);

        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, delay);
        });
      }

      // Không thay optimistic list bằng một response cũ không có message mới.
      throw new Error(
        "API list-message chưa trả về bản ghi mới có id sau khi chat hoàn thành",
      );
    },
    [fetchMessages],
  );

  useEffect(() => {
    currentSessionIdRef.current = id;

    if (!id) {
      routeLoadVersionRef.current++;
      setListMessage([]);
      setMessageInput("");
      return;
    }

    if (!checkIsLoginUtil()) {
      navigate("/");
      return;
    }

    // Sau chat đầu tiên, list đã được refresh đầy đủ trước khi navigate.
    // Không fetch thêm một lần nữa để response chậm/cũ ghi đè list có id.
    if (skipNextRouteLoadRef.current === id) {
      skipNextRouteLoadRef.current = null;
      return;
    }

    const loadVersion = ++routeLoadVersionRef.current;

    void fetchMessages(id)
      .then((messages) => {
        if (
          loadVersion === routeLoadVersionRef.current &&
          currentSessionIdRef.current === id
        ) {
          setListMessage(messages);
        }
      })
      .catch((error) => {
        console.error("Load messages error", error);
        showErrorMessage("Không thể tải danh sách tin nhắn.");
      });
  }, [id, fetchMessages, navigate]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [listMessage]);

  useEffect(() => {
    if (window.innerWidth > 768) setSidebarOpen(true);
    else setSidebarOpen(false);
  }, []);

  useEffect(() => {
    shouldReconnect.current = true;

    const connect = () => {
      const ws = new WebSocket(`${env.WEBSOCKET_URL}/api/v1/chats`);
      socketRef.current = ws;

      ws.onmessage = async (event) => {
        let data: {
          type?: string;
          data?: string;
        };

        try {
          data = JSON.parse(event.data);
        } catch (error) {
          console.error("Invalid WebSocket message", error);
          return;
        }

        if (data.type === "chunk") {
          setListMessage((prev) => {
            if (prev.length === 0) return prev;

            const messages = [...prev];
            const last = messages.length - 1;

            messages[last] = {
              ...messages[last],
              answer: messages[last].answer + (data.data ?? ""),
              started: false,
            };

            return messages;
          });

          return;
        }

        if (data.type !== "done") return;

        // Tắt trạng thái streaming trước, nhưng nút voice vẫn chưa hiện
        // vì optimistic message chưa có id.
        setListMessage((prev) => {
          if (prev.length === 0) return prev;

          const messages = [...prev];
          const last = messages.length - 1;

          messages[last] = {
            ...messages[last],
            streaming: false,
            started: false,
          };

          return messages;
        });

        const request = activeChatRequestRef.current;
        const isNewSession = pendingSessionId.current != null;

        if (!request) {
          console.error("Không tìm thấy request đang chờ sau sự kiện done");
          setDisableSendMessage(false);
          return;
        }

        // Phát tín hiệu refresh Sidebar ngay khi WebSocket báo done.
        // SideBar sẽ tự polling list-session cho tới khi metadata thật sự đổi.
        setSessionRefresh((prev) => prev + 1);

        try {
          // Sau MỖI lần chat xong, luôn gọi lại toàn bộ API list-message.
          // Chỉ kết thúc khi API xuất hiện một ID mới không có trong baseline.
          await refreshMessagesAfterDone(request);

          currentSessionIdRef.current = request.sessionId;

          if (isNewSession) {
            pendingSessionId.current = null;
            skipNextRouteLoadRef.current = request.sessionId;

            navigate(`/chat/${request.sessionId}`, {
              replace: true,
            });
          }
        } catch (error) {
          console.error("Refresh messages after done error", error);
          showErrorMessage(
            "Câu trả lời đã hoàn thành nhưng máy chủ chưa trả về ID tin nhắn.",
          );
        } finally {
          if (activeChatRequestRef.current?.requestKey === request.requestKey) {
            activeChatRequestRef.current = null;
          }

          setDisableSendMessage(false);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error", error);
      };

      ws.onclose = () => {
        socketRef.current = null;

        if (shouldReconnect.current) {
          reconnectTimer.current = window.setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect.current = false;

      if (reconnectTimer.current != null) {
        window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }

      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [navigate, refreshMessagesAfterDone]);

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
      void stopCurrentVoice();
    };
  }, [stopMediaStream]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const initSession = async (token: string, firstMessage: string) => {
    const username = getUsernameByToken(token);

    try {
      const body = {
        username,
        firstMessage,
      };

      const response = await fetch(
        `${env.API_URL}/chat-session-service/api/v1/init-session`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        throw new Error(`Init session API error: HTTP ${response.status}`);
      }

      const data = await response.json();
      return data?.data?.id as string | undefined;
    } catch (error) {
      console.error("Init session error", error);
      return null;
    }
  };

  const sendSocketMessage = (payload: {
    model: string;
    question: string;
    sessionId: string;
  }) => {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket chưa kết nối");
    }

    socket.send(JSON.stringify(payload));
  };

  const rollbackOptimisticMessage = () => {
    setListMessage((prev) => prev.slice(0, -1));
  };

  const sendMessage = async () => {
    if (!checkIsLoginUtil()) {
      setDisableSendMessage(true);
      showErrorMessage("Vui lòng login để sử dụng tính năng hỏi đáp học phần!");
      setMessageInput("");

      window.setTimeout(() => {
        setDisableSendMessage(false);
      }, 3000);

      return;
    }

    const currentMessage = messageInput.trim();

    if (!currentMessage || disableSendMessage) return;

    setMessageInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }

    setDisableSendMessage(true);

    const firstMessage = !id;
    const token = localStorage.getItem("token");

    if (!token) {
      showErrorMessage("Vui lòng login lại");
      setDisableSendMessage(false);
      return;
    }

    let optimisticMessageAdded = false;

    try {
      let sessionId: string;
      let baselineMessages: Message[];

      if (firstMessage) {
        const initializedSessionId = await initSession(token, currentMessage);

        if (!initializedSessionId) {
          throw new Error("Không tạo được session");
        }

        sessionId = initializedSessionId;
        baselineMessages = [];
        pendingSessionId.current = sessionId;
      } else {
        if (!id) {
          throw new Error("Không tìm thấy session id hiện tại");
        }

        sessionId = id;

        // Đồng bộ lại server ngay trước khi gửi để baseline ID luôn chính xác,
        // kể cả lần refresh trước từng bị chậm hoặc người dùng vừa đổi route.
        baselineMessages = await fetchMessages(sessionId);
        setListMessage(baselineMessages);
      }

      const request: ActiveChatRequest = {
        requestKey: ++requestKeyRef.current,
        sessionId,
        question: currentMessage,
        baselineIds: new Set(
          baselineMessages
            .map((message) => message.id)
            .filter((messageId): messageId is string => Boolean(messageId)),
        ),
      };

      activeChatRequestRef.current = request;
      currentSessionIdRef.current = sessionId;

      setListMessage((prev) => [
        ...prev,
        {
          message: currentMessage,
          answer: "",
          streaming: true,
          chatAt: new Date().toISOString(),
          started: true,
        },
      ]);
      optimisticMessageAdded = true;

      sendSocketMessage({
        model: "gpt-4o-mini",
        question: currentMessage,
        sessionId,
      });
    } catch (error) {
      console.error("Send message error", error);
      pendingSessionId.current = null;
      activeChatRequestRef.current = null;

      if (optimisticMessageAdded) {
        rollbackOptimisticMessage();
      }

      showErrorMessage("Không thể gửi tin nhắn. Vui lòng thử lại.");
      setDisableSendMessage(false);
    }
  };

  return (
    <div id="main-container" className={sidebarOpen ? "sidebar-open" : ""}>
      <div id="main-sidebar" className={sidebarOpen ? "open" : "closed"}>
        <SideBar refreshSession={sessionRefresh} sessionId={id} />
      </div>

      {sidebarOpen && isMobile && (
        <div className="overlay" onClick={toggleSidebar} />
      )}

      <div
        id="main"
        className={sidebarOpen ? "dim" : ""}
        onClick={() => {
          if (window.innerWidth < 768 && sidebarOpen) toggleSidebar();
        }}
      >
        <Header onToggleSidebar={toggleSidebar} />

        <div
          className="main__box-chat flex flex-col overflow-hidden bg-white h-dvh"
          style={{ height: "100dvh" }}
        >
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 md:px-0"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {listMessage.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-5 sm:px-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                  Tra cứu học phần HUST
                </h1>
                <p className="text-sm text-gray-500 mb-6">
                  Nhập mã môn học hoặc tên môn để bắt đầu
                </p>

                <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
                  <img src="/hust-logo.svg" className="w-5 h-5" />
                  <span className="text-sm text-gray-600">
                    Ví dụ: IT3180, Cấu trúc dữ liệu...
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-5xl mx-auto px-3 sm:px-5 md:px-6 py-4 space-y-5">
                {listMessage.map((msg, index) => (
                  <div key={msg.id ?? `pending-${index}`} className="space-y-4">
                    <div className="flex justify-end">
                      <div className="bg-[rgb(154,0,31)] text-white px-4 py-3 rounded-2xl rounded-br-md shadow-sm max-w-[90%] md:max-w-[70%] break-words">
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.message}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`relative w-full md:w-fit max-w-full md:max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-md ${!msg.streaming ? "pr-12" : ""}`}
                    >
                      {!msg.streaming && msg.id && (
                        <button
                          onClick={() => handleVoiceClick(index, msg.id)}
                          className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${playingVoiceIndex === index ? "bg-gradient-to-br from-[rgb(154,0,31)] to-red-700 text-white shadow-[0_0_0_4px_rgba(154,0,31,0.15),0_4_12px_rgba(154,0,31,0.35)] scale-105" : "bg-white text-gray-400 border border-gray-200 shadow-sm hover:text-[rgb(154,0,31)] hover:border-[rgb(154,0,31)] hover:shadow-md hover:scale-105"}`}
                          title={
                            playingVoiceIndex === index
                              ? "Dừng đọc"
                              : "Nghe câu trả lời"
                          }
                        >
                          {playingVoiceIndex === index ? (
                            <div className="relative flex items-center justify-center">
                              <span className="absolute w-5 h-5 rounded-full bg-white/20 animate-ping" />
                              <Square
                                size={13}
                                fill="currentColor"
                                className="relative"
                              />
                            </div>
                          ) : (
                            <Volume2 size={16} />
                          )}
                        </button>
                      )}

                      <div className="text-[15px] leading-7 text-gray-800 prose prose-sm max-w-none prose-pre:bg-gray-900 prose-pre:text-white break-words">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ children }) => (
                              <div className="table-scroll w-full my-3 overflow-x-auto">
                                <table className="border border-gray-300 border-separate border-spacing-0 min-w-full md:min-w-[800px]">
                                  {children}
                                </table>
                              </div>
                            ),
                            th: ({ ...props }) => (
                              <th
                                className="border-r border-b border-gray-300 bg-gray-100 px-3 py-2 text-left whitespace-nowrap"
                                {...props}
                              />
                            ),
                            td: ({ ...props }) => (
                              <td
                                className="border-r border-b border-gray-300 px-3 py-2"
                                {...props}
                              />
                            ),
                            tr: ({ ...props }) => <tr {...props} />,
                          }}
                        >
                          {msg.answer}
                        </ReactMarkdown>
                      </div>
                      {msg.started && (
                        <div className="flex gap-1 mt-2">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          <div
            className="border-t border-gray-100 bg-white px-3 sm:px-4 pt-3 pb-3"
            style={{
              paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
            }}
          >
            <div className="flex items-end gap-2 w-full max-w-4xl mx-auto">
              {isRecording ? (
                <div className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-red-50 via-red-100 to-red-50 border border-red-200 flex items-center justify-center gap-4 shadow-sm">
                  <div className="flex items-center gap-1 h-8">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <span
                        key={i}
                        className="w-1.5 rounded-full bg-[rgb(154,0,31)] animate-wave"
                        style={{ animationDelay: `${i * 0.08}s` }}
                      />
                    ))}
                  </div>

                  <span className="text-sm font-medium text-[rgb(154,0,31)] animate-pulse">
                    Đang thu âm...
                  </span>
                </div>
              ) : isProcessingVoice ? (
                <div className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-red-50 via-red-100 to-red-50 border border-red-200 flex items-center justify-center gap-3 shadow-sm">
                  <svg
                    className="h-5 w-5 animate-spin text-[rgb(154,0,31)]"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="opacity-20"
                    />
                    <path
                      d="M22 12a10 10 0 0 0-10-10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                  </svg>

                  <span className="text-sm font-medium text-[rgb(154,0,31)] animate-pulse">
                    Đang xử lý giọng nói...
                  </span>
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={messageInput}
                  placeholder="Nhập câu hỏi..."
                  className="flex-1 min-w-0 px-4 py-3 text-base border border-gray-200 rounded-2xl focus:outline-none focus:border-[rgb(154,0,31)] shadow-md resize-none overflow-y-auto max-h-[240px] scroll-hidden"
                  style={{ fontSize: 16 }}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(
                      e.target.scrollHeight,
                      240,
                    )}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
              )}

              <button
                onClick={sendMessage}
                disabled={
                  isRecording || isProcessingVoice || !messageInput.trim()
                }
                className="flex-shrink-0 p-3 rounded-2xl bg-[rgb(154,0,31)] text-white hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
              >
                <FiSend size={18} />
              </button>

              <button
                type="button"
                onClick={handleRecording}
                disabled={isProcessingVoice}
                className={`flex-shrink-0 p-3 rounded-2xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRecording
                    ? "bg-red-600 text-white scale-110 shadow-red-300"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {isRecording ? <FiMicOff size={18} /> : <FiMic size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

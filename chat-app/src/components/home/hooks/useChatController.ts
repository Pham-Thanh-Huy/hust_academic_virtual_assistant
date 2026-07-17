import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { NavigateFunction } from "react-router-dom";
import { checkIsLoginUtil } from "../../../utils/authen.util.ts";
import { showErrorMessage } from "../../../utils/toast.util.ts";
import {
  fetchMessages,
  initSession,
  waitForPersistedMessage,
} from "../api/chat.api.ts";
import type { ActiveChatRequest, Message } from "../chat.types.ts";
import { useChatSocket } from "./useChatSocket.ts";

type UseChatControllerOptions = {
  sessionId?: string;
  navigate: NavigateFunction;
};

type UseChatControllerResult = {
  listMessage: Message[];
  setListMessage: Dispatch<SetStateAction<Message[]>>;
  disableSendMessage: boolean;
  sessionRefresh: number;
  sendMessage: (message: string) => Promise<void>;
};

export const useChatController = ({
  sessionId,
  navigate,
}: UseChatControllerOptions): UseChatControllerResult => {
  const [listMessage, setListMessage] = useState<Message[]>([]);
  const [disableSendMessage, setDisableSendMessage] = useState(false);
  const [sessionRefresh, setSessionRefresh] = useState(0);

  const pendingSessionIdRef = useRef<string | null>(null);
  const currentSessionIdRef = useRef<string | undefined>(sessionId);
  const activeChatRequestRef = useRef<ActiveChatRequest | null>(null);
  const requestKeyRef = useRef(0);
  const skipNextRouteLoadRef = useRef<string | null>(null);
  const routeLoadVersionRef = useRef(0);

  useEffect(() => {
    currentSessionIdRef.current = sessionId;

    if (!sessionId) {
      routeLoadVersionRef.current++;
      setListMessage([]);
      return;
    }

    if (!checkIsLoginUtil()) {
      navigate("/");
      return;
    }

    if (skipNextRouteLoadRef.current === sessionId) {
      skipNextRouteLoadRef.current = null;
      return;
    }

    const loadVersion = ++routeLoadVersionRef.current;

    void fetchMessages(sessionId)
      .then((messages) => {
        if (
          loadVersion === routeLoadVersionRef.current &&
          currentSessionIdRef.current === sessionId
        ) {
          setListMessage(messages);
        }
      })
      .catch((error) => {
        console.error("Load messages error", error);
        showErrorMessage("Không thể tải danh sách tin nhắn.");
      });
  }, [navigate, sessionId]);

  const handleChunk = useCallback((chunk: string) => {
    const request = activeChatRequestRef.current;

    if (!request || currentSessionIdRef.current !== request.sessionId) {
      return;
    }

    setListMessage((previousMessages) => {
      if (previousMessages.length === 0) {
        return previousMessages;
      }

      const messages = [...previousMessages];
      const lastIndex = messages.length - 1;

      messages[lastIndex] = {
        ...messages[lastIndex],
        answer: messages[lastIndex].answer + chunk,
        started: false,
      };

      return messages;
    });
  }, []);

  const handleDone = useCallback(async () => {
    const request = activeChatRequestRef.current;
    const isNewSession = pendingSessionIdRef.current != null;

    if (!request) {
      console.error("Không tìm thấy request đang chờ sau sự kiện done");
      setDisableSendMessage(false);
      return;
    }

    if (currentSessionIdRef.current === request.sessionId) {
      setListMessage((previousMessages) => {
        if (previousMessages.length === 0) {
          return previousMessages;
        }

        const messages = [...previousMessages];
        const lastIndex = messages.length - 1;

        messages[lastIndex] = {
          ...messages[lastIndex],
          streaming: false,
          started: false,
        };

        return messages;
      });
    }

    setSessionRefresh((previousValue) => previousValue + 1);

    try {
      const persistedMessages = await waitForPersistedMessage(
        request,
        () =>
          activeChatRequestRef.current?.requestKey === request.requestKey,
      );

      if (currentSessionIdRef.current === request.sessionId) {
        setListMessage(persistedMessages);
      }

      if (isNewSession && currentSessionIdRef.current === request.sessionId) {
        pendingSessionIdRef.current = null;
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
  }, [navigate]);

  const { sendSocketMessage } = useChatSocket({
    onChunk: handleChunk,
    onDone: handleDone,
  });

  const rollbackOptimisticMessage = useCallback(() => {
    setListMessage((previousMessages) => previousMessages.slice(0, -1));
  }, []);

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      if (!checkIsLoginUtil()) {
        setDisableSendMessage(true);
        showErrorMessage(
          "Vui lòng login để sử dụng tính năng hỏi đáp học phần!",
        );

        window.setTimeout(() => {
          setDisableSendMessage(false);
        }, 3000);

        return;
      }

      const currentMessage = rawMessage.trim();

      if (!currentMessage || disableSendMessage) {
        return;
      }

      setDisableSendMessage(true);

      const firstMessage = !sessionId;
      const token = localStorage.getItem("token");

      if (!token) {
        showErrorMessage("Vui lòng login lại");
        setDisableSendMessage(false);
        return;
      }

      let optimisticMessageAdded = false;

      try {
        let activeSessionId: string;
        let baselineMessages: Message[];

        if (firstMessage) {
          const initializedSessionId = await initSession(token, currentMessage);

          if (!initializedSessionId) {
            throw new Error("Không tạo được session");
          }

          activeSessionId = initializedSessionId;
          baselineMessages = [];
          pendingSessionIdRef.current = activeSessionId;
        } else {
          if (!sessionId) {
            throw new Error("Không tìm thấy session id hiện tại");
          }

          activeSessionId = sessionId;
          baselineMessages = await fetchMessages(activeSessionId);
          setListMessage(baselineMessages);
        }

        const request: ActiveChatRequest = {
          requestKey: ++requestKeyRef.current,
          sessionId: activeSessionId,
          question: currentMessage,
          baselineIds: new Set(
            baselineMessages
              .map((message) => message.id)
              .filter(
                (messageId): messageId is string => Boolean(messageId),
              ),
          ),
        };

        activeChatRequestRef.current = request;
        currentSessionIdRef.current = activeSessionId;

        setListMessage((previousMessages) => [
          ...previousMessages,
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
          sessionId: activeSessionId,
        });
      } catch (error) {
        console.error("Send message error", error);
        pendingSessionIdRef.current = null;
        activeChatRequestRef.current = null;

        if (optimisticMessageAdded) {
          rollbackOptimisticMessage();
        }

        showErrorMessage("Không thể gửi tin nhắn. Vui lòng thử lại.");
        setDisableSendMessage(false);
      }
    },
    [disableSendMessage, rollbackOptimisticMessage, sendSocketMessage, sessionId],
  );

  return {
    listMessage,
    setListMessage,
    disableSendMessage,
    sessionRefresh,
    sendMessage,
  };
};

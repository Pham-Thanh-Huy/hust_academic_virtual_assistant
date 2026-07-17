import { useCallback, useEffect, useRef } from "react";
import env from "../../../config/env.ts";
import type { ChatSocketPayload } from "../chat.types.ts";

type UseChatSocketOptions = {
  onChunk: (chunk: string) => void;
  onDone: () => void | Promise<void>;
};

export const useChatSocket = ({
  onChunk,
  onDone,
}: UseChatSocketOptions) => {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(true);
  const onChunkRef = useRef(onChunk);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onChunkRef.current = onChunk;
  }, [onChunk]);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    shouldReconnectRef.current = true;

    const connect = () => {
      const socket = new WebSocket(`${env.WEBSOCKET_URL}/api/v1/chats`);
      socketRef.current = socket;

      socket.onmessage = (event) => {
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
          onChunkRef.current(data.data ?? "");
          return;
        }

        if (data.type === "done") {
          void onDoneRef.current();
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error", error);
      };

      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }

        if (shouldReconnectRef.current) {
          reconnectTimerRef.current = window.setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      shouldReconnectRef.current = false;

      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  const sendSocketMessage = useCallback((payload: ChatSocketPayload) => {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket chưa kết nối");
    }

    socket.send(JSON.stringify(payload));
  }, []);

  return {
    sendSocketMessage,
  };
};

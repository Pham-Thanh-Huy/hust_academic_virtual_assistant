import env from "../../../config/env.ts";
import { getUsernameByToken } from "../../../utils/authen.util.ts";
import type { ActiveChatRequest, Message } from "../chat.types.ts";

const normalizeMessage = (item: unknown): Message => {
  const raw = item as Record<string, unknown> | null;
  const rawId = raw?.id;

  return {
    id:
      rawId == null || String(rawId).trim() === ""
        ? undefined
        : String(rawId),
    message: typeof raw?.message === "string" ? raw.message : "",
    answer: typeof raw?.answer === "string" ? raw.answer : "",
    streaming: Boolean(raw?.streaming),
    chatAt: typeof raw?.chatAt === "string" ? raw.chatAt : "",
    started: Boolean(raw?.started),
  };
};

export const fetchMessages = async (sessionId: string): Promise<Message[]> => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Không tìm thấy token đăng nhập");
  }

  const params = new URLSearchParams({
    sessionId,
    sort: "chatAt,asc",
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
};

export const initSession = async (
  token: string,
  firstMessage: string,
): Promise<string | null> => {
  const username = getUsernameByToken(token);

  try {
    const response = await fetch(
      `${env.API_URL}/chat-session-service/api/v1/init-session`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          firstMessage,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Init session API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    const sessionId = data?.data?.id;

    return sessionId ? String(sessionId) : null;
  } catch (error) {
    console.error("Init session error", error);
    return null;
  }
};

export const waitForPersistedMessage = async (
  request: ActiveChatRequest,
  isRequestActive: () => boolean,
): Promise<Message[]> => {
  const normalizedQuestion = request.question.trim();
  const maxAttempts = 16;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (!isRequestActive()) {
      throw new Error("Request đã bị thay thế bởi request khác");
    }

    const latestMessages = await fetchMessages(request.sessionId);
    const newMessages = latestMessages.filter(
      (message) =>
        Boolean(message.id) &&
        !request.baselineIds.has(message.id as string),
    );

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
      return latestMessages;
    }

    const delay = Math.min(250 + attempt * 200, 1800);

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, delay);
    });
  }

  throw new Error(
    "API list-message chưa trả về bản ghi mới có id sau khi chat hoàn thành",
  );
};

import "./SideBar.style.css";
import { FaPlus, FaRegComment, FaSearch, FaTrashAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { jwtDecode } from "jwt-decode";
import env from "../../config/env.ts";
import Env from "../../config/env.ts";

type Session = {
  id: string;
  title: string;
  status: string;
  username: string;
  lastMessageAt: string;
  totalMessage: number;
  createdAt: string;
};

type SideBarProps = {
  refreshSession: number;
  sessionId?: string;
};

type TokenPayload = {
  username?: string;
};

const sleep = (delay: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, delay);
  });

const normalizeSession = (item: unknown): Session | null => {
  if (typeof item !== "object" || item === null) {
    return null;
  }

  const raw = item as Record<string, unknown>;
  const rawId = raw.id;

  if (rawId == null || String(rawId).trim() === "") {
    return null;
  }

  return {
    id: String(rawId),
    title: typeof raw.title === "string" ? raw.title : "Cuộc trò chuyện",
    status: typeof raw.status === "string" ? raw.status : "",
    username: typeof raw.username === "string" ? raw.username : "",
    lastMessageAt:
      typeof raw.lastMessageAt === "string" ? raw.lastMessageAt : "",
    totalMessage:
      typeof raw.totalMessage === "number"
        ? raw.totalMessage
        : Number(raw.totalMessage ?? 0),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
  };
};

/**
 * Dùng các trường có thể thay đổi sau mỗi lần chat để nhận biết
 * list-session mới hay vẫn là response cũ.
 */
const createSessionFingerprint = (sessions: Session[]) =>
  sessions
    .map((session) =>
      [
        session.id,
        session.title,
        session.status,
        session.lastMessageAt,
        session.totalMessage,
      ].join(":"),
    )
    .join("|");

export const SideBar = ({ refreshSession, sessionId }: SideBarProps) => {
  const navigate = useNavigate();

  const [listSession, setListSession] = useState<Session[]>([]);
  const [word, setWord] = useState("");

  const listSessionRef = useRef<Session[]>([]);
  const requestVersionRef = useRef(0);
  const previousRefreshSessionRef = useRef(refreshSession);

  const token = localStorage.getItem("token");
  const isLogin = Boolean(token);


  const [username, setUsername] = useState("")
  const [fullName, setFullName] = useState("")

  useEffect(() => {
    listSessionRef.current = listSession;
  }, [listSession]);

  const logout = () => {
    requestVersionRef.current += 1;
    localStorage.removeItem("token");
    navigate(0);
  };

  const fetchListSession = useCallback(
    async (
      currentToken: string,
      username: string,
      searchWord: string,
      signal: AbortSignal,
    ): Promise<Session[]> => {
      const params = new URLSearchParams({
        username,
        // Chống browser/proxy cache response GET cũ.
        _ts: String(Date.now()),
      });

      if (searchWord.trim()) {
        params.set("word", searchWord.trim());
      }

      const response = await fetch(
        `${env.API_URL}/chat-session-service/api/v1/list-session?${params.toString()}`,
        {
          method: "GET",
          signal,
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${currentToken}`,
            "Cache-Control": "no-cache, no-store, max-age=0",
            Pragma: "no-cache",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`List session API error: HTTP ${response.status}`);
      }

      const result = await response.json();

      // Hỗ trợ cả hai dạng response:
      // data: Session[] hoặc data: { content: Session[] }
      const rawSessions = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.data?.content)
          ? result.data.content
          : [];

      return rawSessions
        .map(normalizeSession)
        .filter((item: Session | null): item is Session => item !== null);
    },
    [],
  );


  useEffect(() => {
    const refreshWasTriggered =
      refreshSession !== previousRefreshSessionRef.current;

    previousRefreshSessionRef.current = refreshSession;

    if (!isLogin || !token) {
      requestVersionRef.current += 1;
      setListSession([]);
      return;
    }

    let username = "";

    try {
      const decoded = jwtDecode<TokenPayload>(token);
      username = decoded.username?.trim() ?? "";
      setUsername(username)
    } catch (error) {
      console.error("Không thể đọc username từ token", error);
      setListSession([]);
      return;
    }

    if (!username) {
      setListSession([]);
      return;
    }

    fetch(`${Env.API_URL}/user-service/api/v1/get-user-by-username?username=${username}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
      },
    })
        .then((res) => res.json())
        .then((data) => {
          const firstName = data.data.firstName || "";
          const lastName = data.data.lastName || "";

          const fullName = `${lastName} ${firstName} `.trim();

          setFullName(fullName);
        })
        .catch((error) => {
          console.error("Get user info failed:", error);
        });

    const controller = new AbortController();
    const requestVersion = ++requestVersionRef.current;
    const searchWord = word.trim();
    const baselineFingerprint = createSessionFingerprint(
      listSessionRef.current,
    );

    // Search cần debounce; refresh sau chat thì chạy ngay.
    const startDelay = searchWord ? 500 : 0;

    const timer = window.setTimeout(() => {
      void (async () => {
        const shouldPollForUpdatedSession =
          refreshWasTriggered && searchWord === "";

        // Khi chat vừa xong, list-message và list-session có thể commit
        // lệch nhau. Poll cho tới khi metadata session thực sự thay đổi.
        const maxAttempts = shouldPollForUpdatedSession ? 15 : 1;
        let latestSessions: Session[] = [];

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            latestSessions = await fetchListSession(
              token,
              username,
              searchWord,
              controller.signal,
            );
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
              return;
            }

            console.error("Không thể tải list session", error);

            // Với lần refresh sau chat, lỗi tạm thời vẫn được retry.
            if (attempt < maxAttempts - 1) {
              await sleep(Math.min(300 + attempt * 200, 1500));
              continue;
            }

            return;
          }

          // Bỏ response thuộc request cũ khi người dùng đổi từ khóa
          // hoặc component phát sinh một lượt fetch mới.
          if (
            controller.signal.aborted ||
            requestVersion !== requestVersionRef.current
          ) {
            return;
          }

          const latestFingerprint = createSessionFingerprint(latestSessions);

          // Luôn render response mới nhất. Nếu server vẫn trả dữ liệu cũ,
          // vòng lặp phía dưới sẽ tiếp tục polling.
          setListSession(latestSessions);

          if (
            !shouldPollForUpdatedSession ||
            latestFingerprint !== baselineFingerprint
          ) {
            return;
          }

          if (attempt < maxAttempts - 1) {
            await sleep(Math.min(300 + attempt * 200, 1500));
          }
        }

        // Hết số lần polling vẫn giữ response mới nhất thay vì giữ state cũ.
        if (
          !controller.signal.aborted &&
          requestVersion === requestVersionRef.current
        ) {
          setListSession(latestSessions);
        }
      })();
    }, startDelay);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [word, isLogin, token, refreshSession, fetchListSession]);

  const newChat = () => {
    navigate("/");
  };

  return (
    <div className="sidebar-container flex flex-col h-full bg-white">
      <div className="logo px-4 py-5 border-b border-gray-100">
        <img className="logo__img" src="/hust-logo.svg" alt="logo" />

        <div className="logo__text">
          <h1 className="text-[15px] font-bold text-gray-800">
            HUST Assistant
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Trợ lý ảo hỏi đáp học phần
          </p>
        </div>
      </div>

      <div className="history-chat flex-1 flex flex-col min-h-0">
        <div className="px-3 py-3 space-y-3 border-b border-gray-100 shrink-0">
          <button
            onClick={newChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[rgb(154,0,31)] text-white font-semibold text-sm shadow-sm hover:shadow-md hover:brightness-110 active:scale-95 transition-all"
          >
            <FaPlus size={12} />
            Cuộc trò chuyện mới
          </button>

          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
              isLogin
                ? "bg-white border-gray-200 focus-within:border-[rgb(154,0,31)]"
                : "bg-gray-50 border-gray-100 opacity-60"
            }`}
          >
            <FaSearch size={12} className="text-gray-400" />

            <input
              disabled={!isLogin}
              value={word}
              onChange={(event) => setWord(event.target.value)}
              className="w-full text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
              placeholder="Tìm kiếm lịch sử chat..."
            />
          </div>
        </div>

        <div className="history-chat__list-history flex-1 min-h-0 overflow-y-auto px-2 py-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
            Lịch sử hội thoại
          </h3>

          {!isLogin && (
            <div className="h-full flex items-center justify-center px-4">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-700">
                  Chưa đăng nhập
                </div>

                <div className="text-xs text-gray-400 mt-1">
                  Đăng nhập để xem lịch sử trò chuyện
                </div>
              </div>
            </div>
          )}

          {isLogin && listSession.length === 0 && (
            <div className="h-full flex items-center justify-center px-4">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-700">
                  Chưa có đoạn hội thoại nào
                </div>

                <div className="text-xs text-gray-400 mt-1">
                  Hãy bắt đầu một cuộc trò chuyện mới
                </div>
              </div>
            </div>
          )}

          {isLogin && listSession.length > 0 && (
            <div className="flex flex-col gap-1">
              {listSession.map((session) => {
                const isActive = session.id === sessionId;

                return (
                  <div
                    key={session.id}
                    onClick={() => navigate(`/chat/${session.id}`)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition ${
                      isActive ? "bg-red-50" : "hover:bg-red-50"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <FaRegComment
                        size={12}
                        className={`mt-1 ${
                          isActive
                            ? "text-[rgb(154,0,31)]"
                            : "text-gray-400 group-hover:text-[rgb(154,0,31)]"
                        }`}
                      />

                      <p
                        className={`text-sm text-left line-clamp-2 flex-1 transition ${
                          isActive
                            ? "text-[rgb(154,0,31)]"
                            : "text-gray-700 group-hover:text-[rgb(154,0,31)]"
                        }`}
                      >
                        {session.title}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="ml-2 p-2 rounded-md transition hover:text-red-600 hover:bg-red-100 opacity-0 group-hover:opacity-100 text-gray-400"
                      onClick={(event) => {
                        event.stopPropagation();
                        // TODO: delete session
                      }}
                    >
                      <FaTrashAlt size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 px-3 py-3">
        {isLogin ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <img
                className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                src="/avatar.jpg"
                alt="avatar"
              />

              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">
                  {fullName}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {username}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition active:scale-95"
              onClick={logout}
            >
              Đăng xuất
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="w-full py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[rgb(154,0,31)] to-[rgb(120,0,25)] rounded-xl shadow-md hover:shadow-lg hover:brightness-110 active:scale-95 transition"
            onClick={() => navigate("/login")}
          >
            Đăng nhập
          </button>
        )}
      </div>
    </div>
  );
};

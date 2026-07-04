import "./Chat.style.css";
import { SideBar } from "../../layouts/side-bar";
import { Header } from "../../layouts/header";
import { FiSend } from "react-icons/fi";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import env from "../../config/env.ts";

type Message = {
    messageId?: string;
    question: string;
    answer: string;
    streaming: boolean;
};

export const Chat = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const [messageInput, setMessageInput] = useState("");
    const [listMessage, setListMessage] = useState<Message[]>([]);
    const [disableSendMessage, setDisableSendMessage] = useState(false);

    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<number | null>(null);
    const shouldReconnect = useRef(true);

    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    /* =========================
       DETECT MOBILE
    ========================= */
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    /* =========================
       AUTO SIDEBAR STATE
    ========================= */
    useEffect(() => {
        if (!isMobile) setSidebarOpen(true);
        else setSidebarOpen(false);
    }, [isMobile]);

    /* =========================
       AUTO SCROLL
    ========================= */
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [listMessage]);

    /* =========================
       WEBSOCKET
    ========================= */
    const connect = () => {
        const ws = new WebSocket(`${env.WEBSOCKET_URL}/api/v1/chats`);
        socketRef.current = ws;

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "chunk") {
                setListMessage((prev) => {
                    const messages = [...prev];
                    const last = messages.length - 1;

                    messages[last] = {
                        ...messages[last],
                        answer: messages[last].answer + data.data,
                        streaming: true,
                    };

                    return messages;
                });
            }

            if (data.type === "done") {
                setDisableSendMessage(false);

                setListMessage((prev) => {
                    const messages = [...prev];
                    const last = messages.length - 1;

                    messages[last].streaming = false;
                    return messages;
                });
            }
        };

        ws.onclose = () => {
            socketRef.current = null;
            if (shouldReconnect.current) {
                reconnectTimer.current = window.setTimeout(connect, 3000);
            }
        };
    };

    useEffect(() => {
        connect();
        return () => {
            shouldReconnect.current = false;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            socketRef.current?.close();
        };
    }, []);

    /* =========================
       TOGGLE SIDEBAR
    ========================= */
    const toggleSidebar = () => setSidebarOpen((p) => !p);

    /* =========================
       SEND MESSAGE
    ========================= */
    const sendMessage = () => {
        if (!messageInput.trim()) return;
        if (disableSendMessage) return;

        setDisableSendMessage(true);

        socketRef.current?.send(
            JSON.stringify({
                model: "gpt-4o-mini",
                question: messageInput,
            })
        );

        setListMessage((prev) => [
            ...prev,
            {
                question: messageInput,
                answer: "",
                streaming: true,
            },
        ]);

        setMessageInput("");

        if (textareaRef.current) {
            textareaRef.current.style.height = "40px";
        }
    };

    return (
        <div id="main-container">

            {/* SIDEBAR */}
            <div id="main-sidebar" className={sidebarOpen ? "open" : "closed"}>
                <SideBar />
            </div>

            {/* BACKDROP MOBILE */}
            {isMobile && sidebarOpen && (
                <div
                    className="sidebar-backdrop"
                    onClick={toggleSidebar}
                />
            )}

            {/* MAIN */}
            <div
                id="main"
                className={sidebarOpen && isMobile ? "dim" : ""}
            >

                <Header onToggleSidebar={toggleSidebar} />

                <div className="main__box-chat">

                    {/* CHAT AREA */}
                    <div className="flex-1 overflow-y-auto">

                        {listMessage.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center px-6">
                                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                                    Tra cứu học phần HUST
                                </h1>
                                <p className="text-sm text-gray-500">
                                    Nhập mã môn học hoặc tên môn để bắt đầu
                                </p>
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

                                {listMessage.map((msg, index) => (
                                    <div key={index} className="space-y-4">

                                        {/* USER */}
                                        <div className="flex justify-end">
                                            <div className="bg-[rgb(154,0,31)] text-white px-4 py-3 rounded-2xl max-w-[80%]">
                                                {msg.question}
                                            </div>
                                        </div>

                                        {/* BOT */}
                                        <div className="flex items-start gap-3">

                                            <img src="/hust-logo.svg" className="w-8 h-8" />

                                            <div className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl max-w-[80%]">

                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.answer}
                                                </ReactMarkdown>

                                            </div>

                                        </div>

                                    </div>
                                ))}

                                <div ref={chatEndRef} />
                            </div>
                        )}
                    </div>

                    {/* INPUT */}
                    <div className="border-t border-gray-100 bg-white px-4 py-3">

                        <form
                            className="flex items-end gap-3 max-w-3xl mx-auto"
                            onSubmit={(e) => {
                                e.preventDefault();
                                sendMessage();
                            }}
                        >
                            <textarea
                                ref={textareaRef}
                                value={messageInput}
                                rows={1}
                                placeholder="Nhập câu hỏi..."
                                onChange={(e) => {
                                    setMessageInput(e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height =
                                        Math.min(e.target.scrollHeight, 120) + "px";
                                }}
                                className="flex-1 px-4 py-3 border rounded-2xl resize-none"
                            />

                            <button
                                disabled={!messageInput.trim()}
                                className="p-3 bg-[rgb(154,0,31)] text-white rounded-2xl disabled:opacity-40"
                            >
                                <FiSend size={18} />
                            </button>

                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
};
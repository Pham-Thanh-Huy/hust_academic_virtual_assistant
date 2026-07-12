import "./Chat.style.css";
import {SideBar} from "../../layouts/side-bar";
import {Header} from "../../layouts/header";
import {FiSend} from "react-icons/fi";
import {useEffect, useRef, useState} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import env from "../../config/env.ts";
import {useNavigate, useParams} from "react-router-dom";
import {checkIsLoginUtil, getUsernameByToken} from "../../utils/authen.util.ts";
import {showErrorMessage} from "../../utils/toast.util.ts";
import Env from "../../config/env.ts";

type Message = {
    messageId?: string;
    message: string;
    answer: string;
    streaming: boolean;
    chatAt: string
};

export const Chat = () => {
    const {id} = useParams();
    const navigate = useNavigate()
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


    useEffect(() => {
        if (!id) {
            setListMessage([]);
            setMessageInput("");
            return;
        }

        if(!checkIsLoginUtil()){
            navigate("/")
            return;
        }

        const params = new URLSearchParams({
            sessionId: id
        });
        const token = localStorage.getItem("token");
        fetch(`${Env.API_URL}/chat-session-service/api/v1/list-message?${params}&sort=chatAt,asc`,{
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        })
            .then(res => res.json())
            .then(data => {
                setListMessage(data.data.content);
            });

    }, [id]);


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
        chatEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, [listMessage]);

    useEffect(() => {
        if (window.innerWidth > 768) setSidebarOpen(true);
        else setSidebarOpen(false);
    }, []);

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
                        streaming: false,
                    };

                    return messages;
                });
            }

            if (data.type === "done") {
                setDisableSendMessage(false);

                setListMessage((prev) => {
                    const messages = [...prev];
                    const last = messages.length - 1;

                    messages[last] = {
                        ...messages[last],

                    };

                    return messages;
                });

                if (pendingSessionId.current) {
                    setSessionRefresh(sessionRefresh + 1)
                    setTimeout(() => {
                        navigate(`/chat/${pendingSessionId.current}`);
                        pendingSessionId.current = null;
                    }, 500);
                }
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

    const toggleSidebar = () => setSidebarOpen((p) => !p);

    const initSession = async (token: string, firstMessage: string) => {
        const username = getUsernameByToken(token);

        try {
            const body = {
                "username": username,
                "firstMessage": firstMessage
            }
            const response = await fetch(
                `${env.API_URL}/chat-session-service/api/v1/init-session`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                }
            );

            if (!response.ok) {
                throw new Error("Có lỗi khi gọi API");
            }

            const data = await response.json();

            return data.data.id;
        } catch (e) {
            console.log(`ERROR-WHEN-LIST-SESSION ${e}`);
            return null;
        }
    };

    const sendMessage =  async () => {
        if (!checkIsLoginUtil()) {
            setDisableSendMessage(true)
            showErrorMessage("Vui lòng login để sử dụng sử dụng tính năng hỏi đáp học phần!")
            setMessageInput("")
            setTimeout(() => {
                setDisableSendMessage(false);
            }, 3000);

            return;
        }

        if (!messageInput.trim()) return;

        if (disableSendMessage) return;

        const firstMessage = listMessage.length === 0;

        if(firstMessage){
            setListMessage((prev) => [
                ...prev,
                {
                    message: messageInput,
                    answer: "",
                    streaming: true,
                    chatAt: "hihi",
                },
            ]);

            const token = localStorage.getItem("token");

            if (!token) {
                showErrorMessage("Vui lòng login lại");
                return;
            }
            const sessionId = await initSession(token, messageInput)

            if(!sessionId){
                showErrorMessage("Không tạo được session")
            }

            pendingSessionId.current = sessionId;
            // Nếu firstMessage sẽ sending kiểu khác
            socketRef.current?.send(
                JSON.stringify({
                    model: "gpt-4o-mini",
                    question: messageInput,
                    "sessionId": sessionId
                })
            );



            return
        }

        setDisableSendMessage(true);

        socketRef.current?.send(
            JSON.stringify({
                model: "gpt-4o-mini",
                question: messageInput,
                "sessionId": id
            })
        );

        setListMessage((prev) => [
            ...prev,
            {
                message: messageInput,
                answer: "",
                streaming: true,
                chatAt: "hihi",
            },
        ]);

        setMessageInput("");

        // reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "40px";
        }
    };

    return (
        <div id="main-container" className={sidebarOpen ? "sidebar-open" : ""}>
            <div id="main-sidebar" className={sidebarOpen ? "open" : "closed"}>
                <SideBar refreshSession={sessionRefresh} sessionId={id}/>
            </div>
            {sidebarOpen && isMobile && (
                <div
                    className="overlay"
                    onClick={toggleSidebar}
                />
            )}

            <div
                id="main"
                className={sidebarOpen ? "dim" : ""}
                onClick={() => {
                    if (window.innerWidth < 768 && sidebarOpen) toggleSidebar();
                }}
            >
                <Header onToggleSidebar={toggleSidebar}/>

                <div className="main__box-chat flex flex-col h-full">

                    {/* ================= CHAT AREA ================= */}
                    <div className="flex-1 overflow-y-auto">

                        {listMessage.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center px-6">
                                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                                    Tra cứu học phần HUST
                                </h1>

                                <p className="text-sm text-gray-500 mb-6">
                                    Nhập mã môn học hoặc tên môn để bắt đầu
                                </p>

                                <div
                                    className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
                                    <img src="/hust-logo.svg" className="w-5 h-5"/>
                                    <span className="text-sm text-gray-600">
                                        Ví dụ: IT3180, Cấu trúc dữ liệu...
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

                                {listMessage.map((msg, index) => (
                                    <div key={index} className="space-y-4">

                                        {/* USER */}
                                        <div className="flex justify-end">
                                            <div
                                                className="bg-[rgb(154,0,31)] text-white px-4 py-3 rounded-2xl rounded-br-md max-w-[80%] shadow-sm">
                                                <p className="text-sm whitespace-pre-wrap break-words break-all">
                                                    {msg.message}
                                                </p>
                                            </div>
                                        </div>

                                        {/* BOT */}
                                        <div className="flex items-start gap-3">
                                            {/*<img*/}
                                            {/*    src="/hust-logo.svg"*/}
                                            {/*    alt="bot"*/}
                                            {/*    className="w-8 h-8 object-contain bg-white"*/}
                                            {/*/>*/}

                                            <div
                                                className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md max-w-[80%]">
                                                <div
                                                    className="text-sm text-gray-800 prose prose-sm max-w-none prose-pre:bg-gray-900
                                                    prose-pre:text-white prose-table:border prose-table:border-gray-200">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            table: ({...props}) => (
                                                                <table
                                                                    className="border-collapse border border-gray-300 w-full my-2" {...props} />
                                                            ),
                                                            th: ({...props}) => (
                                                                <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left" {...props} />
                                                            ),
                                                            td: ({...props}) => (
                                                                <td className="border border-gray-300 px-2 py-1" {...props} />
                                                            ),
                                                            tr: ({...props}) => (
                                                                <tr className="border border-gray-300" {...props} />
                                                            ),
                                                        }}
                                                    >
                                                        {msg.answer}
                                                    </ReactMarkdown>
                                                </div>

                                                {msg.streaming && (
                                                    <div className="flex gap-1 mt-2">
                                                        <span
                                                            className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                                        <span
                                                            className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]"></span>
                                                        <span
                                                            className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]"></span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                ))}

                                <div ref={chatEndRef}/>
                            </div>
                        )}
                    </div>

                    {/* ================= INPUT (AUTO RESIZE TEXTAREA) ================= */}
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
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();   // chặn xuống dòng
                                        sendMessage();
                                    }
                                }}
                                className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-2xl
                                focus:outline-none focus:border-[rgb(154,0,31)] shadow-sm
                                resize-none overflow-y-auto max-h-[120px] scroll-hidden"
                            />

                            <button
                                disabled={disableSendMessage || !messageInput.trim()}
                                className="p-3 rounded-2xl bg-[rgb(154,0,31)] text-white
                                           hover:brightness-110 active:scale-95
                                           disabled:opacity-40 disabled:cursor-not-allowed
                                           transition-all shadow-md"
                            >
                                <FiSend size={18}/>
                            </button>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
};
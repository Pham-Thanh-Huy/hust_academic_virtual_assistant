import "./Chat.style.css";
import {SideBar} from "../../layouts/side-bar";
import {Header} from "../../layouts/header";
import {FiMic, FiMicOff, FiSend} from "react-icons/fi";
import {useEffect, useRef, useState} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import env from "../../config/env.ts";
import Env from "../../config/env.ts";
import {useNavigate, useParams} from "react-router-dom";
import {checkIsLoginUtil, getUsernameByToken} from "../../utils/authen.util.ts";
import {showErrorMessage} from "../../utils/toast.util.ts";
import { Volume2, Square } from "lucide-react";

type Message = {
    messageId?: string; message: string; answer: string; streaming: boolean; chatAt: string
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

    const [isRecording, setIsRecording] = useState(false);

    const [playingVoiceIndex, setPlayingVoiceIndex] = useState(null);

    const handleVoice = (index: any, text: any) => {
        if (playingVoiceIndex === index) {
            // TODO: gọi BE stop voice
            setPlayingVoiceIndex(null);
            return;
        }

        // TODO: gọi BE tạo voice từ text
        console.log("Generate voice:", text);

        setPlayingVoiceIndex(index);
    };

    useEffect(() => {
        if (!id) {
            setListMessage([]);
            setMessageInput("");
            return;
        }

        if (!checkIsLoginUtil()) {
            navigate("/")
            return;
        }

        const params = new URLSearchParams({
            sessionId: id
        });
        const token = localStorage.getItem("token");
        fetch(`${Env.API_URL}/chat-session-service/api/v1/list-message?${params}&sort=chatAt,asc`, {
            headers: {
                "Authorization": `Bearer ${token}`, "Content-Type": "application/json"
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
        if (window.innerWidth > 768) setSidebarOpen(true); else setSidebarOpen(false);
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
                        ...messages[last], answer: messages[last].answer + data.data, streaming: false,
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
                "username": username, "firstMessage": firstMessage
            }
            const response = await fetch(`${env.API_URL}/chat-session-service/api/v1/init-session`, {
                method: "POST", headers: {
                    Authorization: `Bearer ${token}`, "Content-Type": "application/json",
                }, body: JSON.stringify(body),
            });

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

    const sendMessage = async () => {
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

        if (firstMessage) {
            setListMessage((prev) => [...prev, {
                message: messageInput, answer: "", streaming: true, chatAt: "hihi",
            },]);

            const token = localStorage.getItem("token");

            if (!token) {
                showErrorMessage("Vui lòng login lại");
                return;
            }
            const sessionId = await initSession(token, messageInput)

            if (!sessionId) {
                showErrorMessage("Không tạo được session")
            }

            pendingSessionId.current = sessionId;
            // Nếu firstMessage sẽ sending kiểu khác
            socketRef.current?.send(JSON.stringify({
                model: "gpt-4o-mini", question: messageInput, "sessionId": sessionId
            }));


            return
        }

        setDisableSendMessage(true);

        socketRef.current?.send(JSON.stringify({
            model: "gpt-4o-mini", question: messageInput, "sessionId": id
        }));

        setListMessage((prev) => [...prev, {
            message: messageInput, answer: "", streaming: true, chatAt: "hihi",
        },]);

        setMessageInput("");

        // reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "40px";
        }
    };

    return (<div id="main-container" className={sidebarOpen ? "sidebar-open" : ""}>
        <div id="main-sidebar" className={sidebarOpen ? "open" : "closed"}>
            <SideBar refreshSession={sessionRefresh} sessionId={id}/>
        </div>
        {sidebarOpen && isMobile && (<div
            className="overlay"
            onClick={toggleSidebar}
        />)}

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
                            <h1 className="text-2xl font-bold text-gray-800 mb-2">Tra cứu học phần HUST</h1>
                            <p className="text-sm text-gray-500 mb-6">Nhập mã môn học hoặc tên môn để bắt đầu</p>
                            <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
                                <img src="/hust-logo.svg" className="w-5 h-5" />
                                <span className="text-sm text-gray-600">Ví dụ: IT3180, Cấu trúc dữ liệu...</span>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
                            {listMessage.map((msg,index)=>(
                                <div key={index} className="space-y-4">

                                    {/* USER */}
                                    <div className="flex justify-end">
                                        <div className="bg-[rgb(154,0,31)] text-white px-4 py-3 rounded-2xl rounded-br-md max-w-[80%] shadow-sm">
                                            <p className="text-sm whitespace-pre-wrap break-words">
                                                {msg.message}
                                            </p>
                                        </div>
                                    </div>

                                    {/* BOT */}
                                    <div className="relative bg-gray-50 border border-gray-100 px-4 py-3 pr-12 rounded-2xl rounded-bl-md max-w-[80%] shadow-sm">
                                        <button
                                            onClick={() => handleVoice(index, msg.answer)}
                                            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                                                playingVoiceIndex === index
                                                    ? "bg-gradient-to-br from-[rgb(154,0,31)] to-red-700 text-white shadow-[0_0_0_4px_rgba(154,0,31,0.15),0_4px_12px_rgba(154,0,31,0.35)] scale-105"
                                                    : "bg-white text-gray-400 border border-gray-200 shadow-sm hover:text-[rgb(154,0,31)] hover:border-[rgb(154,0,31)] hover:shadow-md hover:scale-105"
                                            }`}
                                            title={playingVoiceIndex === index ? "Dừng đọc" : "Nghe câu trả lời"}
                                        >
                                            {playingVoiceIndex === index ? (
                                                <div className="relative flex items-center justify-center">
                                                    <span className="absolute w-5 h-5 rounded-full bg-white/20 animate-ping"/>
                                                    <Square size={13} fill="currentColor" className="relative"/>
                                                </div>
                                            ) : (
                                                <Volume2 size={16}/>
                                            )}
                                        </button>

                                        <div className="text-sm text-gray-800 prose prose-sm max-w-none prose-pre:bg-gray-900 prose-pre:text-white">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    table: ({children}) => (
                                                        <div className="table-scroll w-full my-3 overflow-x-auto">
                                                            <table className="border-separate border-spacing-0 border border-gray-300 min-w-[800px]">
                                                                {children}
                                                            </table>
                                                        </div>
                                                    ),
                                                    th: ({...props}) => (
                                                        <th
                                                            className="border-r border-b border-gray-300 bg-gray-100 px-3 py-2 text-left whitespace-nowrap"
                                                            {...props}
                                                        />
                                                    ),
                                                    td: ({...props}) => (
                                                        <td
                                                            className="border-r border-b border-gray-300 px-3 py-2"
                                                            {...props}
                                                        />
                                                    ),
                                                    tr: ({...props}) => (
                                                        <tr {...props}/>
                                                    ),
                                                }}
                                            >
                                                {msg.answer}
                                            </ReactMarkdown>
                                        </div>

                                        {msg.streaming && (
                                            <div className="flex gap-1 mt-2">
                                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"/>
                                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]"/>
                                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]"/>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            ))}
                            <div ref={chatEndRef}/>
                        </div>
                    )}
                </div>

                {/* ================= INPUT (AUTO RESIZE TEXTAREA) ================= */}
                {/* ================= INPUT ================= */}
                <div className="border-t border-gray-100 bg-white px-4 py-3">
                    <div className="flex items-end gap-3 max-w-3xl mx-auto">
                        {isRecording ? (<div
                            className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-red-50 via-red-100 to-red-50 border border-red-200 flex items-center justify-center gap-4 shadow-sm">
                            <div className="flex items-center gap-1 h-8">
                                {Array.from({length: 12}).map((_, i) => (<span
                                    key={i}
                                    className="w-1.5 rounded-full bg-[rgb(154,0,31)] animate-wave"
                                    style={{animationDelay: `${i * 0.08}s`}}
                                />))}
                            </div>

                            <span className="text-sm font-medium text-[rgb(154,0,31)] animate-pulse">
                                     Đang thu âm...
                            </span>
                        </div>) : (<textarea
                            rows={1}
                            placeholder="Nhập câu hỏi..."
                            onChange={(e) => {
                                setMessageInput(e.target.value);

                                e.target.style.height = "auto";
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
                            }}
                            disabled={isRecording}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:border-[rgb(154,0,31)] shadow-md resize-none overflow-y-auto max-h-[240px] scroll-hidden"
                        />)}

                        <button
                            disabled={isRecording}
                            onClick={sendMessage}
                            className="p-3 rounded-2xl bg-[rgb(154,0,31)] text-white hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all shadow-md"
                        >
                            <FiSend size={18}/>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsRecording(!isRecording)}
                            className={`
                            p-3 rounded-2xl transition-all shadow-md
                            ${isRecording ? "bg-red-600 text-white scale-110 shadow-red-300" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}
                            `}
                        >
                            {isRecording ? <FiMicOff size={18}/> : <FiMic size={18}/>}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    </div>);
};
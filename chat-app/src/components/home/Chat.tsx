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
import {Square, Volume2} from "lucide-react";

type Message = {
    id?: string; message: string; answer: string; streaming: boolean; chatAt: string; started: boolean;
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
    const [playingVoiceIndex, setPlayingVoiceIndex] = useState<number | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const nextPlayTimeRef = useRef<number>(0);
    const voiceAbortRef = useRef<AbortController | null>(null);
    const audioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const voiceSessionRef = useRef(0);
    const activeSourceCountRef = useRef(0);
    const streamDoneRef = useRef(false);


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
                latencyHint: "interactive", sampleRate: 24000
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

            const pcm16 = new Int16Array(bytes.buffer, bytes.byteOffset, usableLength / 2);

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
                audioSourcesRef.current = audioSourcesRef.current.filter((item) => item !== source);

                activeSourceCountRef.current--;

                if (streamDoneRef.current && activeSourceCountRef.current === 0 && sessionId === voiceSessionRef.current) {
                    setPlayingVoiceIndex(null);

                    nextPlayTimeRef.current = 0;
                }
            };

            if (nextPlayTimeRef.current < audioContext.currentTime) {
                nextPlayTimeRef.current = audioContext.currentTime + 0.02;
            }

            const startTime = Math.max(audioContext.currentTime + 0.02, nextPlayTimeRef.current);

            source.start(startTime);

            nextPlayTimeRef.current = startTime + audioBuffer.duration;
        };
        try {
            const response = await fetch(`http://hust-trolyao-gateway.io.vn/chat-service/api/v1/chat-message/voice/${id}`, {
                method: "GET", headers: {
                    Authorization: `Bearer ${token}`,

                    Accept: "text/event-stream"
                },

                signal: controller.signal
            });

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
                    stream: true
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
                        type?: string; audio?: string;
                    } = {};

                    try {
                        data = JSON.parse(eventData);
                    } catch (e) {
                        console.warn("Invalid SSE JSON", e);

                        continue;
                    }

                    if (eventType === "audio" && data.type === "audio.chunk" && data.audio != null) {
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
        audioSourcesRef.current.forEach(source => {
            try {
                source.stop(0);
            } catch (e) {
                console.log(e)
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
                        ...messages[last], answer: messages[last].answer + data.data, started: false,
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
                        ...messages[last], streaming: false
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
            setDisableSendMessage(true);
            showErrorMessage("Vui lòng login để sử dụng tính năng hỏi đáp học phần!");
            setMessageInput("");

            setTimeout(() => {
                setDisableSendMessage(false);
            }, 3000);

            return;
        }

        if (!messageInput.trim()) return;

        if (disableSendMessage) return;

        const currentMessage = messageInput;

        // clear input ngay khi gửi
        setMessageInput("");

        // reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "40px";
        }

        setDisableSendMessage(true);

        const firstMessage = listMessage.length === 0;

        // add message user vào UI trước
        setListMessage((prev) => [...prev, {
            message: currentMessage, answer: "", streaming: true, chatAt: "hihi", started: true
        }]);

        if (firstMessage) {
            const token = localStorage.getItem("token");

            if (!token) {
                showErrorMessage("Vui lòng login lại");
                setDisableSendMessage(false);
                return;
            }

            try {
                const sessionId = await initSession(token, currentMessage);

                if (!sessionId) {
                    showErrorMessage("Không tạo được session");
                    setDisableSendMessage(false);
                    return;
                }

                pendingSessionId.current = sessionId;

                socketRef.current?.send(JSON.stringify({
                    model: "gpt-4o-mini", question: currentMessage, sessionId
                }));
            } catch (error) {
                console.error("init session error:", error);
                showErrorMessage("Có lỗi khi tạo session");
                setDisableSendMessage(false);
            }

            return;
        }

        // các message sau dùng session id hiện tại
        socketRef.current?.send(JSON.stringify({
            model: "gpt-4o-mini", question: currentMessage, sessionId: id
        }));
    };

    return (<div id="main-container" className={sidebarOpen ? "sidebar-open" : ""}>
        <div id="main-sidebar" className={sidebarOpen ? "open" : "closed"}>
            <SideBar refreshSession={sessionRefresh} sessionId={id}/>
        </div>

        {sidebarOpen && isMobile && (<div className="overlay" onClick={toggleSidebar}/>)}

        <div id="main" className={sidebarOpen ? "dim" : ""} onClick={() => {
            if (window.innerWidth < 768 && sidebarOpen) toggleSidebar();
        }}>
            <Header onToggleSidebar={toggleSidebar}/>

            <div className="main__box-chat flex flex-col overflow-hidden bg-white h-dvh" style={{height: "100dvh"}}>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 md:px-0"
                     style={{WebkitOverflowScrolling: "touch"}}>

                    {listMessage.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center px-5 sm:px-8">
                            <h1 className="text-2xl font-bold text-gray-800 mb-2">Tra cứu học phần HUST</h1>
                            <p className="text-sm text-gray-500 mb-6">Nhập mã môn học hoặc tên môn để bắt đầu</p>

                            <div
                                className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
                                <img src="/hust-logo.svg" className="w-5 h-5"/>
                                <span className="text-sm text-gray-600">Ví dụ: IT3180, Cấu trúc dữ liệu...</span>
                            </div>
                        </div>) : (

                        <div className="w-full max-w-5xl mx-auto px-3 sm:px-5 md:px-6 py-4 space-y-5">

                            {listMessage.map((msg, index) => (

                                <div key={index} className="space-y-4">

                                    <div className="flex justify-end">
                                        <div
                                            className="bg-[rgb(154,0,31)] text-white px-4 py-3 rounded-2xl rounded-br-md shadow-sm max-w-[90%] md:max-w-[70%] break-words">
                                            <p className="text-sm whitespace-pre-wrap break-words">
                                                {msg.message}
                                            </p>
                                        </div>
                                    </div>


                                    <div
                                        className={`relative w-full md:w-fit max-w-full md:max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-md ${!msg.streaming ? "pr-12" : ""}`}>

                                        {!msg.streaming && (<button
                                                onClick={() => handleVoice(index, msg.id as string)}
                                                className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${playingVoiceIndex === index ? "bg-gradient-to-br from-[rgb(154,0,31)] to-red-700 text-white shadow-[0_0_0_4px_rgba(154,0,31,0.15),0_4_12px_rgba(154,0,31,0.35)] scale-105" : "bg-white text-gray-400 border border-gray-200 shadow-sm hover:text-[rgb(154,0,31)] hover:border-[rgb(154,0,31)] hover:shadow-md hover:scale-105"}`}
                                                title={playingVoiceIndex === index ? "Dừng đọc" : "Nghe câu trả lời"}
                                            >
                                                {playingVoiceIndex === index ? (
                                                    <div className="relative flex items-center justify-center">
                                                        <span
                                                            className="absolute w-5 h-5 rounded-full bg-white/20 animate-ping"/>
                                                        <Square size={13} fill="currentColor" className="relative"/>
                                                    </div>) : (<Volume2 size={16}/>)}
                                            </button>)}

                                        <div
                                            className="text-[15px] leading-7 text-gray-800 prose prose-sm max-w-none prose-pre:bg-gray-900 prose-pre:text-white break-words">

                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    table: ({children}) => (
                                                        <div className="table-scroll w-full my-3 overflow-x-auto">
                                                            <table
                                                                className="border border-gray-300 border-separate border-spacing-0 min-w-full md:min-w-[800px]">
                                                                {children}
                                                            </table>
                                                        </div>),
                                                    th: ({...props}) => (
                                                        <th className="border-r border-b border-gray-300 bg-gray-100 px-3 py-2 text-left whitespace-nowrap" {...props}/>),
                                                    td: ({...props}) => (
                                                        <td className="border-r border-b border-gray-300 px-3 py-2" {...props}/>),
                                                    tr: ({...props}) => (<tr {...props}/>)
                                                }}
                                            >
                                                {msg.answer}
                                            </ReactMarkdown>

                                        </div>
                                        {msg.started && (<div className="flex gap-1 mt-2">
                                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"/>
                                                <span
                                                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]"/>
                                                <span
                                                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]"/>
                                            </div>)}

                                    </div>

                                </div>

                            ))}

                            <div ref={chatEndRef}/>

                        </div>

                    )}

                </div>


                <div className="border-t border-gray-100 bg-white px-3 sm:px-4 pt-3 pb-3"
                     style={{paddingBottom: "calc(12px + env(safe-area-inset-bottom))"}}>

                    <div className="flex items-end gap-2 w-full max-w-4xl mx-auto">

                        {isRecording ? (

                            <div
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

                            </div>

                        ) : (

                            <textarea
                                rows={1}
                                value={messageInput}
                                placeholder="Nhập câu hỏi..."
                                ref={textareaRef}
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
                                className="flex-1 min-w-0 px-4 py-3 text-base border border-gray-200 rounded-2xl focus:outline-none focus:border-[rgb(154,0,31)] shadow-md resize-none overflow-y-auto max-h-[240px] scroll-hidden"
                                style={{fontSize: 16}}
                            />

                        )}


                        <button
                            disabled={isRecording}
                            onClick={sendMessage}
                            className="flex-shrink-0 p-3 rounded-2xl bg-[rgb(154,0,31)] text-white hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all shadow-md"
                        >
                            <FiSend size={18}/>
                        </button>


                        <button
                            type="button"
                            onClick={() => setIsRecording(!isRecording)}
                            className={`flex-shrink-0 p-3 rounded-2xl transition-all shadow-md ${isRecording ? "bg-red-600 text-white scale-110 shadow-red-300" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                            {isRecording ? <FiMicOff size={18}/> : <FiMic size={18}/>}
                        </button>


                    </div>

                </div>


            </div>

        </div>

    </div>);
};
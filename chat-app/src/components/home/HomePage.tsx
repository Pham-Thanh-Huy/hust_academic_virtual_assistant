import "./HomePage.style.css"
import {SideBar} from "../../layouts/side-bar";
import {Header} from "../../layouts/header";
import {FiSend} from 'react-icons/fi'
import {useEffect, useRef, useState} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
    messageId?: string;
    question: string;
    answer: string;
    streaming: boolean;
}
export const HomePage = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [messageInput, setMessageInput] = useState("");
    const socketRef = useRef<WebSocket | null>(null);
    const [listMessage, setListMessage] = useState<Message[]>([]);
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    //Dùng để kiểm tra xem khi nào nhập xong hẳn mới cho send text tiếp
    const [disableSendMessage, setDisableSendMessage] = useState<boolean>(false)

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [listMessage]);

    useEffect(() => {
        if (window.innerWidth > 768) {
            setSidebarOpen(true);
        }
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    }, []);

    useEffect(() => {
        if (socketRef.current) return;
        const ws = new WebSocket("ws://localhost:1923/api/v1/chats");
        socketRef.current = ws;
        ws.onopen = () => console.log("websocket open");
        ws.onerror = (e) => console.log("ws error!", e);
        ws.onclose = () => console.log("ws closed!");

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log(data)
            if (data.type == "chunk") {
                setListMessage(prev => {
                    const messages = [...prev];

                    const lastIndex = messages.length - 1;

                    messages[lastIndex] = {
                        ...messages[lastIndex],
                        answer: messages[lastIndex].answer + data.data,
                        streaming: false
                    };

                    return messages;
                });
            }

            if (data.type == "done") {
                setDisableSendMessage(false)
                setListMessage(prev => {
                    const message = [...prev]
                    const lastIndex = message.length - 1;
                    message[lastIndex] = {
                        ...message[lastIndex],
                        streaming: false
                    }
                    return message
                })
            }
        }

        return () => {
            // Không đóng WS ở đây để tránh bị đóng sớm
        };
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(prev => !prev);
    };


    const question = () => {
        console.log(messageInput)
        setDisableSendMessage(true)

        socketRef.current?.send(JSON.stringify({
            model: "gpt-5.4-mini",
            question: messageInput
        }));

        setListMessage(prev => [...prev, {
            messageId: crypto.randomUUID(),
            question: messageInput,
            answer: "",
            streaming: true,
        }])
        setMessageInput("")
    }

    return (
        <div id={"main-container"} className={sidebarOpen ? "sidebar-open" : ""}>
            <div id={"main-sidebar"}
                 className={sidebarOpen ? "open" : "closed"}>
                <SideBar/>
            </div>

            <div id={"main"} className={sidebarOpen ? "dim" : ""}
                 onClick={() => {
                     if (window.innerWidth < 768 && sidebarOpen) {
                         toggleSidebar()
                     }
                 }}
            >
                <Header onToggleSidebar={toggleSidebar}/>
                <div className="main__box-chat">
                    <div className="main__box-chat__list-chat">
                        {/*Lúc chưa có message nào -> hiện intro còn khi có message show box chat message */}
                        {listMessage.length === 0 && (
                            <div className={"main__box-chat__list-chat__intro"}>
                                <h1>Tra cứu học phần đại học Bách Khoa Hà Nội</h1>
                                <div className={"main__box-chat__list-chat__intro__bot-message"}>
                                    <img src={"/hust-logo.svg"} alt={"bot-logo"}/>
                                    <p className={"bot-message"}>
                                        Chào bạn! Nhập mã học phần hoặc tên môn học bạn muốn tìm hiểu nhé.
                                    </p>
                                </div>
                            </div>
                        )}
                        {listMessage.length > 0 && (
                            <div className="main__box-chat__list-chat__message">
                                {listMessage.map((msg) => (
                                    <div key={msg.messageId}>
                                        {/* USER */}
                                        <div className="main__box-chat__list-chat__message__human-message">
                                            <p className="human-message">
                                                {msg.question}
                                            </p>
                                        </div>
                                        {/* BOT */}
                                        <div className="main__box-chat__list-chat__message__bot-message">
                                            <img src="/hust-logo.svg" alt="bot-logo"/>
                                            <div className="bot-message">
                                                <ReactMarkdown  remarkPlugins={[remarkGfm]}>
                                                    {msg.answer}
                                                </ReactMarkdown>
                                                {msg.streaming && (
                                                    <span className="typing">
                                                        <span className="dot"></span>
                                                        <span className="dot"></span>
                                                        <span className="dot"></span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {/* 👇 IMPORTANT: anchor scroll */}
                                <div ref={chatEndRef} />
                            </div>
                        )}

                    </div>
                    <div className="main__box-chat__send-message">
                        <form
                            className="input-wrapper"
                            onSubmit={(e) => {
                                e.preventDefault();
                                question();
                            }}
                        >
                            <input
                                type="text"
                                value={messageInput}
                                placeholder="Nhập câu hỏi của bạn tại đây..."
                                onChange={e => setMessageInput(e.target.value)}
                            />

                            <button type="submit" className="send-btn" disabled={disableSendMessage}>
                                <FiSend size={34}/>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};


import "./HomePage.style.css"
import {SideBar} from "../../layouts/side-bar";
import {Header} from "../../layouts/header";
import {FiSend} from 'react-icons/fi'
import {useEffect, useState} from "react";

export const HomePage = () => {

    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (window.innerWidth > 768) {
            setSidebarOpen(true);
        }
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    }, []);


    useEffect(() => {

        const ws = new WebSocket("ws://localhost:1923/api/v1/chats");

        ws.onopen = () => console.log("✅ WS CONNECTED");
        ws.onerror = (e) => console.log("❌ WS ERROR", e);
        ws.onclose = () => console.log("🔴 WS CLOSED");



        return () => {
            // Không đóng WS ở đây để tránh bị đóng sớm
        };
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(prev => !prev);
    };
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
                        <div className={"main__box-chat__list-chat__intro"}>
                            <h1>Tra cứu học phần đại học Bách Khoa Hà Nội</h1>
                            <div className={"main__box-chat__list-chat__intro__bot-message"}>
                                <img src={"/hust-logo.svg"} alt={"bot-logo"}/>
                                <p className={"bot-message"}>
                                    Chào bạn! Nhập mã học phần hoặc tên môn học bạn muốn tìm hiểu nhé.
                                </p>
                            </div>
                        </div>
                        <div className={"main__box-chat__list-chat__message"}>
                            <div className={"main__box-chat__list-chat__message__human-message"}>
                                <img src={"/huy-test-logo.jpeg"} alt={"human-logo"}/>
                                <p className={"human-message"}>
                                    Hãy cho tôi biết về học phần điều kiện của học phần Lập Trình Mạng IT411
                                </p>
                            </div>
                            <div className={"main__box-chat__list-chat__message__bot-message"}>
                                <img src={"/hust-logo.svg"} alt={"bot-logo"}/>
                                <p className={"bot-message"}>
                                    Chào bạn! Nhập mã học phần hoặc tên môn học bạn muốn tìm hiểu nhé.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="main__box-chat__send-message">
                        <div className="input-wrapper">
                            <input
                                type="text"
                                placeholder="Nhập câu hỏi của bạn tại đây..."
                            />
                            <FiSend size={34}/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


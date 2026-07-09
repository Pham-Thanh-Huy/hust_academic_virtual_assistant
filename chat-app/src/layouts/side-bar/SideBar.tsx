import "./SideBar.style.css";
import { FaRegComment, FaSearch, FaPlus } from "react-icons/fa";
import {useNavigate} from "react-router-dom";
import {useEffect, useState} from "react";
import {jwtDecode} from "jwt-decode";

type Session = {
    "id": string;
    "title": string;
    "status": string;
    "username": string;
    "lastMessageAt": string;
    "totalMessage": number
    "createdAt": string;
}
export const SideBar = () => {
    const isLogin = Boolean(localStorage.getItem("token"));
    const navigate = useNavigate();
    const [listSession, setListSession] = useState<Session[]>([]);
    const [word, setWord] = useState("");

    const logout = () => {
        localStorage.removeItem("token")
        navigate(0)
    }

    const getListSession = async (username: string, word: String) => {

        try {
            const params = new URLSearchParams({
                username: username,
            });

            if (word && word.trim() !== "") {
                params.append("word", word.trim());
            }

            const response = await fetch(
                `http://localhost:8085/api/v1/list-session?${params.toString()}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            const result = await response.json();

            if (response.ok) {
                setListSession(result.data);
            }
        } catch (e) {
            console.log(e);
        }
    };



    const newChat = () => {
        navigate("/")
    }
    useEffect(() => {
        if (!isLogin) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        const decode = jwtDecode<{ username: string }>(token);

        // Không có từ khóa -> gọi ngay
        if (!word.trim()) {
            getListSession(decode.username, "");
            return;
        }

        // Có từ khóa -> debounce 500ms
        const timer = setTimeout(() => {
            getListSession(decode.username, word);
        }, 500);

        return () => {
            clearTimeout(timer);
        };

    }, [word, isLogin]);

    return (
        <div className="sidebar-container flex flex-col h-full bg-white">

            {/* ================= LOGO ================= */}
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

            {/* ================= HISTORY ================= */}
            <div className="history-chat flex-1 flex flex-col min-h-0">

                {/* TOP ACTIONS */}
                <div className="px-3 py-3 space-y-3 border-b border-gray-100">

                    {/* NEW CHAT BUTTON */}
                    <button className="w-full flex items-center justify-center gap-2
                        py-2.5 rounded-xl
                        bg-[rgb(154,0,31)] text-white
                        font-semibold text-sm
                        shadow-sm hover:shadow-md
                        hover:brightness-110 active:scale-95
                        transition-all"
                            onClick={() => newChat()}
                    >
                        <FaPlus size={12} />
                        Cuộc trò chuyện mới
                    </button>

                    {/* SEARCH */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition
                        ${isLogin
                        ? "bg-white border-gray-200 focus-within:border-[rgb(154,0,31)]"
                        : "bg-gray-50 border-gray-100 opacity-60"
                    }`}
                    >
                        <FaSearch size={12} className="text-gray-400" />

                        <input
                            disabled={!isLogin}
                            value={word}
                            onChange={(e) => setWord(e.target.value)}
                            className="w-full text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
                            placeholder="Tìm kiếm lịch sử chat..."
                        />
                    </div>
                </div>

                {/* LIST */}
                <div className="history-chat__list-history px-2 py-3">

                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
                        Lịch sử hội thoại
                    </h3>

                    {!isLogin ? (
                        <div className="mt-10 text-center px-4">
                            <div className="text-sm font-semibold text-gray-700">
                                Chưa đăng nhập
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                                Đăng nhập để xem lịch sử trò chuyện
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {listSession.map((session) => (
                                <button
                                    key={session.id}
                                    className="flex items-start gap-3 w-full px-3 py-2 rounded-lg
                                        hover:bg-red-50 transition group"
                                >
                                    <FaRegComment
                                        className="text-gray-400 group-hover:text-[rgb(154,0,31)] mt-1"
                                        size={12}
                                    />

                                    <p className="text-sm text-gray-700 text-left line-clamp-2
                                        group-hover:text-[rgb(154,0,31)] transition">
                                        {session.title}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}

                </div>
            </div>

            {/* ================= USER FOOTER ================= */}
            <div className="border-t border-gray-100 px-3 py-3">

                {isLogin ? (
                    <div className="flex items-center justify-between">

                        <div className="flex items-center gap-3 min-w-0">
                            <img
                                className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                                src="/huy-test-logo.jpeg"
                                alt="avatar"
                            />

                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-800 truncate">
                                    Phạm Thành Huy
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                    huy.pt210154P@sis.hust.edu.vn
                                </div>
                            </div>
                        </div>

                        <button className="text-xs px-3 py-1.5 rounded-full
                            border border-gray-200 text-gray-700
                            hover:bg-red-50 hover:text-red-600 hover:border-red-200
                            transition active:scale-95"
                                onClick={logout}
                        >
                            Đăng xuất
                        </button>

                    </div>
                ) : (
                    <button className="w-full py-2.5 text-sm font-semibold text-white
                        bg-gradient-to-r from-[rgb(154,0,31)] to-[rgb(120,0,25)]
                        rounded-xl shadow-md
                        hover:shadow-lg hover:brightness-110
                        active:scale-95 transition"
                            onClick={() => navigate("/login")}
                    >
                        Đăng nhập
                    </button>
                )}

            </div>
        </div>
    );
};
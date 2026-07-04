import "./SideBar.style.css";
import { FaRegComment, FaSearch, FaPlus } from "react-icons/fa";

export const SideBar = () => {
    const isLogin = Boolean(localStorage.getItem("token"));

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
                            {Array.from({ length: 10 }).map((_, idx) => (
                                <button
                                    key={idx}
                                    className="flex items-start gap-3 w-full px-3 py-2 rounded-lg
                                        hover:bg-red-50 transition group"
                                >
                                    <FaRegComment
                                        className="text-gray-400 group-hover:text-[rgb(154,0,31)] mt-1"
                                        size={12}
                                    />

                                    <p className="text-sm text-gray-700 text-left line-clamp-2
                                        group-hover:text-[rgb(154,0,31)] transition">
                                        Cuộc trò chuyện #{idx + 1} - Lorem ipsum dolor sit amet...
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
                    >
                        Đăng nhập
                    </button>
                )}

            </div>
        </div>
    );
};
import { useState } from "react";
import { useForm } from "react-hook-form";
import env from "../../config/env.ts";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { showErrorMessage, showSuccessMessage } from "../../utils/toast.util.ts";

type LoginForm = {
    username: string;
    password: string;
};

const Login = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } =
        useForm<LoginForm>();

    const navigate = useNavigate();

    const login = async (data: LoginForm) => {
        setLoading(true);

        try {
            const response = await fetch(
                `${env.API_URL}/user-service/api/v1/login`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                showErrorMessage(
                    response.status === 400
                        ? "Sai tài khoản hoặc mật khẩu"
                        : result?.message?.message
                );
                return;
            }

            localStorage.setItem("token", result.data.token);

            showSuccessMessage("Đăng nhập thành công");
            navigate("/");
        } catch (e) {
            toast.error(String(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">

            {/* LEFT SIDE (branding) */}
            <div className="hidden md:flex w-1/2 bg-gradient-to-br from-[rgb(154,0,31)] to-[rgb(90,0,20)]
                            items-center justify-center text-white p-10">

                <div className="text-center max-w-md">
                    <img src="/hust-logo.svg" className="w-16 h-16 mx-auto mb-6" />

                    <h1 className="text-3xl font-bold mb-2">
                        HUST Assistant
                    </h1>

                    <p className="text-sm text-white/80">
                        Hệ thống trợ lý học tập thông minh dành cho sinh viên Bách Khoa Hà Nội
                    </p>
                </div>
            </div>

            {/* RIGHT SIDE (form) */}
            <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-50 px-6">

                <div className="w-full max-w-md">

                    {/* CARD */}
                    <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">

                        <h2 className="text-2xl font-bold text-gray-800 text-center">
                            Đăng nhập
                        </h2>

                        <p className="text-sm text-gray-500 text-center mt-1">
                            Chào mừng bạn quay trở lại
                        </p>

                        <form className="mt-6 space-y-4" onSubmit={handleSubmit(login)}>

                            {/* USERNAME */}
                            <div>
                                <label className="text-sm text-gray-600">
                                    Email / MSSV
                                </label>

                                <input
                                    type="text"
                                    placeholder="vd: huy@hust.edu.vn"
                                    className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200
                                               focus:outline-none focus:ring-2 focus:ring-[rgb(154,0,31)]
                                               transition"
                                    {...register("username", {
                                        required: "Không được để trống"
                                    })}
                                />

                                {errors.username && (
                                    <p className="text-xs text-red-500 mt-1">
                                        {errors.username.message}
                                    </p>
                                )}
                            </div>

                            {/* PASSWORD */}
                            <div>
                                <label className="text-sm text-gray-600">
                                    Mật khẩu
                                </label>

                                <div className="relative mt-1">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200
                                                   focus:outline-none focus:ring-2 focus:ring-[rgb(154,0,31)]
                                                   transition pr-10"
                                        {...register("password", {
                                            required: "Không được để trống"
                                        })}
                                    />

                                    <span
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-gray-400 cursor-pointer"
                                    >
                                        {showPassword ? "🙈" : "👁"}
                                    </span>
                                </div>

                                {errors.password && (
                                    <p className="text-xs text-red-500 mt-1">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {/* BUTTON */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl text-white font-semibold
                                           bg-gradient-to-r from-[rgb(154,0,31)] to-[rgb(120,0,25)]
                                           hover:brightness-110 active:scale-95
                                           transition-all disabled:opacity-50"
                            >
                                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                            </button>

                            {/* DIVIDER */}
                            <div className="flex items-center gap-3">
                                <div className="h-px bg-gray-200 flex-1" />
                                <span className="text-xs text-gray-400">HUST</span>
                                <div className="h-px bg-gray-200 flex-1" />
                            </div>

                            {/* FOOTER */}
                            <p className="text-center text-sm text-gray-500">
                                Cần hỗ trợ?{" "}
                                <a
                                    href="https://web.facebook.com/huy.pham.73583"
                                    target="_blank"
                                    className="text-[rgb(154,0,31)] font-medium hover:underline"
                                >
                                    Liên hệ kỹ thuật
                                </a>
                            </p>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
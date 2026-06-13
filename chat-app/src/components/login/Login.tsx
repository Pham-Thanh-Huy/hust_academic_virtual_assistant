import {useState} from "react";
import {useForm} from "react-hook-form";

type LoginForm = {
    username: string;
    password: string;
}

const Login = () => {
    const [showPassword, setShowPassword] = useState(false);
    const {register, handleSubmit, formState: {errors}} = useForm<LoginForm>()

    const login = (data: LoginForm) => {
        try{
            const response = fetch("http://localhost:9898/user-service/api/v1/login",{
                method: 'POST',
                headers: {
                    'Content-Type': 'application.json'
                },
                body: JSON.stringify({
                    "username": data.username,
                    "password": data.password
                })
            })
        }catch(e){
            console.log(e)
        }
    }

    return (

        <div className="min-h-screen flex items-center justify-center bg-pink-50 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

                {/*/!* Logo *!/*/}
                {/*<div className="flex justify-center mb-4">*/}

                {/*    <img className={"w-14 h-14"} src={"/hust-logo.svg"} />*/}
                {/*</div>*/}

                {/* Title */}
                <h1 className="text-center text-xl font-semibold text-gray-800">
                    Đăng nhập hệ thống
                </h1>
                <p className="text-center text-sm text-gray-500 mt-1">
                    Cổng thông tin học tập và hỗ trợ sinh viên Bách Khoa
                </p>

                {/* Form */}
                <form className="mt-6 space-y-4" onSubmit={handleSubmit(login)}>

                    {/* Email / MSSV */}
                    <div>
                        <label className="text-sm text-gray-700">
                            Mã số sinh viên / Email
                        </label>
                        <input
                            type="text"
                            placeholder="vd: email@hust.edu.vn"
                            className="mt-1 w-full px-4 py-3 rounded-lg border border-pink-200 bg-pink-50 focus:outline-none focus:ring-2 focus:ring-red-400"
                            {...register('username', {required: "Tài khoản không được để trống"})}
                        />
                        {errors.username && <span style={{color: 'red'}}>{errors.username?.message as string}</span>}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="text-sm text-gray-700">Mật khẩu</label>

                        <div className="relative mt-1">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 pr-10 rounded-lg border border-pink-200 bg-pink-50 focus:outline-none focus:ring-2 focus:ring-red-400"
                                {...register('password', {required: "Mật khẩu không được để trống"})}
                            />
                            {errors.password && <span style={{color: 'red'}}>{errors.password?.message as string}</span>}

                            <span
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-gray-400 cursor-pointer select-none"
                            >
                            {showPassword ? "🙈" : "👁"}
                        </span>
                        </div>
                    </div>

                    {/*/!* Remember + forgot *!/*/}
                    {/*<div className="flex items-center justify-between text-sm">*/}
                    {/*    <label className="flex items-center gap-2 text-gray-600">*/}
                    {/*        <input type="checkbox" className="accent-red-600" />*/}
                    {/*        Ghi nhớ đăng nhập*/}
                    {/*    </label>*/}

                    {/*    <a href="#" className="text-red-600 hover:underline">*/}
                    {/*        Quên mật khẩu?*/}
                    {/*    </a>*/}
                    {/*</div>*/}

                    {/* Button */}
                    <button type={"submit"}
                            className="w-full bg-red-700 hover:bg-red-800 text-white py-3 rounded-lg font-medium transition">
                        Đăng nhập
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-4">
                        <div className="h-px bg-gray-200 flex-1"/>
                        <span className="text-xs text-gray-400">HOẶC</span>
                        <div className="h-px bg-gray-200 flex-1"/>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-sm text-gray-600">
                        Chưa có tài khoản?{" "}
                        <a href="https://web.facebook.com/huy.pham.73583" target={"_blank"}
                           className="text-red-600 font-medium hover:underline">
                            Liên hệ kỹ thuật
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login;
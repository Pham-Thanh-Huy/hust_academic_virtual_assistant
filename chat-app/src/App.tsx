import {BrowserRouter, Route, Routes} from "react-router-dom"
import './App.css'
import {Chat} from "./components/home"
import Login from "./components/login/Login.tsx";
import {ToastContainer} from "react-toastify";

function App() {

    return (
        <>
            <ToastContainer
                position="top-right"
                autoClose={1700}
                hideProgressBar
                newestOnTop={false}
                closeOnClick={false}
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
            />
            <BrowserRouter>
                <Routes>
                    <Route path={'/'} element={<Chat/>}/>
                    <Route path={'/login'} element={<Login/>}/>
                </Routes>
            </BrowserRouter>
        </>
    )
}

export default App

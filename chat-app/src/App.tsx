import {BrowserRouter, Route, Routes} from "react-router-dom"
import './App.css'
import {HomePage} from "./components/home"
import Login from "./components/login/Login.tsx";

function App() {

    return (
        <>
            <BrowserRouter>
                <Routes>
                    <Route path={'/'} element={<HomePage/>}/>
                    <Route path={'/login'} element={<Login/>}/>
                </Routes>
            </BrowserRouter>
        </>
    )
}

export default App

import "./HomePage.style.css"
import {SideBar} from "../../layouts/side-bar";
import {Header} from "../../layouts/header";

export const HomePage = () => {
    return (
        <div id={"main-container"}>
            <div id={"main-sidebar"}>
                <SideBar />
            </div>

            <div id={"main"}>
                <Header />
                <div className="main__box-chat">
                    <div className="main__box-chat__list-chat">

                    </div>
                    <div className="main__box-chat__send-message">

                    </div>
                </div>
            </div>
        </div>
    );
};


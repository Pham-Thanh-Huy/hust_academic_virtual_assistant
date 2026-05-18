import './SideBar.style.css'
import {FaSearch} from 'react-icons/fa'
import { FaRegComment } from "react-icons/fa";

export const SideBar = () => {
    return (
        <div className={"sidebar-container"}>
            <div className={"logo"}>
                <img className="logo__img" src="/hust-logo.svg"/>

                <div className="logo__text">
                    <h1>HUST Assistant</h1>
                    <p>Trợ lý ảo hỏi đáp học phần</p>
                </div>
            </div>

            <div className="history-chat">

                <div className="history-chat__top">
                    <button className="history-chat__new-chat">
                        <span>+</span>
                        Cuộc trò chuyện mới
                    </button>

                    <div className="search-container">
                        <input className="history-chat__search" placeholder={"Tìm kiếm lịch sử chat..."}/>
                        <FaSearch size={12} className="history-chat__icon-search" />
                    </div>
                </div>

                <div className="history-chat__list-history">
                    <h3>Lịch sử hội thoại</h3>
                    {Array.from({length:200}, ( ) =>(
                        <button className={"history-chat__list-history__button"}>
                            <FaRegComment className={"history-chat__list-history__button__icon"}/>
                            <p className={"history-chat__list-history__history__button__icon__text"}>
                                Lorem ipsum dolor sit amet, consectetur adipisicing elit. Aspernatur assumenda commodi consequuntur corporis cum ea eveniet explicabo fugit maiores, maxime modi, mollitia officia quidem! At eaque earum exercitationem repudiandae veritatis!
                            </p>
                        </button>
                    ))}
                </div>

            </div>

            <div className={"info-user"}>
                    <img className={"info-user__icon"} src={"/huy-test-logo.jpeg"}/>
                <div className={"info-user__name-mail"}>
                    <div className="info-user__name">Phạm Thành Huy</div>
                    <div className="info-user__email">huy.pt210154P@sis.hust.edu.vn</div>
                </div>

            </div>
        </div>
    );
};

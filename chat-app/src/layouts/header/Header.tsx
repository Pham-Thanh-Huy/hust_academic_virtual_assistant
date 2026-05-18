import './Header.style.css'
import {FiBell} from "react-icons/fi";
import {FiSidebar} from "react-icons/fi";

export const Header = ({onToggleSidebar}: {onToggleSidebar: () => void}) => {
    return (
        <div id={"header"}>
            <div  >
                <FiSidebar onClick={onToggleSidebar}  className={"header__toggle-sidebar"}  size={34} />
            </div>
            <div className={"header__logo"}>
                <img src="/hust-logo.svg" alt=""/>
            </div>
            <div className={"header__information"}>
                <FiBell size={34} className={"header__information__bell-icon"}/>
            </div>
        </div>
    );
};

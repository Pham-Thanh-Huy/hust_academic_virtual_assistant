import {jwtDecode} from "jwt-decode";

export const getUsernameByLogin = () => {
    const token = localStorage.getItem("token");
    if (token) {
        const decode = jwtDecode<{ username: string }>(token);
        return decode.username
    }

    return null;
}

export const getUsernameByToken = (token: string) => {
    const decode = jwtDecode<{ username: string }>(token);
    return decode.username
}


export const checkIsLoginUtil = () => {
    const token = localStorage.getItem("token");
    return !!token;
}
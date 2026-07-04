import {toast} from "react-toastify";

let isDone = true;


export function showSuccessMessage(message: string){
    toast.success(message, {
        icon: false,
        closeButton: false,
    })
}

export function showErrorMessage(message: string){
    if(!isDone){
        return;
    }

    isDone = false

    toast.error(message, {
        icon: false,
        closeButton: false,
        onClose: () => {
            isDone = true
        }
    })

}
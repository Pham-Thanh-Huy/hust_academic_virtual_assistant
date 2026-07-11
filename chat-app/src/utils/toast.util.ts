import {toast} from "react-toastify";

let isDone = true;


export function showSuccessMessage(message: string) {
    toast.success(message, {
        icon: false,
        closeButton: false,
        style: {
            color: "#fff",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "12px",
            padding: "14px 18px",
            fontSize: "15px",
            fontWeight: "600",
            boxShadow: "0 8px 25px rgba(34, 197, 94, 0.35)",
            minWidth: "300px",
        },
    });
}

export function showErrorMessage(message: string){
    if(!isDone){
        return;
    }

    isDone = false

    toast.error(message, {
        icon: false,
        closeButton: false,
        style: {
            color: "#fff",
            background: "linear-gradient(135deg, #ff4b4b, #d63031)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "12px",
            padding: "14px 18px",
            fontSize: "15px",
            fontWeight: "600",
            boxShadow: "0 8px 25px rgba(255, 75, 75, 0.35)",
            minWidth: "300px",
        },
        onClose: () => {
            isDone = true
        }
    })

}
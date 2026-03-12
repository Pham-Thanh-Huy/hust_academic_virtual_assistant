from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.requests.chat_request import ChatRequest

chat_router = APIRouter()
import app.services.chat_service as chat_service

@chat_router.post("/chats")
async def chat(request: ChatRequest):
    res = chat_service.chat(request.question, request.question)
    return JSONResponse(content=res, status_code= res.get("status").get("code"))
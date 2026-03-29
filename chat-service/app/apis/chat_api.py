from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.requests.chat_request import ChatRequest

chat_router = APIRouter()
import app.services.chat_service as chat_service

@chat_router.post("/chats")
async def chat(input: ChatRequest):
    res = chat_service.chat(input)
    return JSONResponse(content=res, status_code= res.get("status").get("code"))

@chat_router.post("/standardization-voice-question")
async def standardization(input: ChatRequest):
    res = chat_service.standardization_question(input)
    return JSONResponse(content=res, status_code=res.get("status").get("code"))
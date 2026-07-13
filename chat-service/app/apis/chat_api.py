import logging

from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from starlette.websockets import WebSocket

chat_router = APIRouter()
import app.services.chat_service as chat_service

@chat_router.websocket("/chats")
async def chat(web_socket: WebSocket):
    await chat_service.chat(web_socket)


@chat_router.get("/chat-message/voice")
async def voice_answer_chat():
    return await chat_service.voice_answer_chat()
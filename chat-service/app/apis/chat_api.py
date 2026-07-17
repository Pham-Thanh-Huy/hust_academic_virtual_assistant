import logging
from typing import Annotated

from fastapi import APIRouter, File, UploadFile
from fastapi.responses import JSONResponse
from starlette.websockets import WebSocket

chat_router = APIRouter()
import app.services.chat_service as chat_service

@chat_router.websocket("/chats")
async def chat(web_socket: WebSocket):
    await chat_service.chat(web_socket)


@chat_router.get("/chat-message/voice/{id}")
async def voice_answer_chat(id: str):
    return await chat_service.voice_answer_chat(id)

@chat_router.post("/voice-to-text")
async def speech_to_text(audio_file: Annotated[UploadFile, File()]):
    return await chat_service.speech_to_text(audio_file)
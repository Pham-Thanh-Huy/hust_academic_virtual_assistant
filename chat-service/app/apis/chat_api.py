import logging

from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from starlette.websockets import WebSocket, WebSocketDisconnect
from sympy.codegen import While

from app.requests.chat_request import ChatRequest

chat_router = APIRouter()
import app.services.chat_service as chat_service

@chat_router.websocket("/chats")
async def chat(web_socket: WebSocket):
    await web_socket.accept()
    try:
        while True:
            data =  await web_socket.receive_json()
            input = ChatRequest(**data)
            await chat_service.chat(web_socket, input)
    except WebSocketDisconnect:
        logging.info("Disconnect websocket")


@chat_router.post("/standardization-voice-question")
async def standardization(input: dict = Body(...)):
    res = chat_service.standardization_voice_question(input)
    return JSONResponse(content=res, status_code=res.get("status").get("code"))
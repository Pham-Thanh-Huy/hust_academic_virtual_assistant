import asyncio
import base64
import json
import logging
from pathlib import Path

import httpx
from fastapi import WebSocket
from starlette.responses import StreamingResponse

from app.config.load_env import Env
from app.requests.chat_request import ChatRequest
from app.services.query_embedding import query_vector_database_course
from app.utils.constants import Constant
from app.utils.open_ai_util import init_open_ai, init_async_open_ai
import aiofiles

client = init_open_ai()

# GET ABSOLUTE PATH IN THIS FILE
FILE_DIR = Path(__file__).absolute()


async def chat(web_socket: WebSocket) -> dict:
    try:
        client_async = init_async_open_ai()
        await web_socket.accept()
        while True:
            data = await web_socket.receive_json()
            if not data.get("sessionId"):
                await web_socket.send_json({
                    "status": {
                        "message": "sessionId is required",
                        "code": 400
                    }
                })
                continue  # hoặc break nếu muốn đóng websocket

            input = ChatRequest(**data)
            courses = query_vector_database_course(input.question)
            # chat_id = new c
            # GET PROMPT
            async with aiofiles.open(f"{FILE_DIR.parents[2]}/prompt/course.txt", "r") as file:
                template = await file.read()

            prompt = template.format(course=courses, question=input.question)

            params = {
                "model": input.model,
                "input": prompt,
                "stream": True,
            }
            if input.previous_response_id:
                params["previous_response_id"] = input.previous_response_id

            stream = await client_async.responses.create(**params)
            current_response_id = None

            full_answer = ""
            session_id = data.get("sessionId")
            async for chunk in stream:
                if chunk.type == "response.output_text.delta":
                    full_answer += chunk.delta
                    await web_socket.send_json({
                        "type": "chunk",
                        "data": chunk.delta,
                        "status": {
                            "message": "Success",
                            "code": 200
                        }
                    })
                if chunk.type == "response.completed":
                    current_response_id = chunk.response.id

            asyncio.create_task(save_chat_message(session_id, input.model, input.question, full_answer))

            await web_socket.send_json(
                {
                    "type": "done",
                    "current_context_chat_id": current_response_id,
                    "status": {
                        "message": "Done!",
                        "code": 200
                    }
                })

    except Exception as e:
        logging.error(f"[ERROR-CHAT] {e}")
        await web_socket.send_json({
            "status": {
                "message": Constant.API_STATUS.INTERNAL_SERVER_ERROR,
                "code": Constant.API_STATUS.INTERNAL_SERVER_ERROR_CODE
            }
        })


async def save_chat_message(session_id: str, model: str, message: str, answer: str):
    body = {
        "message": message,
        "model": model,
        "answer": answer
    }

    params = {
        "sessionId": session_id
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{Env.ChatService.url}/api/v1/add-message",
                params=params,
                json=body,
            )
            response.raise_for_status()

    except Exception as e:
        logging.error(f"[SAVE-CHAT-ERROR] {e}")


""" 
Hàm này dùng để trả ra voice từ câu trả lời của bot
Hàm yêu cầu chat id, gọi tới chat-session-service để lấy ra đưọc câu trả lời theo chat id đó, rồi gọi tới openai để lấy ra voice
"""
async def voice_answer_chat():
    try:
        audio_stream = openai_tts_stream("heelooo các bro tôi là phạm huy đây")
        return StreamingResponse(
            audio_stream,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no-cache"
            }
        )
    except Exception as e:
        return {
            "status": {
                "message": Constant.API_STATUS.INTERNAL_SERVER_ERROR,
                "code": Constant.API_STATUS.INTERNAL_SERVER_ERROR_CODE
            }
        }



async def openai_tts_stream(voice_text: str):
    try:
        async with init_async_open_ai().audio.speech.with_streaming_response.create(
            model="gpt-4o-mini-tts",
            voice="sage",
            input=voice_text,
            response_format="pcm"
        ) as response:

            async for chunk in response.iter_bytes():

                data = {
                    "type": "audio.chunk",
                    "audio": base64.b64encode(chunk).decode("utf-8")
                }

                yield (
                    "event: audio\n"
                    f"data: {json.dumps(data)}\n\n"
                )

        yield (
            "event: done\n"
            f"data: {json.dumps({'type': 'speech.audio.done'})}\n\n"
        )

    except Exception as e:
        yield (
            "event: error\n"
            f"data: {json.dumps({'message': str(e)})}\n\n"
        )

import logging
import uuid
from pathlib import Path

from fastapi import WebSocket

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
        client_async = init_async_open_ai();
        await web_socket.accept()
        while True:
            data =  await web_socket.receive_json()
            input = ChatRequest(**data)
            courses = query_vector_database_course(input.question)
            # chat_id = new c
            # GET PROMPT
            async with aiofiles.open(f"{FILE_DIR.parents[2]}/prompt/course.txt", "r") as file:
                template = await file.read()

            prompt = template.format(course=courses, question=input.question)

            messageId = uuid.uuid4().__str__()

            stream = await client_async.responses.create(
                model=input.model,
                input=prompt,
                stream=True
            )

            async for chunk in stream:
                if chunk.type == "response.output_text.delta":
                    await web_socket.send_json({
                        "type": "chunk",
                        "data": chunk.delta,
                        "message_id": messageId,
                        "status": {
                            "message": "Success",
                            "code": 200
                        }
                    })

            await web_socket.send_json(
                {
                    "type": "done",
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


"""
    standardization voice question (course) by user
"""
def standardization_voice_question(input: str):
    try:
        # GET PROMPT
        with open(f"{FILE_DIR.parents[2]}/prompt/standardization.txt", "r") as file:
            template = file.read()

        prompt = template.format(question=input["question"])

        # Fix cứng dùng model free
        model = "gpt-3.5-turbo"

        res = client.responses.create(
            model=model,
            temperature=0,
            input=prompt
        )

        return {
            "data": res.output_text,
            "status": {
                "message": "Sucess!",
                "code": 200
            }
        }
    except Exception as e:
        logging.error(f"[ERROR-STANDARDIZATION] {e}")
        return {
            "status": {
                "message": Constant.API_STATUS.INTERNAL_SERVER_ERROR,
                "code": Constant.API_STATUS.INTERNAL_SERVER_ERROR_CODE
            }
        }

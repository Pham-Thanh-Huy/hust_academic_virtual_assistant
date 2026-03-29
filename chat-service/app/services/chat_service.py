import logging
from pathlib import Path

from app.requests.chat_request import ChatRequest
from app.services.query_embedding import query_vector_database_course
from app.utils.constants import Constant
from app.utils.open_ai_util import init_open_ai

client = init_open_ai()

#GET ABSOLUTE PATH IN THIS FILE
FILE_DIR = Path(__file__).absolute()

def chat(input: ChatRequest) -> dict:
    try:
        courses = query_vector_database_course(input.question)

        # GET PROMPT
        with open(f"{FILE_DIR.parents[2]}/prompt/course.txt", "r") as file:
            template = file.read()

        prompt = template.format(course=courses, question=input.question)

        res = client.responses.create(
            model=input.model,
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
        logging.error(f"[ERROR-CHAT] {e}")
        return {
            "status":{
                "message": Constant.API_STATUS.INTERNAL_SERVER_ERROR,
                "code": Constant.API_STATUS.INTERNAL_SERVER_ERROR_CODE
            }
        }

"""
    standardization voice question (course) by user
"""
def standardization_voice_question(input: ChatRequest):
    try:
        # GET PROMPT
        with open(f"{FILE_DIR.parents[2]}/prompt/standardization.txt", "r") as file:
            template = file.read()

        prompt = template.format(question=input.question)

        res = client.responses.create(
            model=input.model,
            temperature=0,
            input=prompt,

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



from typing import Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    question: str
    model: str
    previous_response_id: Optional[str] = None
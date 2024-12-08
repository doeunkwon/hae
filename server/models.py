from pydantic import BaseModel
from typing import Optional, List, Dict


class TextInput(BaseModel):
    text: str
    metadata: Optional[Dict] = None


class UpdateText(BaseModel):
    text_id: str
    new_text: str
    metadata: Optional[Dict] = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatHistory(BaseModel):
    messages: List[ChatMessage]


class ExtractedInformation(BaseModel):
    name: str
    notes: str

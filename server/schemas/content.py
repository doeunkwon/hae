from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ContentBase(BaseModel):
    content: str


class ContentCreate(ContentBase):
    network_id: int


class Content(ContentBase):
    cid: int
    network_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID


class ContentBase(BaseModel):
    content: str


class ContentCreate(ContentBase):
    network_id: UUID


class Content(ContentBase):
    cid: UUID
    network_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

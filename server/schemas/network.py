from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID


class NetworkBase(BaseModel):
    name: str


class NetworkCreate(NetworkBase):
    pass


class NetworkUpdate(NetworkBase):
    pass


class Network(NetworkBase):
    nid: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

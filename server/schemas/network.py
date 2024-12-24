from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NetworkBase(BaseModel):
    name: str


class NetworkCreate(NetworkBase):
    pass


class NetworkUpdate(NetworkBase):
    pass


class Network(NetworkBase):
    nid: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

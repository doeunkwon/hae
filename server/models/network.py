from sqlalchemy import Column, String, Integer
from models.base import BaseModel


class Network(BaseModel):
    __tablename__ = "networks"

    nid = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    user_id = Column(String, nullable=False)  # Firebase UID

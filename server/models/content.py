from sqlalchemy import Column, String, Integer, ForeignKey
from models.base import BaseModel


class Content(BaseModel):
    __tablename__ = "contents"

    cid = Column(Integer, primary_key=True, index=True)
    content = Column(String, nullable=False)
    network_id = Column(Integer, ForeignKey(
        "networks.nid", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, nullable=False)  # Firebase UID

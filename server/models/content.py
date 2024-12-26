from sqlalchemy import Column, String, ForeignKey
import uuid
from models.base import BaseModel
from utils.encryption import encrypt, decrypt
from models.network import UUID


class Content(BaseModel):
    __tablename__ = "contents"

    cid = Column(UUID, primary_key=True, default=uuid.uuid4, index=True)
    content = Column(String, nullable=False)
    network_id = Column(UUID, ForeignKey(
        "networks.nid", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, nullable=False)  # Firebase UID

    def set_encrypted_content(self, content: str, user_token: str):
        """Set the content field with encryption."""
        self.content = encrypt(content, user_token)

    def get_decrypted_content(self, user_token: str) -> str:
        """Get the decrypted content field."""
        return decrypt(self.content, user_token)

from sqlalchemy import Column, String, Integer
from models.base import BaseModel
from utils.encryption import encrypt, decrypt


class Network(BaseModel):
    __tablename__ = "networks"

    nid = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    user_id = Column(String, nullable=False)  # Firebase UID

    def set_encrypted_name(self, name: str, user_token: str):
        """Set the name field with encryption."""
        self.name = encrypt(name, user_token)

    def get_decrypted_name(self, user_token: str) -> str:
        """Get the decrypted name field."""
        return decrypt(self.name, user_token)

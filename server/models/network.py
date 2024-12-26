from sqlalchemy import Column, String, TypeDecorator
import uuid
from models.base import BaseModel
from utils.encryption import encrypt, decrypt


class UUID(TypeDecorator):
    """Platform-independent UUID type.
    Uses SQLite's native TEXT type to store UUID values as strings.
    """

    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif isinstance(value, uuid.UUID):
            return str(value)
        else:
            return str(uuid.UUID(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            return uuid.UUID(value)


class Network(BaseModel):
    __tablename__ = "networks"

    nid = Column(UUID, primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    user_id = Column(String, nullable=False)  # Firebase UID

    def set_encrypted_name(self, name: str, user_token: str):
        """Set the name field with encryption."""
        self.name = encrypt(name, user_token)

    def get_decrypted_name(self, user_token: str) -> str:
        """Get the decrypted name field."""
        return decrypt(self.name, user_token)

from typing import List
from sqlalchemy.orm import Session
from crud.base import CRUDBase
from models.content import Content
from schemas.content import ContentCreate


class CRUDContent(CRUDBase[Content, ContentCreate, ContentCreate]):
    def get_by_network(self, db: Session, *, network_id: int, user_id: str) -> List[Content]:
        contents = db.query(self.model).filter(
            Content.network_id == network_id,
            Content.user_id == user_id
        ).all()
        return contents

    def create_with_user(self, db: Session, *, obj_in: ContentCreate, user_id: str, created_at=None) -> Content:
        db_obj = Content(
            network_id=obj_in.network_id,
            user_id=user_id
        )
        if created_at:
            db_obj.created_at = created_at
        db_obj.set_encrypted_content(obj_in.content, user_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


content = CRUDContent(Content)

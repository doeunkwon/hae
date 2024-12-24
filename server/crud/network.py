from typing import List, Optional
from sqlalchemy.orm import Session
from crud.base import CRUDBase
from models.network import Network
from schemas.network import NetworkCreate, NetworkUpdate


class CRUDNetwork(CRUDBase[Network, NetworkCreate, NetworkUpdate]):
    def get_by_user(self, db: Session, *, user_id: str) -> List[Network]:
        return db.query(self.model).filter(Network.user_id == user_id).all()

    def create_with_user(self, db: Session, *, obj_in: NetworkCreate, user_id: str) -> Network:
        db_obj = Network(
            name=obj_in.name,
            user_id=user_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_user_network(self, db: Session, *, user_id: str, nid: int) -> Optional[Network]:
        return db.query(self.model).filter(Network.user_id == user_id, Network.nid == nid).first()


network = CRUDNetwork(Network)

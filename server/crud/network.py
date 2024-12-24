from typing import List, Optional
from sqlalchemy.orm import Session
from crud.base import CRUDBase
from models.network import Network
from schemas.network import NetworkCreate, NetworkUpdate


class CRUDNetwork(CRUDBase[Network, NetworkCreate, NetworkUpdate]):
    def get_by_user(self, db: Session, *, user_id: str) -> List[Network]:
        networks = db.query(self.model).filter(
            Network.user_id == user_id).all()
        return networks

    def create_with_user(self, db: Session, *, obj_in: NetworkCreate, user_id: str) -> Network:
        db_obj = Network(user_id=user_id)
        db_obj.set_encrypted_name(obj_in.name, user_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_user_network(self, db: Session, *, user_id: str, nid: int) -> Optional[Network]:
        return db.query(self.model).filter(Network.user_id == user_id, Network.nid == nid).first()

    def update(self, db: Session, *, db_obj: Network, obj_in: NetworkUpdate) -> Network:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)

        if "name" in update_data:
            db_obj.set_encrypted_name(update_data["name"], db_obj.user_id)
            # Remove name from update_data since we handled it separately
            del update_data["name"]

        return super().update(db=db, db_obj=db_obj, obj_in=update_data)


network = CRUDNetwork(Network)

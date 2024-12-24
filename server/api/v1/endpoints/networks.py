from typing import List, Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from crud import network, content
from schemas.network import Network, NetworkUpdate
from schemas.content import Content
from core.firebase import get_current_user
from database.db import get_db
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class Response(BaseModel):
    message: str


class NetworkNameUpdate(BaseModel):
    name: str


@router.get("/", response_model=List[Network])
async def read_networks(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Get all networks for the current user.
    """
    try:
        networks = network.get_by_user(db, user_id=current_user["uid"])
        return networks
    except Exception as e:
        logger.error(f"Failed to get networks for user {
                     current_user['uid']}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get networks"
        )


@router.delete("/{nid}", response_model=Response)
async def delete_network(
    *,
    db: Session = Depends(get_db),
    nid: int,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Delete network.
    """
    try:
        db_network = network.get_user_network(
            db, user_id=current_user["uid"], nid=nid)
        if not db_network:
            raise HTTPException(status_code=404, detail="Network not found")

        network.remove(db, id=nid)
        return {"message": "Network deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete network {nid} for user {
                     current_user['uid']}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete network"
        )


@router.put("/{nid}/name", response_model=Response)
async def update_network_name(
    *,
    db: Session = Depends(get_db),
    nid: int,
    network_in: NetworkNameUpdate,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Update network name.
    """
    try:
        db_network = network.get_user_network(
            db, user_id=current_user["uid"], nid=nid)
        if not db_network:
            raise HTTPException(status_code=404, detail="Network not found")

        network_update = NetworkUpdate(name=network_in.name)
        network.update(db, db_obj=db_network, obj_in=network_update)
        return {"message": "Network name updated successfully"}
    except Exception as e:
        logger.error(f"Failed to update network {nid} name for user {
                     current_user['uid']}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update network name"
        )


@router.get("/{nid}/contents", response_model=List[Content])
async def read_network_contents(
    *,
    db: Session = Depends(get_db),
    nid: int,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Get all contents for a network.
    """
    try:
        db_network = network.get_user_network(
            db, user_id=current_user["uid"], nid=nid)
        if not db_network:
            raise HTTPException(status_code=404, detail="Network not found")

        contents = content.get_by_network(
            db, network_id=nid, user_id=current_user["uid"])
        return contents
    except Exception as e:
        logger.error(f"Failed to fetch contents for network {
                     nid}, user {current_user['uid']}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch network contents"
        )


@router.delete("/{nid}/contents/{cid}", response_model=Dict[str, str])
async def delete_content(
    *,
    db: Session = Depends(get_db),
    nid: int,
    cid: int,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Delete content from network.
    """
    try:
        db_network = network.get_user_network(
            db, user_id=current_user["uid"], nid=nid)
        if not db_network:
            raise HTTPException(status_code=404, detail="Network not found")

        content.remove(db, id=cid)
        return {"message": "Content deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete content {cid} from network {
                     nid} for user {current_user['uid']}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete content"
        )

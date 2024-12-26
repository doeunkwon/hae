from typing import List, Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from uuid import UUID
from crud import network, content
from schemas.network import Network, NetworkUpdate
from schemas.content import Content, ContentCreate
from core.firebase import get_current_user
from core.vector_store import get_vector_store
from database.db import get_db
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class Response(BaseModel):
    message: str


class NetworkNameUpdate(BaseModel):
    name: str


class ContentUpdate(BaseModel):
    content: str


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
        # Decrypt network names before sending to client
        for net in networks:
            net.name = net.get_decrypted_name(current_user["uid"])
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
    nid: UUID,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Delete network and all its contents from both SQL and vector store.
    Contents are automatically deleted from SQL due to CASCADE delete.
    """
    try:
        db_network = network.get_user_network(
            db, user_id=current_user["uid"], nid=nid)
        if not db_network:
            raise HTTPException(status_code=404, detail="Network not found")

        # Delete from vector store first
        try:
            vector_store = get_vector_store()

            # Get all documents for this network
            results = vector_store.vectorstore.get(
                where={"network_id": str(nid)}
            )
            if results and results['ids']:
                # Delete all documents for this network by their IDs
                vector_store.vectorstore._collection.delete(
                    ids=results['ids']
                )
                logger.info(f"Deleted {len(results['ids'])} documents for network {
                            nid} from vector store")
            else:
                logger.info(f"No documents found for network {
                            nid} in vector store")

        except Exception as e:
            logger.error(f"Failed to delete network {
                         nid} documents from vector store: {str(e)}")
            # Continue with SQL deletion even if vector store deletion fails

        # Delete network from SQL database
        # This will automatically delete all associated contents due to CASCADE delete
        network.remove(db, id=nid)
        logger.info(f"Deleted network {
                    nid} and all its contents (CASCADE) from SQL database")
        return {"message": "Network and all its contents deleted successfully"}
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
    nid: UUID,
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
    nid: UUID,
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
        # Decrypt content before sending to client
        for cont in contents:
            cont.content = cont.get_decrypted_content(current_user["uid"])
        return contents
    except Exception as e:
        logger.error(f"Failed to fetch contents for network {
                     nid}, user {current_user['uid']}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch network contents"
        )


@router.post("/{nid}/contents", response_model=Content)
async def create_content(
    *,
    db: Session = Depends(get_db),
    nid: UUID,
    content_in: ContentCreate,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Create new content in network.
    """
    try:
        db_network = network.get_user_network(
            db, user_id=current_user["uid"], nid=nid)
        if not db_network:
            raise HTTPException(status_code=404, detail="Network not found")

        db_content = content.create_with_user(
            db, obj_in=content_in, user_id=current_user["uid"])
        # Decrypt content before sending response
        db_content.content = db_content.get_decrypted_content(
            current_user["uid"])
        return db_content
    except Exception as e:
        logger.error(f"Failed to create content in network {
                     nid} for user {current_user['uid']}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to create content"
        )


@router.delete("/{nid}/contents/{cid}", response_model=Dict[str, str])
async def delete_content(
    *,
    db: Session = Depends(get_db),
    nid: UUID,
    cid: UUID,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Delete content from both SQL database and vector store.
    """
    try:
        db_network = network.get_user_network(
            db, user_id=current_user["uid"], nid=nid)
        if not db_network:
            raise HTTPException(status_code=404, detail="Network not found")

        # Delete from vector store first
        try:
            vector_store = get_vector_store()

            # Debug: Get and print all documents for this content
            results = vector_store.vectorstore.get(
                where={"network_id": str(nid)}
            )
            if results and results['metadatas']:
                logger.info(
                    f"Current documents in vector store for network {nid}:")
                for metadata in results['metadatas']:
                    logger.info(f"Document metadata: {metadata}")

                # Find the document ID for this content
                for i, metadata in enumerate(results['metadatas']):
                    if metadata.get('content_id') == str(cid):
                        doc_id = results['ids'][i]
                        # Delete by ID
                        vector_store.vectorstore._collection.delete(
                            ids=[doc_id]
                        )
                        logger.info(f"Deleted content {
                                    cid} (doc_id: {doc_id}) from vector store")
                        break

        except Exception as e:
            logger.error(f"Failed to delete content {
                         cid} from vector store: {str(e)}")
            # Continue with SQL deletion even if vector store deletion fails

        # Then delete from SQL database
        content.remove(db, id=cid)
        return {"message": "Content deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete content {cid} from network {
                     nid} for user {current_user['uid']}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete content"
        )


@router.put("/{nid}/contents/{cid}", response_model=Content)
async def update_content(
    *,
    db: Session = Depends(get_db),
    nid: UUID,
    cid: UUID,
    content_update: ContentUpdate,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Update content message and its corresponding vector embedding.
    """
    try:
        # Verify network exists and user has access
        db_network = network.get_user_network(
            db, user_id=current_user["uid"], nid=nid)
        if not db_network:
            raise HTTPException(status_code=404, detail="Network not found")

        # Get the content
        db_content = content.get(db, id=cid)
        if not db_content:
            raise HTTPException(status_code=404, detail="Content not found")

        # Set encrypted content
        db_content.set_encrypted_content(
            content_update.content, current_user["uid"])
        db.add(db_content)
        db.commit()
        db.refresh(db_content)

        try:
            # Update in vector store
            vector_store = get_vector_store()

            # Find and delete old vector
            results = vector_store.vectorstore.get(
                where={"network_id": str(nid)}
            )
            if results and results['metadatas']:
                # Find the document ID for this content
                for i, metadata in enumerate(results['metadatas']):
                    if metadata.get('content_id') == str(cid):
                        doc_id = results['ids'][i]
                        # Delete by ID
                        vector_store.vectorstore._collection.delete(
                            ids=[doc_id]
                        )
                        logger.info(f"Deleted old content {
                                    cid} (doc_id: {doc_id}) from vector store")
                        break

            # Create new vector with updated content
            vector_store.add_or_update_documents(
                documents=[content_update.content],
                network_id=nid,
                metadata=[{
                    "network_id": str(nid),
                    "content_id": str(cid),
                    "user_id": current_user["uid"],
                    "created_at": db_content.created_at.isoformat()
                }]
            )
            logger.info(f"Updated content {cid} in vector store")
        except Exception as e:
            logger.error(f"Failed to update content {
                         cid} in vector store: {str(e)}")
            # Don't raise exception here as SQL update was successful

        # Decrypt content before sending response
        db_content.content = db_content.get_decrypted_content(
            current_user["uid"])
        return db_content
    except Exception as e:
        logger.error(f"Failed to update content {cid} in network {
                     nid} for user {current_user['uid']}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update content"
        )

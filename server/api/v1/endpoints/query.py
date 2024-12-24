from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import pytz
from crud import network, content
from schemas.network import NetworkCreate
from schemas.content import ContentCreate
from core.firebase import get_current_user
from database.db import get_db
from services.llm import extract_information, answer_question, Message
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class QueryRequest(BaseModel):
    query: str
    name: str
    nid: int
    messages: List[Message]


class QueryResponse(BaseModel):
    answer: str
    message: str
    date: str


class SaveRequest(BaseModel):
    nid: int
    text: str


@router.post("/query", response_model=QueryResponse)
async def process_query(
    *,
    db: Session = Depends(get_db),
    query_in: QueryRequest,
    current_user: dict = Depends(get_current_user),
    timezone: str = "UTC"
) -> Any:
    """
    Process a query about a network.
    """
    try:
        # Parse the timezone
        try:
            tz = pytz.timezone(timezone)
        except pytz.exceptions.UnknownTimeZoneError as e:
            logger.warning(f"Invalid timezone {
                           timezone}, defaulting to UTC. Error: {str(e)}")
            tz = pytz.UTC

        # Get current time in the specified timezone
        now = datetime.now(tz)
        formatted_date = now.strftime("%B %d, %Y")

        if not query_in.nid:
            logger.error(f"Missing network ID in query request from user {
                         current_user['uid']}")
            raise HTTPException(
                status_code=400, detail="Network ID is required")

        db_network = network.get_user_network(
            db, user_id=current_user["uid"], nid=query_in.nid)
        if not db_network:
            logger.error(f"Network {query_in.nid} not found for user {
                         current_user['uid']}")
            raise HTTPException(status_code=404, detail="Network not found")

        # Get all contents for this network
        contents = content.get_by_network(
            db, network_id=query_in.nid, user_id=current_user["uid"])

        # Decrypt contents before processing
        relevant_contents = [c.get_decrypted_content(
            current_user["uid"]) for c in contents]

        # Process query using LLM
        answer = answer_question(
            name=query_in.name,
            question=query_in.query,
            messages=query_in.messages,
            content_array=relevant_contents
        )

        return {
            "answer": answer,
            "message": "Query processed successfully",
            "date": formatted_date
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing query for network {query_in.nid}, user {
                     current_user['uid']}: {str(e)}\nQuery: {query_in.query}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save")
async def save_content(
    *,
    db: Session = Depends(get_db),
    save_in: SaveRequest,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Save content to a network.
    """
    try:
        # Extract information using Gemini
        extracted_info = extract_information(save_in.text)

        if not save_in.nid:
            # Create new network flow
            try:
                # Network name will be encrypted in create_with_user
                network_create = NetworkCreate(name=extracted_info.name)
                db_network = network.create_with_user(
                    db, obj_in=network_create, user_id=current_user["uid"])
                logger.info(f"Created new network {
                            db_network.nid} for user {current_user['uid']}")

                # Content will be encrypted in create_with_user
                content_create = ContentCreate(
                    content=extracted_info.content, network_id=db_network.nid)
                content.create_with_user(
                    db, obj_in=content_create, user_id=current_user["uid"])

                return {"message": "Information saved successfully"}
            except Exception as e:
                logger.error(f"Failed to create new network for user {
                             current_user['uid']}: {str(e)}")
                raise
        else:
            # Add to existing network flow
            db_network = network.get_user_network(
                db, user_id=current_user["uid"], nid=save_in.nid)
            if not db_network:
                logger.error(f"Network {save_in.nid} not found for user {
                             current_user['uid']}")
                raise HTTPException(
                    status_code=404, detail="Network not found")

            try:
                # Content will be encrypted in create_with_user
                content_create = ContentCreate(
                    content=extracted_info.content, network_id=save_in.nid)
                content.create_with_user(
                    db, obj_in=content_create, user_id=current_user["uid"])
                logger.info(f"Added new content to network {
                            save_in.nid} for user {current_user['uid']}")

                return {"message": "Information added successfully"}
            except Exception as e:
                logger.error(f"Failed to add content to network {
                             save_in.nid} for user {current_user['uid']}: {str(e)}")
                raise

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving content for user {
                     current_user['uid']}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

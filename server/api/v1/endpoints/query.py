from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import pytz
from uuid import UUID
from crud import network, content
from schemas.network import NetworkCreate
from schemas.content import ContentCreate
from core.firebase import get_current_user
from database.db import get_db
from core.vector_store import get_vector_store
from services.llm import extract_information, answer_question, Message, summarize_content, determine_action_type
import logging
from config import N_RESULTS

logger = logging.getLogger(__name__)

router = APIRouter()


class QueryRequest(BaseModel):
    query: str
    name: str = "Assistant"
    nid: Optional[UUID] = None
    messages: List[Message]


class QueryResponse(BaseModel):
    answer: str
    message: str
    date: str


class SaveRequest(BaseModel):
    nid: Optional[UUID] = None
    text: str


class ActionTypeRequest(BaseModel):
    text: str


class ActionTypeResponse(BaseModel):
    action_type: str


@router.post("/query", response_model=QueryResponse)
async def process_query(
    *,
    db: Session = Depends(get_db),
    query_in: QueryRequest,
    current_user: dict = Depends(get_current_user),
    timezone: str = "UTC"
) -> Any:
    """
    Process a query using semantic search for network content if provided, 
    or general knowledge if no network is selected.
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

        relevant_contents = []

        # Only query network content if nid is provided
        if query_in.nid:
            db_network = network.get_user_network(
                db, user_id=current_user["uid"], nid=query_in.nid)
            if not db_network:
                logger.error(f"Network {query_in.nid} not found for user {
                             current_user['uid']}")
                raise HTTPException(
                    status_code=404, detail="Network not found")

            # Get all relevant contents, either from vector store or traditional retrieval
            # Try vector store first
            try:
                vector_store = get_vector_store()
                relevant_docs = vector_store.query_documents(
                    query_text=query_in.query,
                    network_id=query_in.nid,
                    min_relevance_score=0.3  # Only include somewhat relevant matches
                )

                # Get content IDs from the results
                content_ids = [doc['metadata']['content_id']
                               for doc in relevant_docs]

                # Fetch full content from database for these IDs
                for content_id in content_ids:
                    db_content = content.get(db, id=content_id)
                    if db_content and db_content.network_id == query_in.nid:
                        decrypted_content = db_content.get_decrypted_content(
                            current_user["uid"])
                        # Add timestamp if not already present
                        if not decrypted_content.startswith("[20"):
                            timestamp = db_content.created_at.strftime(
                                "[%Y-%m-%d %H:%M:%S]")
                            decrypted_content = f"{
                                timestamp} {decrypted_content}"
                        relevant_contents.append(decrypted_content)

            except Exception as e:
                logger.error(f"Error querying vector store for network {
                             query_in.nid}: {str(e)}")
                logger.info("Falling back to traditional content retrieval")

                # Fallback to traditional content retrieval
                contents = content.get_by_network(
                    db, network_id=query_in.nid, user_id=current_user["uid"])
                for c in contents:
                    decrypted_content = c.get_decrypted_content(
                        current_user["uid"])
                    if not decrypted_content.startswith("[20"):
                        timestamp = c.created_at.strftime(
                            "[%Y-%m-%d %H:%M:%S]")
                        decrypted_content = f"{timestamp} {decrypted_content}"
                    relevant_contents.append(decrypted_content)

            if not relevant_contents:
                logger.warning(
                    f"No relevant content found for query in network {query_in.nid}")
                return {
                    "answer": "I couldn't find any relevant information to answer your question.",
                    "message": "No relevant content found",
                    "date": formatted_date
                }

        # Process query using LLM with relevant content (or none if no network selected)
        try:
            # If no content is available, pass a special empty context message
            if not relevant_contents:
                relevant_contents = [
                    "NO_NETWORK_SELECTED - Use general knowledge to answer this question."]
                name = "No One Selected"  # Clear indication that no network/person is selected
            else:
                name = query_in.name if query_in.name and query_in.name.strip() else "Network"

            answer = answer_question(
                name=name,  # Use context-appropriate name
                question=query_in.query,
                messages=query_in.messages,
                content_array=relevant_contents
            )

            return {
                "answer": answer,
                "message": "Query processed successfully",
                "date": formatted_date
            }
        except Exception as e:
            logger.error(f"Error processing query with LLM: {str(e)}")
            raise HTTPException(
                status_code=500, detail="Failed to process query")

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
    current_user: dict = Depends(get_current_user),
    x_timezone: str = Header(default="UTC", alias="X-Timezone")
) -> Any:
    """
    Save content to a network.
    """
    try:
        # Parse the timezone from header
        try:
            tz = pytz.timezone(x_timezone)
        except pytz.exceptions.UnknownTimeZoneError as e:
            logger.warning(f"Invalid timezone {
                           x_timezone}, defaulting to UTC. Error: {str(e)}")
            tz = pytz.UTC

        vector_store = get_vector_store()
        now = datetime.now(tz)  # Get current time in user's timezone

        if not save_in.nid:
            # Create new network flow - extract both name and content
            try:
                # Extract information using Gemini
                extracted_info = extract_information(save_in.text)

                # Network name will be encrypted in create_with_user
                network_create = NetworkCreate(name=extracted_info.name)
                db_network = network.create_with_user(
                    db, obj_in=network_create, user_id=current_user["uid"], created_at=now)
                logger.info(f"Created new network {
                            db_network.nid} for user {current_user['uid']}")

                # Content will be encrypted in create_with_user
                content_create = ContentCreate(
                    content=extracted_info.content, network_id=db_network.nid)
                db_content = content.create_with_user(
                    db, obj_in=content_create, user_id=current_user["uid"], created_at=now)

                # Index the content in vector store
                try:
                    vector_store.add_or_update_documents(
                        documents=[extracted_info.content],
                        network_id=db_network.nid,
                        metadata=[{
                            "network_id": db_network.nid,
                            "content_id": db_content.cid,
                            "user_id": current_user["uid"],
                            "created_at": db_content.created_at.isoformat()
                        }]
                    )
                except Exception as e:
                    logger.error(
                        f"Failed to index content in vector store: {str(e)}")
                    # Don't raise here - we still saved to SQL DB successfully

                return {"message": "Information saved successfully"}
            except Exception as e:
                logger.error(f"Failed to create new network for user {
                             current_user['uid']}: {str(e)}")
                raise
        else:
            # Add to existing network flow - just add the content as is
            db_network = network.get_user_network(
                db, user_id=current_user["uid"], nid=save_in.nid)
            if not db_network:
                logger.error(f"Network {save_in.nid} not found for user {
                             current_user['uid']}")
                raise HTTPException(
                    status_code=404, detail="Network not found")

            try:
                # Summarize the content first
                summarized_content = summarize_content(save_in.text)

                # Content will be encrypted in create_with_user
                content_create = ContentCreate(
                    content=summarized_content, network_id=save_in.nid)
                db_content = content.create_with_user(
                    db, obj_in=content_create, user_id=current_user["uid"], created_at=now)

                # Index the content in vector store
                try:
                    vector_store.add_or_update_documents(
                        documents=[summarized_content],
                        network_id=save_in.nid,
                        metadata=[{
                            "network_id": save_in.nid,
                            "content_id": db_content.cid,
                            "user_id": current_user["uid"],
                            "created_at": db_content.created_at.isoformat()
                        }]
                    )
                except Exception as e:
                    logger.error(
                        f"Failed to index content in vector store: {str(e)}")
                    # Don't raise here - we still saved to SQL DB successfully

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


@router.post("/determine_action", response_model=ActionTypeResponse)
async def determine_action(
    *,
    request: ActionTypeRequest,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Determine if the input text is a question (ask) or information to save.
    """
    try:
        action_type = determine_action_type(request.text)
        return {"action_type": "send" if action_type == "ask" else "save"}
    except Exception as e:
        logger.error(f"Error determining action type for user {
                     current_user['uid']}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

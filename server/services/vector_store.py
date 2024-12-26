import chromadb
from chromadb.config import Settings
import os
from typing import List, Optional
import logging
from datetime import datetime
from uuid import UUID
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from langchain.schema import Document
from dotenv import load_dotenv
from config import N_RESULTS

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class VectorStore:
    def __init__(self, persist_directory: str = os.getenv("CHROMA_DB_PATH")):
        """Initialize ChromaDB with persistence using LangChain"""
        try:
            self.persist_directory = persist_directory
            logger.info(f"Initializing ChromaDB with persistence directory: {
                        persist_directory}")

            if not os.path.exists(persist_directory):
                os.makedirs(persist_directory)
                logger.info(f"Created persistence directory: {
                            persist_directory}")

            # Initialize Google Gemini embeddings with API key from environment
            gemini_api_key = os.getenv("GEMINI_API_KEY")
            if not gemini_api_key:
                raise ValueError(
                    "GEMINI_API_KEY environment variable is not set")

            self.embedding_function = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",  # Gemini's text embedding model
                google_api_key=gemini_api_key,
            )

            # Initialize Chroma through LangChain
            self.vectorstore = Chroma(
                persist_directory=persist_directory,
                embedding_function=self.embedding_function,
                collection_name="network_content"
            )

            logger.info(
                "ChromaDB client initialized successfully with LangChain and Gemini embeddings")

        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {str(e)}")
            raise

    def add_or_update_documents(
        self,
        documents: List[str],
        network_id: UUID,
        document_ids: Optional[List[str]] = None,
        metadata: Optional[List[dict]] = None
    ):
        """
        Add or update documents in the vector store using LangChain

        Args:
            documents: List of text content to add
            network_id: Network ID these documents belong to (UUID)
            document_ids: Optional list of unique IDs for the documents
            metadata: Optional list of metadata dicts for each document
        """
        if document_ids is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            document_ids = [f"{str(network_id)}_{timestamp}_{
                i}" for i in range(len(documents))]

        if metadata is None:
            metadata = [{"network_id": str(network_id)} for _ in documents]
        else:
            for meta in metadata:
                meta["network_id"] = str(network_id)
                if "content_id" in meta:
                    meta["content_id"] = str(meta["content_id"])

        try:
            # Create LangChain documents
            langchain_docs = [
                Document(
                    page_content=doc,
                    metadata={"id": doc_id, **meta}
                )
                for doc, doc_id, meta in zip(documents, document_ids, metadata)
            ]

            # Add documents using LangChain
            self.vectorstore.add_documents(langchain_docs)

            logger.info(
                f"Added {len(documents)} documents to ChromaDB for network {network_id}")

        except Exception as e:
            logger.error(f"Error adding documents to vector store: {str(e)}")
            logger.error(f"Failed document IDs: {document_ids}")
            raise

    def query_documents(
        self,
        query_text: str,
        network_id: UUID,
        min_relevance_score: float = 0.0
    ) -> List[dict]:
        """
        Query the vector store for relevant documents using LangChain

        Args:
            query_text: The query text to search for
            network_id: Network ID to filter results (UUID)
            n_results: Number of results to return
            min_relevance_score: Minimum relevance score (0 to 1) for a document to be included

        Returns:
            List of documents with their metadata and relevance scores, sorted by relevance
        """
        try:
            logger.info(f"Querying ChromaDB for network {
                        network_id} with query: '{query_text}'")

            # Use LangChain's similarity search with score
            results = self.vectorstore.similarity_search_with_score(
                query_text,
                k=N_RESULTS,
                filter={"network_id": str(network_id)}
            )

            documents = []
            for doc, distance in results:
                # Convert distance to similarity score
                relevance_score = 1 / (1 + distance)
                if relevance_score >= min_relevance_score:
                    documents.append({
                        "content": doc.page_content,
                        "metadata": doc.metadata,
                        "relevance_score": relevance_score
                    })

            # Sort by relevance score
            documents.sort(key=lambda x: x['relevance_score'], reverse=True)

            logger.info(
                f"Found {len(documents)} relevant documents for network {network_id}")
            return documents

        except Exception as e:
            logger.error(f"Error querying vector store: {str(e)}")
            raise

    def delete_network_documents(self, network_id: UUID):
        """Delete all documents for a specific network"""
        try:
            self.vectorstore.delete(
                filter={"network_id": str(network_id)}
            )
            logger.info(
                f"Successfully deleted documents for network {network_id}")

        except Exception as e:
            logger.error(
                f"Error deleting documents from vector store: {str(e)}")
            raise

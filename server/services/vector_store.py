import chromadb
from chromadb.config import Settings
import os
from typing import List, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class VectorStore:
    def __init__(self, persist_directory: str = os.getenv("CHROMA_DB_PATH")):
        """Initialize ChromaDB with persistence"""
        try:
            self.persist_directory = persist_directory
            logger.info(f"Initializing ChromaDB with persistence directory: {
                        persist_directory}")

            if not os.path.exists(persist_directory):
                os.makedirs(persist_directory)
                logger.info(f"Created persistence directory: {
                            persist_directory}")

            self.client = chromadb.PersistentClient(
                path=persist_directory,
                settings=Settings(
                    allow_reset=True,
                    anonymized_telemetry=False
                )
            )
            logger.info("ChromaDB client initialized successfully")

            # List all collections to verify connection
            collections = self.client.list_collections()
            logger.info(f"Existing collections: {
                        [col.name for col in collections]}")

            # Create or get the collection for storing network content
            self.collection = self.client.get_or_create_collection(
                name="network_content",
                metadata={"hnsw:space": "cosine"}
            )
            doc_count = self.collection.count()
            logger.info(f"ChromaDB collection 'network_content' initialized with {
                        doc_count} documents")

        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {str(e)}")
            raise

    def add_or_update_documents(
        self,
        documents: List[str],
        network_id: int,
        document_ids: Optional[List[str]] = None,
        metadata: Optional[List[dict]] = None
    ):
        """
        Add or update documents in the vector store

        Args:
            documents: List of text content to add
            network_id: Network ID these documents belong to
            document_ids: Optional list of unique IDs for the documents
            metadata: Optional list of metadata dicts for each document
        """
        if document_ids is None:
            # Generate IDs using timestamp and index
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            document_ids = [f"{network_id}_{timestamp}_{
                i}" for i in range(len(documents))]

        if metadata is None:
            metadata = [{"network_id": network_id} for _ in documents]
        else:
            # Ensure network_id is in metadata
            for meta in metadata:
                meta["network_id"] = network_id

        try:
            # Log the state before addition
            pre_count = self.collection.count()
            logger.info(f"Current document count before addition: {pre_count}")
            logger.info(
                f"Adding {len(documents)} documents to ChromaDB for network {network_id}")
            logger.info(f"Document IDs to be added: {document_ids}")
            logger.info(f"First document content (truncated): {
                        documents[0][:100] if documents else 'No documents'}")
            logger.info(f"Metadata for documents: {metadata}")

            # Verify the collection exists
            collections = self.client.list_collections()
            logger.info(f"Available collections before addition: {
                        [col.name for col in collections]}")

            # Add documents
            self.collection.add(
                documents=documents,
                ids=document_ids,
                metadatas=metadata
            )

            # Verify addition
            post_count = self.collection.count()
            # Get count of documents for this network using get() with where filter
            network_docs = self.collection.get(
                where={"network_id": network_id}
            )
            network_doc_count = len(network_docs['ids']) if network_docs else 0

            logger.info(f"Document count after addition: {
                        post_count} (change of {post_count - pre_count})")
            logger.info(f"Network {network_id} now has {
                        network_doc_count} documents in ChromaDB")

            # Verify the documents were actually added by trying to retrieve them
            for doc_id in document_ids:
                try:
                    result = self.collection.get(ids=[doc_id])
                    if result and result['ids']:
                        logger.info(f"Successfully verified document {
                                    doc_id} was added")
                    else:
                        logger.error(
                            f"Document {doc_id} was not found after addition")
                except Exception as e:
                    logger.error(f"Error verifying document {
                                 doc_id}: {str(e)}")

        except Exception as e:
            logger.error(f"Error adding documents to vector store: {str(e)}")
            logger.error(f"Failed document IDs: {document_ids}")
            raise

    def query_documents(
        self,
        query_text: str,
        network_id: int,
        n_results: int = 5
    ) -> List[dict]:
        """
        Query the vector store for relevant documents

        Args:
            query_text: The query text to search for
            network_id: Network ID to filter results
            n_results: Number of results to return

        Returns:
            List of documents with their metadata and relevance scores
        """
        try:
            logger.info(f"Querying ChromaDB for network {
                        network_id} with query: '{query_text}'")

            results = self.collection.query(
                query_texts=[query_text],
                n_results=n_results,
                where={"network_id": network_id}
            )

            # Format results
            documents = []
            if results['documents']:
                for doc, metadata, distance in zip(
                    results['documents'][0],
                    results['metadatas'][0],
                    results['distances'][0]
                ):
                    documents.append({
                        "content": doc,
                        "metadata": metadata,
                        "relevance_score": 1 - distance  # Convert distance to similarity score
                    })

                logger.info(
                    f"Found {len(documents)} relevant documents for network {network_id}")
                logger.debug(f"Document scores: {
                             [doc['relevance_score'] for doc in documents]}")
            else:
                logger.info(
                    f"No relevant documents found for network {network_id}")

            return documents

        except Exception as e:
            logger.error(f"Error querying vector store: {str(e)}")
            raise

    def delete_network_documents(self, network_id: int):
        """Delete all documents for a specific network"""
        try:
            # Get count before deletion using get()
            pre_docs = self.collection.get(where={"network_id": network_id})
            pre_count = len(pre_docs['ids']) if pre_docs else 0
            logger.info(f"Attempting to delete {
                        pre_count} documents for network {network_id}")

            self.collection.delete(
                where={"network_id": network_id}
            )

            # Verify deletion using get()
            post_docs = self.collection.get(where={"network_id": network_id})
            post_count = len(post_docs['ids']) if post_docs else 0
            logger.info(f"Successfully deleted documents. Network {
                        network_id} went from {pre_count} to {post_count} documents")

        except Exception as e:
            logger.error(
                f"Error deleting documents from vector store: {str(e)}")
            raise

import chromadb
from sentence_transformers import SentenceTransformer
from chromadb.config import Settings
import uuid
import os
import datetime


class VectorStore:
    def __init__(self):
        # Get absolute path for ChromaDB
        current_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(current_dir, "chroma_db")

        # Initialize ChromaDB with persistent storage
        self.client = chromadb.PersistentClient(path=db_path)

        try:
            # Create or get collection
            self.collection = self.client.get_or_create_collection(
                name="user_knowledge",
                metadata={"hnsw:space": "cosine"}
            )

            # Initialize sentence transformer
            self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print(f"Error initializing VectorStore: {str(e)}")
            raise

    def add_text(self, text: str, metadata: dict = None):
        try:
            # Generate embeddings
            embeddings = self.encoder.encode([text]).tolist()

            # Generate a unique ID
            doc_id = str(uuid.uuid4())

            # Ensure metadata is a non-empty dict
            if not metadata:
                metadata = {"timestamp": str(datetime.datetime.now())}

            # Add to ChromaDB
            self.collection.add(
                embeddings=embeddings,
                documents=[text],
                metadatas=[metadata],
                ids=[doc_id]
            )

            return doc_id
        except Exception as e:
            print(f"Add text error: {str(e)}")
            print(f"Text: {text}")
            print(f"Metadata: {metadata}")
            raise Exception(f"Failed to add text: {str(e)}")

    def search(self, query: str, n_results: int = 3):
        # Generate query embedding
        query_embedding = self.encoder.encode([query]).tolist()

        try:
            # Search in ChromaDB
            results = self.collection.query(
                query_embeddings=query_embedding,
                n_results=min(n_results, self.collection.count())
            )
            return results
        except Exception as e:
            print(f"Search error: {str(e)}")
            return {"documents": [], "metadatas": [], "distances": []}

    def delete_text(self, text_id: str):
        try:
            self.collection.delete(ids=[text_id])
        except Exception as e:
            print(f"Delete error: {str(e)}")
            raise e

    def update_text(self, text_id: str, new_text: str, metadata: dict = None):
        try:
            # Generate new embedding
            embeddings = self.encoder.encode([new_text]).tolist()

            # Update in ChromaDB
            self.collection.update(
                embeddings=embeddings,
                documents=[new_text],
                metadatas=[metadata or {}],
                ids=[text_id]
            )
        except Exception as e:
            print(f"Update error: {str(e)}")
            raise e

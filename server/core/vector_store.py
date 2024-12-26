from services.vector_store import VectorStore
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get ChromaDB path from environment variable
CHROMA_DB_PATH = os.getenv('CHROMA_DB_PATH', './database')

# Create a global instance of the vector store
vector_store = VectorStore(persist_directory=CHROMA_DB_PATH)


def get_vector_store() -> VectorStore:
    """
    Get the global vector store instance.
    This follows the same pattern as database connection handling.
    """
    return vector_store

import os
import pathlib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv

from database import VectorStore
from models import TextInput, UpdateText, ChatMessage, ChatHistory

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-pro')

# Ensure ChromaDB directory exists
CHROMA_PATH = "./chroma_db"
pathlib.Path(CHROMA_PATH).mkdir(parents=True, exist_ok=True)

# Initialize vector store with absolute path
vector_store = VectorStore()


@app.post("/chat")
async def chat(chat_history: ChatHistory):
    # Get the user's latest message
    user_message = chat_history.messages[-1].content

    # Search for relevant context
    search_results = vector_store.search(user_message)

    # Check if we have any relevant documents
    if search_results['documents'] and len(search_results['documents'][0]) > 0:
        relevant_docs = search_results['documents'][0]
        context = "\n".join(relevant_docs)
        prompt = f"""Context: {context}\n\nUser: {
            user_message}\n\nAssistant: Please provide a response based on the context provided."""
    else:
        # If no relevant context is found, just use the user message directly
        prompt = f"""User: {user_message}
            \n\nAssistant: Please provide a helpful response."""

    # Generate response using Gemini
    response = model.generate_content(prompt)

    return {"response": response.text}


@app.post("/save")
async def save_text(text_input: TextInput):
    try:
        print(f"Received save request with text: {text_input.text}")
        print(f"Metadata: {text_input.metadata}")

        doc_id = vector_store.add_text(text_input.text, text_input.metadata)
        return {"message": "Text saved successfully", "id": doc_id}
    except Exception as e:
        print(f"Error in save_text endpoint: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/update")
async def update_text(update_data: UpdateText):
    try:
        vector_store.update_text(
            update_data.text_id,
            update_data.new_text,
            update_data.metadata
        )
        return {"message": "Text updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/delete/{text_id}")
async def delete_text(text_id: str):
    try:
        vector_store.delete_text(text_id)
        return {"message": "Text deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

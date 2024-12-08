import json
import os
import pathlib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv
from typing import Dict
import datetime

from database import VectorStore
from models import TextInput, ChatHistory, ExtractedInformation

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
model = genai.GenerativeModel(
    'gemini-1.5-flash',
    generation_config={
        "max_output_tokens": 80,
        "temperature": 0.2,
        "top_p": 0.2,
        "top_k": 5,
    },
    system_instruction="You are an AI assistant using RAG to help users access their personal memories and information. The context provided represents the user's experiences and memories, NOT yours. Never claim these experiences as your own. Instead, refer to them as 'your' (the user's) experiences.")

# Ensure ChromaDB directory exists
CHROMA_PATH = "./chroma_db"
pathlib.Path(CHROMA_PATH).mkdir(parents=True, exist_ok=True)

# Initialize vector store with absolute path
vector_store = VectorStore()


async def extract_information(text: str) -> ExtractedInformation:
    extraction_prompt = """
    Extract the following information from the text. If information is not present, use "Unknown":
    - Name (of person being described)
    - Notes (key details or description)

    Example:
    Input: "I met with Sarah Johnson yesterday. She's a biomedical researcher working on developing new cancer treatments using immunotherapy. She mentioned her team recently published a breakthrough paper in Nature about T-cell engineering."
    Output: {
        "name": "Sarah Johnson",
        "notes": "Biomedical researcher working on cancer treatments using immunotherapy. Published breakthrough paper in Nature about T-cell engineering."
    }
    """

    schema = {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "notes": {"type": "string"}
        },
        "required": ["name", "notes"]
    }

    response = model.generate_content(
        extraction_prompt + f"\n\nText to analyze: {text}",
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema=schema
        )
    )

    json_text = json.loads(response.candidates[0].content.parts[0].text)

    try:
        return ExtractedInformation(name=json_text["name"], notes=json_text["notes"])
    except Exception:
        # Fallback if parsing fails
        return ExtractedInformation(name="Unknown", notes=text)


@app.post("/chat")
async def chat(chat_history: ChatHistory):
    # Get the user's latest message
    user_message = chat_history.messages[-1].content

    # Search for relevant context
    search_results = vector_store.search(user_message)

    # Convert chat history to Gemini's format
    gemini_history = []
    for msg in chat_history.messages[:-1]:  # Exclude the latest message
        role = "user" if msg.role == "user" else "model"
        gemini_history.append({"role": role, "parts": [{"text": msg.content}]})

    # Create chat
    chat = model.start_chat(history=gemini_history)

    # Check if we have any relevant documents
    if search_results['documents'] and len(search_results['documents'][0]) > 0:
        relevant_docs = search_results['documents'][0]
        user_context = "\n".join(relevant_docs)
        prompt = f"""
            User's Personal Context: {user_context}
            User Message: {user_message}"""
    else:
        prompt = user_message

    response = chat.send_message(prompt)

    return {"response": response.text}


@app.post("/save")
async def save_text(text_input: TextInput):
    try:

        # Extract structured information
        extracted_info: ExtractedInformation = await extract_information(text_input.text)

        print("extracted_info.name: " + str(extracted_info.name))
        print("extracted_info.notes: " + str(extracted_info.notes))

        # Combine existing metadata with extracted information
        metadata = {
            "name": extracted_info.name,
            "notes": extracted_info.notes,
            "timestamp": str(datetime.datetime.now())
        }

        print(f"Extracted metadata: {metadata}")

        doc_id = vector_store.add_text(text_input.text, metadata)
        return {
            "message": "Text saved successfully",
            "id": doc_id,
            "extracted_info": extracted_info
        }
    except Exception as e:
        print(f"Error in save_text endpoint: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# @app.post("/update")
# async def update_text(update_data: UpdateText):
#     try:
#         vector_store.update_text(
#             update_data.text_id,
#             update_data.new_text,
#             update_data.metadata
#         )
#         return {"message": "Text updated successfully"}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))


# @app.delete("/delete/{text_id}")
# async def delete_text(text_id: str):
#     try:
#         vector_store.delete_text(text_id)
#         return {"message": "Text deleted successfully"}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

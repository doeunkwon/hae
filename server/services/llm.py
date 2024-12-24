import os
from typing import List
from datetime import datetime
import json
import google.generativeai as genai
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

# Initialize Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set")

genai.configure(api_key=GEMINI_API_KEY)


class ExtractedInfo(BaseModel):
    content: str
    name: str


class Message(BaseModel):
    content: str
    role: str


def extract_information(input_text: str) -> ExtractedInfo:
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        model.temperature = 0

        prompt = f"""
            You are a personal CRM assistant. From the following interaction, identify the main person and what happened.

            Interaction: {input_text}

            Respond ONLY with a JSON object in this format:
            {{ "content": "A concise summary focusing on what happened with this person",
                "name": "The person's full name" }}

            Example input:
            "Had coffee with Alex Zhang this morning. We discussed his recent promotion at Google and his plans to move to the AI team. His wife Sarah was there too and mentioned their upcoming trip to Japan."

            Example output:
            {{ "content": "Met for coffee. Discussed his promotion at Google and planned move to the AI team. Mentioned upcoming Japan trip.", "name": "Alex Zhang" }}

            Rules:
            - If multiple people are mentioned, focus on the most significant person
            - Extract the most complete version of their name
            - The content should be a brief, clear summary (aim for 1-2 lines)
            - Include key facts but omit unnecessary details
            - Return ONLY the JSON, no other text
            - Do not include markdown formatting or code blocks
        """

        response = model.generate_content(prompt)
        text = response.text.strip()

        # Remove markdown code block if present
        if text.startswith("```") and text.endswith("```"):
            # Extract content between the code block markers
            lines = text.split("\n")
            if len(lines) > 2:  # Ensure we have content between markers
                # Remove first and last lines (markers)
                text = "\n".join(lines[1:-1])
            else:
                text = text.replace("```", "")

        # Remove "json" language identifier if present
        text = text.replace("```json", "").replace("```", "").strip()

        result = json.loads(text)
        extracted_info = ExtractedInfo(**result)

        if not extracted_info.name or not extracted_info.content:
            logger.error(
                f"Invalid Gemini response - missing required fields. Raw text: {text}")
            raise ValueError(
                f"invalid response: missing required fields\nraw text: {text}")

        return extracted_info

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {
                     str(e)}\nRaw text: {text}")
        raise Exception(f"Failed to process content: Invalid JSON response")
    except Exception as e:
        logger.error(f"Error extracting information: {
                     str(e)}\nInput text: {input_text}")
        raise Exception(f"Failed to process content: {str(e)}")


def answer_question(name: str, question: str, messages: List[Message], content_array: List[str]) -> str:
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        model.temperature = 1.0

        # Combine the content array into a single string
        content = "\n".join(content_array)

        system_prompt = f"""
            You are a knowledgeable assistant helping me recall information about {name}. These are my personal memories and interactions with {name}.

            Today's date is: {datetime.now().strftime('%B %d, %Y')}

            My memories about {name} (in chronological order):
            {content}

            Question:
            {question}

            Instructions:
            - Understand that all content represents my (the user's) direct experiences and interactions with {name}
            - Each memory is prefixed with a timestamp in [YYYY-MM-DD HH:MM:SS] format
            - For example, if a memory says "[2024-01-20 15:30:00] Had coffee and discussed AI", it means I personally had coffee with {name} on January 20th, 2024
            - When answering questions about timing or sequence of events, use these timestamps
            - If memories are provided, base your answer strictly on these personal interactions
            - If no memories are provided or memories are empty, you may:
                a) For general knowledge questions (unrelated to {name}), answer directly without any reference to memories
                b) For questions about {name}, acknowledge that I haven't shared any relevant memories
            - Never make up or assume interactions that aren't explicitly mentioned in my memories
            - Be transparent about what you can and cannot determine from my shared experiences
            - Provide direct answers without:
                - Explaining why you know something
                - Mentioning what information was or wasn't provided
                - Prefacing your answer with phrases like "Based on the content..." or "I can tell you that..."
                - Adding qualifiers unless absolutely necessary
        """

        chat = model.start_chat(history=[])

        # Add system prompt
        chat.send_message(system_prompt)

        # Add message history
        for message in messages:
            chat.send_message(message.content, role=message.role)

        # Send the question and get response
        response = chat.send_message(question)
        if response.text:
            return response.text

        logger.error(f"Empty response from Gemini for question about {name}")
        raise ValueError("No valid response generated")
    except Exception as e:
        logger.error(f"Error answering question about {name}: {str(e)}\nQuestion: {
                     question}\nContent array length: {len(content_array)}")
        raise Exception(f"Failed to generate content: {str(e)}")

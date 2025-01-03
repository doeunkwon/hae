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


# Split into two constants - static instructions and dynamic content template
STATIC_INSTRUCTIONS = """
    You are a knowledgeable assistant helping recall information about people from my personal memories.
    
    Instructions:
    - These memories are direct interactions between ME (the user) and the person in question
    - When you see "I" in any memory, it refers to ME, the person asking you questions
    - Each memory is prefixed with a timestamp in [YYYY-MM-DD HH:MM:SS] format
    - When answering questions about timing or sequence of events, use these timestamps
    - Base your answers primarily on my personal interactions with this person
    - If there isn't enough information in my memories:
        - Use your general knowledge to provide a helpful response
        - Make it clear when you're going beyond my personal interactions
        - Never make up specific facts about my relationship with this person
    - Provide direct answers without:
        - Explaining why you know something
        - Mentioning what information was or wasn't provided
        - Prefacing answers with phrases like "Based on the content..."
        - Adding unnecessary qualifiers

    Respond with 'UNDERSTOOD' if you acknowledge these instructions.
"""

MEMORY_CONTEXT_TEMPLATE = """
    Current context for {name}:
    Today's date is: {date}

    My memories about {name} (in chronological order):
    {content}
"""


def answer_question(name: str, question: str, messages: List[Message], content_array: List[str]) -> str:
    try:
        # Validate inputs
        if not question or not question.strip():
            raise ValueError("Question cannot be empty")
        if not content_array:
            raise ValueError("Content array cannot be empty")
        if not name:
            raise ValueError("Name cannot be empty")

        model = genai.GenerativeModel('gemini-1.5-flash')
        model.temperature = 1.0

        # Combine the content array into a single string
        content = "\n".join(content_array)
        if not content.strip():
            raise ValueError("Content cannot be empty after joining")

        # Create chat instance
        chat = model.start_chat()

        # Send static instructions first if this is a new conversation
        if not messages:
            response = chat.send_message(STATIC_INSTRUCTIONS)
            if not response.text or "UNDERSTOOD" not in response.text.upper():
                logger.error(f"Model did not acknowledge instructions properly: {
                             response.text}")
                raise ValueError("Model failed to acknowledge instructions")

        # Always send the current context
        context = MEMORY_CONTEXT_TEMPLATE.format(
            name=name,
            date=datetime.now().strftime('%B %d, %Y'),
            content=content
        )
        context_response = chat.send_message(context)
        if not context_response.text:
            logger.error("Empty response when sending context")
            raise ValueError("Failed to process context")

        # Send previous chat history
        if messages:
            for message in messages:
                if not message.content.strip():
                    continue  # Skip empty messages
                chat.send_message(message.content)

        # Finally send the current question and get response
        response = chat.send_message(question)
        if not response or not response.text or not response.text.strip():
            logger.error(
                f"Empty response from Gemini for question about {name}")
            raise ValueError("No valid response generated")

        return response.text.strip()

    except Exception as e:
        logger.error(f"Error answering question about {name}: {str(e)}\nQuestion: {
                     question}\nContent array length: {len(content_array)}")
        raise Exception(f"Failed to process query: {str(e)}")


def summarize_content(input_text: str) -> str:
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        model.temperature = 0

        prompt = f"""
            You are a personal CRM assistant. Summarize the following interaction in a clear, concise way.

            Interaction: {input_text}

            Rules:
            - Keep the summary brief but include all key information
            - Focus on facts and events
            - Maintain the original meaning and sentiment
            - Use clear, direct language
            - Return ONLY the summary text, no other text or formatting
        """

        response = model.generate_content(prompt)
        summary = response.text.strip()

        # Remove any markdown formatting if present
        if summary.startswith("```") and summary.endswith("```"):
            lines = summary.split("\n")
            if len(lines) > 2:
                summary = "\n".join(lines[1:-1])
            else:
                summary = summary.replace("```", "")

        return summary.strip()

    except Exception as e:
        logger.error(f"Error summarizing content: {
                     str(e)}\nInput text: {input_text}")
        raise Exception(f"Failed to summarize content: {str(e)}")


def determine_action_type(input_text: str) -> str:
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        model.temperature = 0

        prompt = f"""
            You are a personal CRM assistant. Determine if the following text is asking a question about someone (ask) or providing new information to save about someone (save).

            Text: {input_text}

            Rules:
            - Analyze if the text is asking for information or providing new information
            - "ask" = the text is asking for information or posing a question
            - "save" = the text is providing new information or describing an interaction
            - When in doubt, default to "ask"
            - Ignore any mentions of "save" or "ask" in the text itself - focus on the intent

            Respond with a JSON object in this EXACT format, nothing else:
            {{"action": "ask"}} or {{"action": "save"}}
        """

        response = model.generate_content(prompt)
        text = response.text.strip()

        # Remove any markdown formatting if present
        if text.startswith("```") and text.endswith("```"):
            lines = text.split("\n")
            if len(lines) > 2:  # Ensure we have content between markers
                text = "\n".join(lines[1:-1])
            else:
                text = text.replace("```", "")

        # Remove "json" language identifier if present
        text = text.replace("```json", "").replace("```", "").strip()

        try:
            result = json.loads(text)
            if "action" in result and result["action"] in ["ask", "save"]:
                action = result["action"]
                return action
            else:
                logger.error(f"Invalid action type in response: {text}")
                return "ask"  # Default to ask if response is invalid
        except json.JSONDecodeError:
            logger.error(f"Failed to parse response as JSON: {text}")
            logger.print(f"Defaulting to 'ask' for text: {
                         input_text[:100]}...")
            return "ask"  # Default to ask if JSON parsing fails

    except Exception as e:
        logger.error(f"Error determining action type: {
                     str(e)}\nInput text: {input_text}")
        logger.info(f"Defaulting to 'ask' for text: {input_text[:100]}...")
        return "ask"  # Default to ask on error

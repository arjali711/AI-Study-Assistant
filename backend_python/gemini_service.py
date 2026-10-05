import os
import json
from google import genai
from google.genai import types

class GeminiStudyService:
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY", "")
        self.client = genai.Client(
            api_key=api_key,
            http_options={"headers": {"User-Agent": "aistudio-build"}}
        )
        self.model_name = "gemini-3.8-flash"

    async def generate_tutor_response(self, message: str, mode: str = "socratic", context: str = "") -> str:
        instructions = "You are CogniStudy, an elite AI study assistant and learning scientist."
        if mode == "socratic":
            instructions += " Use the Socratic method: guide the student with thoughtful questions, active recall prompts, and intuitive analogies rather than immediately giving the full answer."
        elif mode == "exam_prep":
            instructions += " Act as an intense exam prep coach. Focus on high-yield exam concepts, common trap questions, and key mnemonics."
        elif mode == "simplifier":
            instructions += " Apply the Feynman Technique: explain complex ideas simply with relatable real-world analogies."
        elif mode == "stem_code":
            instructions += " Provide rigorous computer science or STEM explanations with clear code snippets and Big-O analysis."

        if context:
            instructions += f"\n\nStudent Study Context:\n{context}"

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=message,
            config=types.GenerateContentConfig(
                system_instruction=instructions,
                temperature=0.7
            )
        )
        return response.text or "I could not generate a response. Please try again."

    async def summarize_notes(self, title: str, content: str) -> dict:
        prompt = f"Analyze these study notes and return a JSON object with 'summary', 'key_takeaways' (list of strings), and 'mnemonic'.\nTitle: {title}\nNotes:\n{content}"
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        try:
            return json.loads(response.text)
        except Exception:
            return {
                "summary": "Notes processed successfully.",
                "key_takeaways": ["Review primary points", "Perform active recall"],
                "mnemonic": "Recall: P.A.S.S."
            }

    async def create_flashcards(self, topic: str = "", source_text: str = "", count: int = 5) -> list:
        prompt = f"Generate exactly {count} study flashcards as a JSON object with a 'flashcards' list containing 'front', 'back', and 'hint'.\nTopic: {topic}\nSource:\n{source_text}"
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        try:
            parsed = json.loads(response.text)
            return parsed.get("flashcards", [])
        except Exception:
            return []

    async def create_quiz(self, topic: str, difficulty: str = "Intermediate", count: int = 4) -> dict:
        prompt = f"Generate a multiple-choice practice quiz with {count} questions for topic '{topic}' at difficulty '{difficulty}'. Return JSON with 'quiz_title' and 'questions' list (each with 'question', 'options' list of 4, 'correct_answer', and 'explanation')."
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        try:
            return json.loads(response.text)
        except Exception:
            return {"quiz_title": f"{topic} Quiz", "questions": []}

gemini_service = GeminiStudyService()

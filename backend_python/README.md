# CogniStudy - Python FastAPI & SQLite Backend

This folder contains the complete production-ready Python backend implementation for the CogniStudy AI-Powered Study Assistant.

## Technology Stack
- **Framework:** FastAPI (Python 3.10+)
- **Database:** SQLite with SQLAlchemy ORM
- **Data Validation:** Pydantic v2
- **AI Integration:** Google Gemini 3.8 Flash (`google-genai` SDK)
- **ASGI Server:** Uvicorn

## Project Architecture
```
backend_python/
├── main.py            # FastAPI application routes, CORS, lifespan & error handlers
├── database.py        # SQLAlchemy SQLite engine, SessionLocal, and dependency injection
├── models.py          # Relational database models (Subjects, Notes, Flashcards, Quizzes, Sessions)
├── schemas.py         # Pydantic request and response schemas (data contracts)
├── gemini_service.py  # Google GenAI Gemini 3.8 Flash service (Chat, Flashcards, Quizzes, Summaries)
└── requirements.txt   # Pip dependencies
```

## How to Run Locally

1. Create and activate a Python virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set your Gemini API key:
```bash
export GEMINI_API_KEY="your-gemini-api-key"
```

4. Run the development server:
```bash
uvicorn main:app --reload --port 8000
```

5. Explore the interactive API documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

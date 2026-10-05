import os
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import models
import schemas
from gemini_service import gemini_service

# Initialize SQLite database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CogniStudy - AI-Powered Study Assistant API",
    description="Backend API built with Python, FastAPI, SQLite, and Google Gemini API.",
    version="1.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "app": "CogniStudy API",
        "status": "operational",
        "docs": "/docs",
        "database": "SQLite",
        "ai_engine": "Gemini 3.8 Flash"
    }

# ----------------- Subjects -----------------
@app.get("/api/subjects", response_model=List[schemas.SubjectResponse])
def get_subjects(db: Session = Depends(get_db)):
    return db.query(models.Subject).order_by(models.Subject.name).all()

@app.post("/api/subjects", response_model=schemas.SubjectResponse, status_code=201)
def create_subject(subject: schemas.SubjectCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Subject).filter(models.Subject.name == subject.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject already exists")
    db_subject = models.Subject(**subject.model_dump())
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

# ----------------- Notes -----------------
@app.get("/api/notes", response_model=List[schemas.NoteResponse])
def get_notes(
    subject_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Note)
    if subject_id:
        query = query.filter(models.Note.subject_id == subject_id)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (models.Note.title.ilike(search_filter)) |
            (models.Note.content.ilike(search_filter)) |
            (models.Note.tags.ilike(search_filter))
        )
    return query.order_by(models.Note.updated_at.desc()).all()

@app.post("/api/notes", response_model=schemas.NoteResponse, status_code=201)
def create_note(note: schemas.NoteCreate, db: Session = Depends(get_db)):
    db_note = models.Note(**note.model_dump())
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

@app.put("/api/notes/{note_id}", response_model=schemas.NoteResponse)
def update_note(note_id: int, note_update: schemas.NoteCreate, db: Session = Depends(get_db)):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    for key, value in note_update.model_dump().items():
        setattr(db_note, key, value)
    db.commit()
    db.refresh(db_note)
    return db_note

@app.delete("/api/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(db_note)
    db.commit()
    return {"success": True, "message": "Note deleted"}

# ----------------- Flashcards -----------------
@app.get("/api/flashcards/decks", response_model=List[schemas.DeckResponse])
def get_decks(db: Session = Depends(get_db)):
    return db.query(models.FlashcardDeck).order_by(models.FlashcardDeck.created_at.desc()).all()

@app.post("/api/flashcards/decks", response_model=schemas.DeckResponse, status_code=201)
def create_deck(deck: schemas.DeckCreate, db: Session = Depends(get_db)):
    db_deck = models.FlashcardDeck(**deck.model_dump())
    db.add(db_deck)
    db.commit()
    db.refresh(db_deck)
    return db_deck

@app.get("/api/flashcards/decks/{deck_id}/cards", response_model=List[schemas.FlashcardResponse])
def get_deck_cards(deck_id: int, db: Session = Depends(get_db)):
    return db.query(models.Flashcard).filter(models.Flashcard.deck_id == deck_id).all()

@app.post("/api/flashcards", response_model=schemas.FlashcardResponse, status_code=201)
def create_flashcard(card: schemas.FlashcardCreate, db: Session = Depends(get_db)):
    db_card = models.Flashcard(**card.model_dump())
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card

@app.put("/api/flashcards/{card_id}/review")
def review_flashcard(card_id: int, rating: str = Query(..., regex="^(again|good|mastered)$"), db: Session = Depends(get_db)):
    db_card = db.query(models.Flashcard).filter(models.Flashcard.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    
    level_map = {"again": 1, "good": 2, "mastered": 3}
    db_card.mastery_level = level_map[rating]
    db_card.reviews_count += 1
    db.commit()
    db.refresh(db_card)
    return db_card

# ----------------- AI Study Endpoints -----------------
@app.post("/api/chat", response_model=schemas.ChatResponse)
async def chat_with_tutor(req: schemas.ChatRequest):
    reply = await gemini_service.generate_tutor_response(
        message=req.message,
        mode=req.mode,
        context=req.context
    )
    return {"reply": reply}

@app.post("/api/ai/summarize-note")
async def summarize_note(req: schemas.SummarizeRequest):
    return await gemini_service.summarize_notes(title=req.title, content=req.content)

@app.post("/api/ai/generate-flashcards")
async def generate_flashcards(req: schemas.GenerateFlashcardsRequest, db: Session = Depends(get_db)):
    cards = await gemini_service.create_flashcards(
        topic=req.topic,
        source_text=req.source_text,
        count=req.count
    )
    # Save to deck if deck_id provided
    if req.deck_id:
        for c in cards:
            db_card = models.Flashcard(
                deck_id=req.deck_id,
                front=c["front"],
                back=c["back"],
                hint=c.get("hint", "")
            )
            db.add(db_card)
        db.commit()
    return {"flashcards": cards, "saved_to_deck": bool(req.deck_id)}

@app.post("/api/ai/generate-quiz")
async def generate_quiz(req: schemas.GenerateQuizRequest, db: Session = Depends(get_db)):
    quiz_data = await gemini_service.create_quiz(
        topic=req.topic,
        difficulty=req.difficulty,
        count=req.question_count
    )
    return quiz_data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

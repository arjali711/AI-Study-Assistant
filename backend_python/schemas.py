from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# Subject Schemas
class SubjectBase(BaseModel):
    name: str
    color: Optional[str] = "indigo"
    icon: Optional[str] = "BookOpen"

class SubjectCreate(SubjectBase):
    pass

class SubjectResponse(SubjectBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# Note Schemas
class NoteBase(BaseModel):
    subject_id: Optional[int] = None
    title: str
    content: str
    tags: Optional[str] = ""
    summary: Optional[str] = ""

class NoteCreate(NoteBase):
    pass

class NoteResponse(NoteBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# Flashcard Schemas
class FlashcardBase(BaseModel):
    front: str
    back: str
    hint: Optional[str] = ""

class FlashcardCreate(FlashcardBase):
    deck_id: int

class FlashcardResponse(FlashcardBase):
    id: int
    deck_id: int
    mastery_level: int
    reviews_count: int
    last_reviewed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class DeckBase(BaseModel):
    subject_id: Optional[int] = None
    title: str
    description: Optional[str] = ""

class DeckCreate(DeckBase):
    pass

class DeckResponse(DeckBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# AI Request & Response Schemas
class ChatRequest(BaseModel):
    message: str
    mode: Optional[str] = "socratic"
    context: Optional[str] = ""

class ChatResponse(BaseModel):
    reply: str

class SummarizeRequest(BaseModel):
    title: Optional[str] = ""
    content: str

class GenerateFlashcardsRequest(BaseModel):
    topic: Optional[str] = None
    source_text: Optional[str] = None
    count: Optional[int] = 5
    deck_id: Optional[int] = None

class GenerateQuizRequest(BaseModel):
    topic: str
    difficulty: Optional[str] = "Intermediate"
    question_count: Optional[int] = 4
    subject_id: Optional[int] = None

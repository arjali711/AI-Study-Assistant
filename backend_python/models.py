from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from database import Base

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    color = Column(String(50), default="indigo")
    icon = Column(String(50), default="BookOpen")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    notes = relationship("Note", back_populates="subject", cascade="all, delete")
    decks = relationship("FlashcardDeck", back_populates="subject", cascade="all, delete")
    quizzes = relationship("Quiz", back_populates="subject", cascade="all, delete")
    sessions = relationship("StudySession", back_populates="subject", cascade="all, delete")

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    tags = Column(String(255), default="")
    summary = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    subject = relationship("Subject", back_populates="notes")

class FlashcardDeck(Base):
    __tablename__ = "flashcard_decks"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    subject = relationship("Subject", back_populates="decks")
    cards = relationship("Flashcard", back_populates="deck", cascade="all, delete")

class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column(Integer, ForeignKey("flashcard_decks.id", ondelete="CASCADE"), nullable=False)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    hint = Column(String(255), default="")
    mastery_level = Column(Integer, default=0) # 0: unstudied, 1: again, 2: good, 3: mastered
    reviews_count = Column(Integer, default=0)
    last_reviewed_at = Column(DateTime(timezone=True), nullable=True)

    deck = relationship("FlashcardDeck", back_populates="cards")

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(200), nullable=False)
    topic = Column(String(100), nullable=False)
    difficulty = Column(String(50), default="Intermediate")
    total_questions = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    subject = relationship("Subject", back_populates="quizzes")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete")

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    options_json = Column(Text, nullable=False) # JSON encoded string
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=False)

    quiz = relationship("Quiz", back_populates="questions")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    time_spent_seconds = Column(Integer, default=0)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

    quiz = relationship("Quiz", back_populates="attempts")

class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    duration_minutes = Column(Integer, nullable=False)
    session_type = Column(String(50), default="pomodoro")
    notes = Column(Text, default="")
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

    subject = relationship("Subject", back_populates="sessions")

import {
  Subject,
  Note,
  FlashcardDeck,
  Flashcard,
  Quiz,
  StudySession,
  StudyGoal,
  AnalyticsData,
  SqlQueryResult,
  TableSchema,
} from '../types';

export const api = {
  // Health
  async getHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    const res = await fetch('/api/subjects');
    return res.json();
  },

  async createSubject(data: { name: string; color: string; icon: string }): Promise<Subject> {
    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Notes
  async getNotes(subjectId?: number | null, search?: string): Promise<Note[]> {
    const params = new URLSearchParams();
    if (subjectId) params.append('subject_id', String(subjectId));
    if (search) params.append('search', search);
    const res = await fetch(`/api/notes?${params.toString()}`);
    return res.json();
  },

  async createNote(data: { subject_id?: number | null; title: string; content: string; tags?: string; summary?: string }): Promise<Note> {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateNote(id: number, data: Partial<Note>): Promise<Note> {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteNote(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Flashcards
  async getDecks(): Promise<FlashcardDeck[]> {
    const res = await fetch('/api/flashcards/decks');
    return res.json();
  },

  async createDeck(data: { subject_id?: number | null; title: string; description?: string }): Promise<FlashcardDeck> {
    const res = await fetch('/api/flashcards/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getDeckCards(deckId: number): Promise<Flashcard[]> {
    const res = await fetch(`/api/flashcards/decks/${deckId}/cards`);
    return res.json();
  },

  async createFlashcard(data: { deck_id: number; front: string; back: string; hint?: string }): Promise<Flashcard> {
    const res = await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async reviewFlashcard(id: number, rating: 'again' | 'good' | 'mastered'): Promise<Flashcard> {
    const res = await fetch(`/api/flashcards/${id}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    });
    return res.json();
  },

  async deleteDeck(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`/api/flashcards/decks/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Quizzes
  async getQuizzes(): Promise<Quiz[]> {
    const res = await fetch('/api/quizzes');
    return res.json();
  },

  async getQuiz(id: number): Promise<Quiz> {
    const res = await fetch(`/api/quizzes/${id}`);
    return res.json();
  },

  async submitQuizAttempt(id: number, score: number, totalQuestions: number, timeSpentSeconds: number) {
    const res = await fetch(`/api/quizzes/${id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, total_questions: totalQuestions, time_spent_seconds: timeSpentSeconds }),
    });
    return res.json();
  },

  // Study Sessions & Goals
  async getStudySessions(): Promise<StudySession[]> {
    const res = await fetch('/api/study-sessions');
    return res.json();
  },

  async logStudySession(data: { subject_id?: number | null; duration_minutes: number; session_type: string; notes?: string }) {
    const res = await fetch('/api/study-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getGoals(): Promise<StudyGoal[]> {
    const res = await fetch('/api/goals');
    return res.json();
  },

  async createGoal(title: string, targetMinutes: number = 30): Promise<StudyGoal> {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, target_minutes: targetMinutes }),
    });
    return res.json();
  },

  async toggleGoal(id: number): Promise<StudyGoal> {
    const res = await fetch(`/api/goals/${id}/toggle`, { method: 'PUT' });
    return res.json();
  },

  // Analytics
  async getAnalytics(): Promise<AnalyticsData> {
    const res = await fetch('/api/analytics');
    return res.json();
  },

  // Gemini AI Endpoints
  async chatWithTutor(message: string, mode: string = 'socratic', context?: string): Promise<{ reply: string }> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, mode, context }),
    });
    return res.json();
  },

  async summarizeNote(title: string, content: string): Promise<{ summary: string; key_takeaways: string[]; mnemonic: string }> {
    const res = await fetch('/api/ai/summarize-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    return res.json();
  },

  async generateFlashcards(data: { topic?: string; source_text?: string; count?: number; deck_id?: number }) {
    const res = await fetch('/api/ai/generate-flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async generateQuiz(data: { topic: string; difficulty?: string; question_count?: number; subject_id?: number | null }) {
    const res = await fetch('/api/ai/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // SQL Studio
  async executeSql(sql: string): Promise<SqlQueryResult> {
    const res = await fetch('/api/database/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
    });
    return res.json();
  },

  async getDatabaseSchema(): Promise<TableSchema[]> {
    const res = await fetch('/api/database/schema');
    return res.json();
  },

  async resetDatabase() {
    const res = await fetch('/api/database/reset', { method: 'POST' });
    return res.json();
  },

  // Python Code Showcase
  async getPythonCode(): Promise<{ architecture: string; files: Record<string, string> }> {
    const res = await fetch('/api/python-code');
    return res.json();
  },
};

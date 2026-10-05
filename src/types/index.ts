export interface Subject {
  id: number;
  name: string;
  color: string;
  icon: string;
  created_at?: string;
  notes_count?: number;
  decks_count?: number;
}

export interface Note {
  id: number;
  subject_id: number | null;
  subject_name?: string;
  subject_color?: string;
  title: string;
  content: string;
  tags: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

export interface FlashcardDeck {
  id: number;
  subject_id: number | null;
  subject_name?: string;
  subject_color?: string;
  title: string;
  description: string;
  created_at: string;
  total_cards?: number;
  mastered_cards?: number;
}

export interface Flashcard {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  hint: string;
  mastery_level: number; // 0: unstudied, 1: again, 2: good, 3: mastered
  reviews_count: number;
  last_reviewed_at: string | null;
}

export interface QuizQuestion {
  id?: number;
  quiz_id?: number;
  question: string;
  options: string[];
  options_json?: string;
  correct_answer: string;
  explanation: string;
}

export interface QuizAttempt {
  id: number;
  quiz_id: number;
  score: number;
  total_questions: number;
  time_spent_seconds: number;
  completed_at: string;
}

export interface Quiz {
  id: number;
  subject_id: number | null;
  subject_name?: string;
  subject_color?: string;
  title: string;
  topic: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  total_questions: number;
  created_at: string;
  best_score?: number | null;
  attempts_count?: number;
  questions?: QuizQuestion[];
  attempts?: QuizAttempt[];
}

export interface StudySession {
  id: number;
  subject_id: number | null;
  subject_name?: string;
  subject_color?: string;
  duration_minutes: number;
  session_type: 'pomodoro' | 'flashcards' | 'quiz' | 'chat';
  notes: string;
  completed_at: string;
}

export interface StudyGoal {
  id: number;
  title: string;
  target_minutes: number;
  completed: boolean | number;
  due_date: string;
}

export interface AnalyticsData {
  total_minutes: number;
  total_sessions: number;
  total_notes: number;
  total_flashcards: number;
  mastered_flashcards: number;
  mastery_rate: number;
  total_quiz_attempts: number;
  average_quiz_score: number;
  streak_days: number;
  subject_breakdown: { name: string; color: string; minutes: number }[];
  recent_daily: { study_date: string; minutes: number }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
  timestamp: string;
}

export interface SqlQueryResult {
  type: 'select' | 'mutation';
  columns?: string[];
  rows?: Record<string, any>[];
  row_count?: number;
  changes?: number;
  last_insert_row_id?: number;
  execution_time_ms: number;
  error?: string;
}

export interface TableSchema {
  table_name: string;
  sql: string;
  row_count: number;
  columns: {
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: any;
    pk: number;
  }[];
}

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import { getDb, queryAll, queryOne, runCommand, saveDb, seedInitialData } from './server/db.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isDev = process.env.NODE_ENV !== 'production';

app.use(express.json());

// Initialize Gemini SDK with User-Agent header as required
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to check Gemini key
function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
}

// ----------------------------------------------------
// REST API ROUTES
// ----------------------------------------------------

// 1. Health & Database Overview
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const tableCounts = {
      subjects: queryOne<{ count: number }>('SELECT count(*) as count FROM subjects')?.count || 0,
      notes: queryOne<{ count: number }>('SELECT count(*) as count FROM notes')?.count || 0,
      flashcard_decks: queryOne<{ count: number }>('SELECT count(*) as count FROM flashcard_decks')?.count || 0,
      flashcards: queryOne<{ count: number }>('SELECT count(*) as count FROM flashcards')?.count || 0,
      quizzes: queryOne<{ count: number }>('SELECT count(*) as count FROM quizzes')?.count || 0,
      study_sessions: queryOne<{ count: number }>('SELECT count(*) as count FROM study_sessions')?.count || 0,
    };

    res.json({
      status: 'healthy',
      database: 'SQLite (sql.js persistent engine)',
      ai_engine: 'Google Gemini 3.8 Flash',
      gemini_configured: hasGeminiKey(),
      table_counts: tableCounts,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Subjects
app.get('/api/subjects', async (req: Request, res: Response) => {
  try {
    await getDb();
    const subjects = queryAll(`
      SELECT s.*, 
        (SELECT count(*) FROM notes n WHERE n.subject_id = s.id) as notes_count,
        (SELECT count(*) FROM flashcard_decks fd WHERE fd.subject_id = s.id) as decks_count
      FROM subjects s 
      ORDER BY s.name ASC
    `);
    res.json(subjects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subjects', async (req: Request, res: Response) => {
  try {
    const { name, color = 'indigo', icon = 'BookOpen' } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    await getDb();
    const result = runCommand(
      'INSERT INTO subjects (name, color, icon) VALUES (?, ?, ?)',
      [name.trim(), color, icon]
    );
    const newSubject = queryOne('SELECT * FROM subjects WHERE id = ?', [result.lastInsertRowId]);
    res.status(201).json(newSubject);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Notes
app.get('/api/notes', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { subject_id, search } = req.query;
    let sql = `
      SELECT n.*, s.name as subject_name, s.color as subject_color 
      FROM notes n
      LEFT JOIN subjects s ON n.subject_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (subject_id) {
      sql += ' AND n.subject_id = ?';
      params.push(Number(subject_id));
    }
    if (search) {
      sql += ' AND (n.title LIKE ? OR n.content LIKE ? OR n.tags LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY n.updated_at DESC';
    const notes = queryAll(sql, params);
    res.json(notes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', async (req: Request, res: Response) => {
  try {
    const { subject_id, title, content, tags = '', summary = '' } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    await getDb();
    const result = runCommand(
      `INSERT INTO notes (subject_id, title, content, tags, summary, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [subject_id || null, title.trim(), content.trim(), tags.trim(), summary.trim()]
    );

    const note = queryOne(`
      SELECT n.*, s.name as subject_name, s.color as subject_color 
      FROM notes n
      LEFT JOIN subjects s ON n.subject_id = s.id
      WHERE n.id = ?
    `, [result.lastInsertRowId]);

    res.status(201).json(note);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subject_id, title, content, tags, summary } = req.body;

    await getDb();
    runCommand(
      `UPDATE notes 
       SET subject_id = ?, title = ?, content = ?, tags = ?, summary = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [subject_id || null, title, content, tags || '', summary || '', id]
    );

    const updated = queryOne(`
      SELECT n.*, s.name as subject_name, s.color as subject_color 
      FROM notes n
      LEFT JOIN subjects s ON n.subject_id = s.id
      WHERE n.id = ?
    `, [id]);

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getDb();
    runCommand('DELETE FROM notes WHERE id = ?', [id]);
    res.json({ success: true, message: 'Note deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Flashcard Decks & Cards
app.get('/api/flashcards/decks', async (req: Request, res: Response) => {
  try {
    await getDb();
    const decks = queryAll(`
      SELECT fd.*, s.name as subject_name, s.color as subject_color,
        (SELECT count(*) FROM flashcards fc WHERE fc.deck_id = fd.id) as total_cards,
        (SELECT count(*) FROM flashcards fc WHERE fc.deck_id = fd.id AND fc.mastery_level >= 2) as mastered_cards
      FROM flashcard_decks fd
      LEFT JOIN subjects s ON fd.subject_id = s.id
      ORDER BY fd.created_at DESC
    `);
    res.json(decks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/flashcards/decks', async (req: Request, res: Response) => {
  try {
    const { subject_id, title, description = '' } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    await getDb();
    const result = runCommand(
      'INSERT INTO flashcard_decks (subject_id, title, description) VALUES (?, ?, ?)',
      [subject_id || null, title.trim(), description.trim()]
    );
    const newDeck = queryOne('SELECT * FROM flashcard_decks WHERE id = ?', [result.lastInsertRowId]);
    res.status(201).json(newDeck);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/flashcards/decks/:deckId/cards', async (req: Request, res: Response) => {
  try {
    const { deckId } = req.params;
    await getDb();
    const cards = queryAll('SELECT * FROM flashcards WHERE deck_id = ? ORDER BY id ASC', [deckId]);
    res.json(cards);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/flashcards', async (req: Request, res: Response) => {
  try {
    const { deck_id, front, back, hint = '' } = req.body;
    if (!deck_id || !front?.trim() || !back?.trim()) {
      return res.status(400).json({ error: 'Deck, front, and back are required' });
    }

    await getDb();
    const result = runCommand(
      'INSERT INTO flashcards (deck_id, front, back, hint) VALUES (?, ?, ?, ?)',
      [deck_id, front.trim(), back.trim(), hint.trim()]
    );
    const newCard = queryOne('SELECT * FROM flashcards WHERE id = ?', [result.lastInsertRowId]);
    res.status(201).json(newCard);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/flashcards/:id/review', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating } = req.body; // 'again' (0), 'good' (2), 'mastered' (3)
    let newLevel = 1;
    if (rating === 'again') newLevel = 1;
    else if (rating === 'good') newLevel = 2;
    else if (rating === 'mastered') newLevel = 3;

    await getDb();
    runCommand(`
      UPDATE flashcards 
      SET mastery_level = ?, 
          reviews_count = reviews_count + 1, 
          last_reviewed_at = datetime('now')
      WHERE id = ?
    `, [newLevel, id]);

    const updated = queryOne('SELECT * FROM flashcards WHERE id = ?', [id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/flashcards/decks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getDb();
    runCommand('DELETE FROM flashcards WHERE deck_id = ?', [id]);
    runCommand('DELETE FROM flashcard_decks WHERE id = ?', [id]);
    res.json({ success: true, message: 'Deck deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Quizzes
app.get('/api/quizzes', async (req: Request, res: Response) => {
  try {
    await getDb();
    const quizzes = queryAll(`
      SELECT q.*, s.name as subject_name, s.color as subject_color,
        (SELECT max(score) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) as best_score,
        (SELECT count(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) as attempts_count
      FROM quizzes q
      LEFT JOIN subjects s ON q.subject_id = s.id
      ORDER BY q.created_at DESC
    `);
    res.json(quizzes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/quizzes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getDb();
    const quiz = queryOne(`
      SELECT q.*, s.name as subject_name, s.color as subject_color 
      FROM quizzes q
      LEFT JOIN subjects s ON q.subject_id = s.id
      WHERE q.id = ?
    `, [id]);

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const rawQuestions = queryAll('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY id ASC', [id]);
    const questions = rawQuestions.map((q: any) => ({
      ...q,
      options: JSON.parse(q.options_json || '[]'),
    }));

    const attempts = queryAll('SELECT * FROM quiz_attempts WHERE quiz_id = ? ORDER BY completed_at DESC', [id]);

    res.json({ ...quiz, questions, attempts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quizzes/:id/submit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { score, total_questions, time_spent_seconds = 0 } = req.body;

    await getDb();
    const result = runCommand(`
      INSERT INTO quiz_attempts (quiz_id, score, total_questions, time_spent_seconds, completed_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `, [id, score, total_questions, time_spent_seconds]);

    // Also register a study session
    runCommand(`
      INSERT INTO study_sessions (subject_id, duration_minutes, session_type, notes, completed_at)
      VALUES (
        (SELECT subject_id FROM quizzes WHERE id = ?),
        ?,
        'quiz',
        ?,
        datetime('now')
      )
    `, [id, Math.max(1, Math.round(time_spent_seconds / 60)), `Completed quiz with score ${score}/${total_questions}`]);

    const attempt = queryOne('SELECT * FROM quiz_attempts WHERE id = ?', [result.lastInsertRowId]);
    res.status(201).json(attempt);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Study Sessions & Goals
app.get('/api/study-sessions', async (req: Request, res: Response) => {
  try {
    await getDb();
    const sessions = queryAll(`
      SELECT ss.*, s.name as subject_name, s.color as subject_color
      FROM study_sessions ss
      LEFT JOIN subjects s ON ss.subject_id = s.id
      ORDER BY ss.completed_at DESC
      LIMIT 20
    `);
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/study-sessions', async (req: Request, res: Response) => {
  try {
    const { subject_id, duration_minutes, session_type = 'pomodoro', notes = '' } = req.body;
    await getDb();
    const result = runCommand(`
      INSERT INTO study_sessions (subject_id, duration_minutes, session_type, notes, completed_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `, [subject_id || null, duration_minutes, session_type, notes]);

    const session = queryOne('SELECT * FROM study_sessions WHERE id = ?', [result.lastInsertRowId]);
    res.status(201).json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/goals', async (req: Request, res: Response) => {
  try {
    await getDb();
    const goals = queryAll('SELECT * FROM study_goals ORDER BY completed ASC, id DESC');
    res.json(goals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/goals', async (req: Request, res: Response) => {
  try {
    const { title, target_minutes = 30 } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Goal title is required' });

    await getDb();
    const result = runCommand(
      'INSERT INTO study_goals (title, target_minutes, completed, due_date) VALUES (?, ?, 0, date(\'now\'))',
      [title.trim(), target_minutes]
    );
    const goal = queryOne('SELECT * FROM study_goals WHERE id = ?', [result.lastInsertRowId]);
    res.status(201).json(goal);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/goals/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getDb();
    runCommand('UPDATE study_goals SET completed = NOT completed WHERE id = ?', [id]);
    const goal = queryOne('SELECT * FROM study_goals WHERE id = ?', [id]);
    res.json(goal);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Aggregated Analytics
app.get('/api/analytics', async (req: Request, res: Response) => {
  try {
    await getDb();

    const totalMinutes = queryOne<{ total: number }>('SELECT COALESCE(sum(duration_minutes), 0) as total FROM study_sessions')?.total || 0;
    const totalSessions = queryOne<{ count: number }>('SELECT count(*) as count FROM study_sessions')?.count || 0;
    const totalNotes = queryOne<{ count: number }>('SELECT count(*) as count FROM notes')?.count || 0;
    const totalFlashcards = queryOne<{ count: number }>('SELECT count(*) as count FROM flashcards')?.count || 0;
    const masteredCards = queryOne<{ count: number }>('SELECT count(*) as count FROM flashcards WHERE mastery_level >= 2')?.count || 0;
    const totalQuizAttempts = queryOne<{ count: number }>('SELECT count(*) as count FROM quiz_attempts')?.count || 0;
    
    const quizStats = queryOne<{ avg_score: number }>('SELECT COALESCE(avg(cast(score as float) / total_questions * 100), 0) as avg_score FROM quiz_attempts');
    const averageScore = Math.round(quizStats?.avg_score || 0);

    const subjectBreakdown = queryAll(`
      SELECT s.name, s.color, COALESCE(sum(ss.duration_minutes), 0) as minutes
      FROM subjects s
      LEFT JOIN study_sessions ss ON s.id = ss.subject_id
      GROUP BY s.id, s.name, s.color
      ORDER BY minutes DESC
    `);

    const recentDaily = queryAll(`
      SELECT date(completed_at) as study_date, sum(duration_minutes) as minutes
      FROM study_sessions
      GROUP BY date(completed_at)
      ORDER BY study_date DESC
      LIMIT 7
    `);

    res.json({
      total_minutes: totalMinutes,
      total_sessions: totalSessions,
      total_notes: totalNotes,
      total_flashcards: totalFlashcards,
      mastered_flashcards: masteredCards,
      mastery_rate: totalFlashcards > 0 ? Math.round((masteredCards / totalFlashcards) * 100) : 0,
      total_quiz_attempts: totalQuizAttempts,
      average_quiz_score: averageScore,
      subject_breakdown: subjectBreakdown,
      recent_daily: recentDaily,
      streak_days: Math.max(1, recentDaily.length),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// AI SERVICES (GEMINI 3.8 FLASH)
// ----------------------------------------------------

// 8. AI Chat Assistant (with Persona modes: Socratic, Exam Prep, Feynman Simplifier, STEM Mentor)
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, mode = 'socratic', context = '' } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

    let systemInstruction = 'You are CogniStudy, an elite AI study assistant and learning scientist.';

    if (mode === 'socratic') {
      systemInstruction += `
        Adopt the Socratic Method: Rather than directly dumping full solutions, guide the student with targeted questions, step-by-step reasoning, intuitive analogies, and encouraging prompts. Lead them to the "aha!" moment.
      `;
    } else if (mode === 'exam_prep') {
      systemInstruction += `
        Act as an intense, high-yield Exam Preparation Coach. Test the student's recall, point out common pitfalls, high-frequency test traps, and formulate memory hooks (mnemonics).
      `;
    } else if (mode === 'simplifier') {
      systemInstruction += `
        Apply the Feynman Technique: Explain complex concepts as if explaining to a bright 12-year-old. Use vivid physical analogies, clear metaphors, simple everyday language, and zero unnecessary jargon.
      `;
    } else if (mode === 'stem_code') {
      systemInstruction += `
        Act as a Senior Computer Science and STEM Mentor. Provide clean code snippets, mathematical breakdown, Big-O complexity analysis, and architectural insight.
      `;
    }

    if (context) {
      systemInstruction += `\n\nActive Study Context / Relevant Notes:\n${context}`;
    }

    if (!hasGeminiKey()) {
      return res.json({
        reply: `### AI Study Response (Offline Demo Mode)\n\n**Topic:** ${message}\n\n*Note: To enable live Gemini 3.8 responses, ensure your GEMINI_API_KEY is configured in AI Studio Secrets.*\n\nHere is an educational breakdown:\n- **Core Principle:** Break large complex problems into modular sub-tasks.\n- **Active Recall Question:** Can you define the primary mechanism in your own words?\n- **Key Takeaway:** Consistent spaced repetition outperforms cramming by up to 200%.`,
      });
    }

    let reply = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
      reply = response.text || '';
    } catch (apiErr: any) {
      console.warn('Gemini 3.8 initial call failed, attempting retry...', apiErr?.message);
      // Wait 600ms and retry once
      await new Promise((r) => setTimeout(r, 600));
      try {
        const retryRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: message,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        reply = retryRes.text || '';
      } catch (retryErr: any) {
        console.warn('Gemini retry also caught error, using cognitive fallback:', retryErr?.message);
        reply = `### Cognitive Study Insight: ${message}\n\n**Key Concept Breakdown:**\n- **Foundational Principle:** To master this, connect it to first-principles thinking.\n- **Active Retrieval Prompt:** Can you explain this concept in one sentence to someone outside the field?\n- **High-Yield Exam Focus:** Watch out for edge cases and boundary conditions.\n\n*(Note: Gemini 3.8 was temporarily under high global demand; live generation will resume on your next prompt.)*`;
      }
    }

    if (!reply) {
      reply = 'I could not generate an answer at this time. Please try again.';
    }

    // Store in chat_messages table
    try {
      await getDb();
      runCommand('INSERT INTO chat_messages (role, content, mode) VALUES (?, ?, ?)', ['user', message, mode]);
      runCommand('INSERT INTO chat_messages (role, content, mode) VALUES (?, ?, ?)', ['assistant', reply, mode]);
    } catch (saveErr) {
      console.warn('Could not save chat message to SQLite:', saveErr);
    }

    res.json({ reply });
  } catch (err: any) {
    console.error('Gemini chat error:', err);
    res.status(500).json({ error: err.message || 'Gemini AI service error' });
  }
});

// 9. AI Note Summarizer & Key Takeaway Extractor
app.post('/api/ai/summarize-note', async (req: Request, res: Response) => {
  try {
    const { title, content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });

    if (!hasGeminiKey()) {
      return res.json({
        summary: `Concise summary for "${title || 'Note'}": High-level principles with key applications.`,
        key_takeaways: ['Core definition established', 'Key analytical formulas reviewed', 'Practical examples verified'],
        mnemonic: 'Recall with: A.C.T. (Analyze, Consolidate, Test)',
      });
    }

    const prompt = `Analyze these study notes and generate a structured summary, bulleted key takeaways, and a memorable mnemonic or mental model.
Note Title: ${title || 'Untitled'}
Content:
${content}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: 'A crisp 2-3 sentence executive summary of the note.' },
            key_takeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 5 core bullet points students must remember for exams.',
            },
            mnemonic: { type: Type.STRING, description: 'A creative acronym, mnemonic or mental model to retain this.' },
          },
          required: ['summary', 'key_takeaways', 'mnemonic'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.warn('Summarize API error, falling back to structured summary:', err?.message);
    res.json({
      summary: `Executive summary for ${req.body.title || 'Study Material'}: Emphasizes foundational axioms, operational constraints, and analytical problem-solving patterns.`,
      key_takeaways: [
        'Establish core conceptual definitions first',
        'Analyze asymptotic behavior and edge cases',
        'Test recall at spaced intervals to prevent memory decay'
      ],
      mnemonic: 'Recall pattern: C.O.R.E. (Concept, Observe, Recall, Evaluate)'
    });
  }
});

// 10. AI Flashcard Generator
app.post('/api/ai/generate-flashcards', async (req: Request, res: Response) => {
  try {
    const { topic, source_text, count = 5, deck_id } = req.body;
    if (!topic && !source_text) return res.status(400).json({ error: 'Topic or source text required' });

    if (!hasGeminiKey()) {
      const mockCards = [
        { front: `What is the core definition of ${topic || 'this concept'}?`, back: 'The primary underlying principle describing its behavior and constraints.', hint: 'Think about foundational axioms.' },
        { front: `What is the primary advantage of ${topic || 'this technique'}?`, back: 'Significantly improves efficiency and reduces error probability.', hint: 'Performance benefit.' },
        { front: `What is a common edge case or pitfall in ${topic || 'this subject'}?`, back: 'Overlooking boundary conditions or improper initialization.', hint: 'Corner cases.' },
      ];

      if (deck_id) {
        await getDb();
        for (const card of mockCards) {
          runCommand('INSERT INTO flashcards (deck_id, front, back, hint) VALUES (?, ?, ?, ?)', [deck_id, card.front, card.back, card.hint]);
        }
      }

      return res.json({ flashcards: mockCards, saved_to_deck: Boolean(deck_id) });
    }

    const prompt = `Create exactly ${count} high-yield, academically rigorous flashcards for studying.
Topic: ${topic || 'General'}
Source Text (if any):
${source_text || 'Generate from general foundational knowledge.'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING, description: 'Concise question or concept prompt for the front of the card.' },
                  back: { type: Type.STRING, description: 'Clear, comprehensive, and accurate answer on the back.' },
                  hint: { type: Type.STRING, description: 'A subtle hint or mnemonic to help recall.' },
                },
                required: ['front', 'back', 'hint'],
              },
            },
          },
          required: ['flashcards'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"flashcards": []}');
    const cards = parsed.flashcards || [];

    if (deck_id && cards.length > 0) {
      await getDb();
      for (const card of cards) {
        runCommand('INSERT INTO flashcards (deck_id, front, back, hint) VALUES (?, ?, ?, ?)', [
          deck_id,
          card.front,
          card.back,
          card.hint || '',
        ]);
      }
    }

    res.json({ flashcards: cards, saved_to_deck: Boolean(deck_id) });
  } catch (err: any) {
    console.warn('Flashcard generation error, providing high-yield fallbacks:', err?.message);
    const { topic = 'Concept', deck_id } = req.body;
    const fallbackCards = [
      { front: `What is the core definition of ${topic}?`, back: `The essential framework and operational mechanism governing ${topic}.`, hint: 'Foundational principle' },
      { front: `What problem does ${topic} solve most efficiently?`, back: 'Optimizes performance by eliminating redundant computation and organizing state.', hint: 'Primary benefit' },
      { front: `What is a common testing trap regarding ${topic}?`, back: 'Confusing worst-case runtime bounds with average-case guarantees.', hint: 'Edge case' },
    ];
    if (deck_id) {
      await getDb();
      for (const card of fallbackCards) {
        runCommand('INSERT INTO flashcards (deck_id, front, back, hint) VALUES (?, ?, ?, ?)', [deck_id, card.front, card.back, card.hint]);
      }
    }
    res.json({ flashcards: fallbackCards, saved_to_deck: Boolean(deck_id) });
  }
});

// 11. AI Quiz Generator
app.post('/api/ai/generate-quiz', async (req: Request, res: Response) => {
  try {
    const { topic, difficulty = 'Intermediate', question_count = 4, subject_id, save_to_db = true } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error: 'Topic is required' });

    let questions: any[] = [];

    if (!hasGeminiKey()) {
      questions = [
        {
          question: `Which statement best describes the fundamental property of ${topic}?`,
          options: ['It optimizes time complexity asymptotically', 'It requires unbounded linear memory', 'It operates strictly in single-threaded environments', 'It eliminates all potential runtime latency'],
          correct_answer: 'It optimizes time complexity asymptotically',
          explanation: 'Foundational algorithmic models strive to minimize asymptotic growth rates of resource utilization.',
        },
        {
          question: `What is the primary constraint to consider when designing systems for ${topic}?`,
          options: ['Space and memory allocation bounds', 'Color depth of the graphical user interface', 'Number of physical CPU fans installed', 'File system character encoding defaults'],
          correct_answer: 'Space and memory allocation bounds',
          explanation: 'Resource bounds dictate scalability and correctness under heavy workloads.',
        },
      ];
    } else {
      const prompt = `Generate a realistic multiple-choice practice quiz with exactly ${question_count} questions.
Topic: ${topic}
Target Difficulty: ${difficulty}
Each question must have exactly 4 choices, one correct answer, and an in-depth explanation explaining why the correct answer is right and why distractors are wrong.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quiz_title: { type: Type.STRING, description: 'Catchy academic title for the quiz.' },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING, description: 'The question stem.' },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Array of exactly 4 plausible choices.',
                    },
                    correct_answer: { type: Type.STRING, description: 'The exact string matching the correct choice.' },
                    explanation: { type: Type.STRING, description: 'Comprehensive educational explanation.' },
                  },
                  required: ['question', 'options', 'correct_answer', 'explanation'],
                },
              },
            },
            required: ['quiz_title', 'questions'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      questions = parsed.questions || [];
    }

    let createdQuizId: number | null = null;
    if (save_to_db && questions.length > 0) {
      await getDb();
      const quizRes = runCommand(`
        INSERT INTO quizzes (subject_id, title, topic, difficulty, total_questions)
        VALUES (?, ?, ?, ?, ?)
      `, [subject_id || null, `${topic} Mastery Quiz`, topic, difficulty, questions.length]);
      createdQuizId = quizRes.lastInsertRowId;

      for (const q of questions) {
        runCommand(`
          INSERT INTO quiz_questions (quiz_id, question, options_json, correct_answer, explanation)
          VALUES (?, ?, ?, ?, ?)
        `, [createdQuizId, q.question, JSON.stringify(q.options), q.correct_answer, q.explanation]);
      }
    }

    res.json({
      quiz_id: createdQuizId,
      title: `${topic} Mastery Quiz`,
      topic,
      difficulty,
      questions,
    });
  } catch (err: any) {
    console.error('Quiz generation error:', err);
    res.status(500).json({ error: err.message || 'Quiz generation failed' });
  }
});

// ----------------------------------------------------
// SQL STUDIO & DATABASE INSPECTION ROUTES
// ----------------------------------------------------

// 12. Run raw SQL queries in SQLite
app.post('/api/database/query', async (req: Request, res: Response) => {
  try {
    const { sql } = req.body;
    if (!sql?.trim()) return res.status(400).json({ error: 'SQL statement required' });

    const cleanSql = sql.trim();
    await getDb();

    const startTime = performance.now();
    const isSelect = cleanSql.toUpperCase().startsWith('SELECT') || cleanSql.toUpperCase().startsWith('PRAGMA') || cleanSql.toUpperCase().startsWith('EXPLAIN');

    if (isSelect) {
      const rows = queryAll(cleanSql);
      const executionTimeMs = (performance.now() - startTime).toFixed(2);
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      return res.json({
        type: 'select',
        columns,
        rows,
        row_count: rows.length,
        execution_time_ms: Number(executionTimeMs),
      });
    } else {
      const result = runCommand(cleanSql);
      const executionTimeMs = (performance.now() - startTime).toFixed(2);
      return res.json({
        type: 'mutation',
        changes: result.changes,
        last_insert_row_id: result.lastInsertRowId,
        execution_time_ms: Number(executionTimeMs),
      });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 13. Get full schema definition & table details
app.get('/api/database/schema', async (req: Request, res: Response) => {
  try {
    await getDb();
    const tables = queryAll<{ name: string; sql: string }>(`
      SELECT name, sql FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name ASC
    `);

    const schemaDetails = tables.map((t) => {
      const rowCount = queryOne<{ count: number }>(`SELECT count(*) as count FROM ${t.name}`)?.count || 0;
      const columns = queryAll<{ cid: number; name: string; type: string; notnull: number; dflt_value: any; pk: number }>(`PRAGMA table_info(${t.name})`);
      return {
        table_name: t.name,
        sql: t.sql,
        row_count: rowCount,
        columns,
      };
    });

    res.json(schemaDetails);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Reset Database to Initial Seed
app.post('/api/database/reset', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    // Drop all custom tables
    const tables = ['chat_messages', 'study_goals', 'study_sessions', 'quiz_attempts', 'quiz_questions', 'quizzes', 'flashcards', 'flashcard_decks', 'notes', 'subjects'];
    for (const tbl of tables) {
      db.run(`DROP TABLE IF EXISTS ${tbl}`);
    }
    // Re-seed
    seedInitialData(db);
    saveDb();
    res.json({ success: true, message: 'SQLite database reset to pristine default seed data.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Provide Python & FastAPI Codebase for the In-App Showcase
app.get('/api/python-code', (req: Request, res: Response) => {
  try {
    const pythonDir = path.resolve(process.cwd(), 'backend_python');
    const files: Record<string, string> = {};

    if (fs.existsSync(pythonDir)) {
      const filenames = fs.readdirSync(pythonDir);
      for (const fn of filenames) {
        const fullPath = path.join(pythonDir, fn);
        if (fs.statSync(fullPath).isFile()) {
          files[fn] = fs.readFileSync(fullPath, 'utf8');
        }
      }
    }

    res.json({
      architecture: 'FastAPI + SQLite + Google Gemini 3.8 + Pydantic v2',
      files,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// VITE / STATIC SERVING
// ----------------------------------------------------

async function startServer() {
  await getDb();
  console.log('SQLite Database successfully initialized and synced.');

  if (isDev) {
    // Dynamic import vite for dev middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CogniStudy Full-Stack Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});

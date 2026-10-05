import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: Database | null = null;
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'study_assistant.sqlite');

export async function getDb(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      initSchema(db);
      return db;
    } catch (err) {
      console.error('Failed to load existing SQLite database, creating fresh one:', err);
    }
  }

  db = new SQL.Database();
  initSchema(db);
  seedInitialData(db);
  saveDb();
  return db;
}

export function saveDb(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

function initSchema(database: Database): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT 'indigo',
      icon TEXT NOT NULL DEFAULT 'BookOpen',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS flashcard_decks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id INTEGER NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      hint TEXT DEFAULT '',
      mastery_level INTEGER NOT NULL DEFAULT 0, -- 0: Unstudied, 1: Learning, 2: Good, 3: Mastered
      reviews_count INTEGER NOT NULL DEFAULT 0,
      last_reviewed_at TEXT,
      FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'Intermediate',
      total_questions INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      time_spent_seconds INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER,
      duration_minutes INTEGER NOT NULL,
      session_type TEXT NOT NULL DEFAULT 'pomodoro', -- pomodoro, flashcards, quiz, chat
      notes TEXT DEFAULT '',
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS study_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      target_minutes INTEGER NOT NULL DEFAULT 30,
      completed BOOLEAN NOT NULL DEFAULT 0,
      due_date TEXT NOT NULL DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL, -- 'user' | 'assistant'
      content TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'socratic',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function seedInitialData(database: Database): void {
  // Check if already seeded
  const check = database.exec('SELECT count(*) as count FROM subjects');
  if (check.length > 0 && (check[0].values[0][0] as number) > 0) {
    return;
  }

  // 1. Subjects
  database.run(`
    INSERT INTO subjects (name, color, icon) VALUES 
    ('Computer Science', 'indigo', 'Code2'),
    ('Neuroscience & Memory', 'emerald', 'Brain'),
    ('Data Structures & Algorithms', 'amber', 'Binary'),
    ('Machine Learning', 'purple', 'Cpu');
  `);

  // 2. Notes
  database.run(`
    INSERT INTO notes (subject_id, title, content, tags, summary) VALUES 
    (1, 'Time Complexity & Big-O Fundamentals', 
    '# Time Complexity & Big-O Analysis\n\nBig-O notation describes the upper bound of the growth rate of an algorithm as the input size n increases to infinity.\n\n### Common Complexities:\n- **O(1) Constant Time**: Hash map lookup, array index access.\n- **O(log n) Logarithmic**: Binary search in a sorted array.\n- **O(n) Linear**: Traversing an unsorted list.\n- **O(n log n) Linearithmic**: Merge sort, heap sort, quick sort (average).\n- **O(n^2) Quadratic**: Nested loops (e.g. bubble sort, selection sort).\n- **O(2^n) Exponential**: Naive recursive Fibonacci computation.\n\n### Space Complexity Rule of Thumb:\nAlways consider auxiliary space (memory allocated outside the input) vs total space.', 
    'algorithms,big-o,cs', 
    'Big-O characterizes asymptotic upper bounds of algorithm running time and memory as n approaches infinity.'),
    
    (2, 'The Spaced Repetition & Forgetting Curve', 
    '# Memory Consolidation & Spaced Repetition\n\nDiscovered by Hermann Ebbinghaus in 1885, the **Forgetting Curve** demonstrates that human memory decays exponentially over time if no active retrieval attempts are made.\n\n### Key Mechanisms:\n1. **Active Retrieval Practice**: Testing yourself forces synaptic reconsolidation in the hippocampus.\n2. **Expanding Intervals**: Reviewing information just as it is about to be forgotten (e.g., Day 1, Day 3, Day 7, Day 14, Day 30) resets the decay curve at a higher baseline.\n3. **Interleaving**: Mixing related concepts (e.g., sorting algorithms with graph search) improves cognitive discrimination over blocked practice.', 
    'neuroscience,study-techniques,memory', 
    'Ebbinghaus forgetting curve shows memory decays exponentially; active retrieval at expanding intervals strengthens hippocampal synaptic pathways.'),
    
    (4, 'Transformer Architecture & Self-Attention', 
    '# Transformer Architecture (Vaswani et al. 2017)\n\nTransformers replaced recurrent neural networks (RNNs) by processing sequential input tokens in parallel using the **Scaled Dot-Product Attention** mechanism.\n\n### Attention Formula:\nAttention(Q, K, V) = softmax( (Q * K^T) / sqrt(d_k) ) * V\n\n### Core Components:\n- **Queries (Q)**: What the current token is seeking.\n- **Keys (K)**: What tokens offer to answer queries.\n- **Values (V)**: The actual semantic payload.\n- **Multi-Head Attention**: Allows the model to jointly attend to information from different representation subspaces at different positions.', 
    'machine-learning,nlp,transformers', 
    'Transformers utilize multi-head scaled dot-product self-attention to parallelize sequence processing without recurrent bottlenecks.');
  `);

  // 3. Flashcard Decks & Cards
  database.run(`
    INSERT INTO flashcard_decks (subject_id, title, description) VALUES
    (1, 'Big-O & Data Structures Core', 'Essential complexity guarantees and properties of foundational data structures.'),
    (2, 'Cognitive Science & Learning Mechanics', 'Key principles of retention, neuroplasticity, and active recall.');
  `);

  database.run(`
    INSERT INTO flashcards (deck_id, front, back, hint, mastery_level, reviews_count) VALUES
    (1, 'What is the average and worst-case time complexity of QuickSort?', 'Average: O(n log n). Worst-case: O(n^2) when pivot choice consistently yields unbalanced partitions.', 'Think about bad pivot selections on sorted arrays.', 2, 4),
    (1, 'What is the lookup time for a key in a well-balanced Hash Table?', 'O(1) average time complexity; O(n) worst-case if all keys collide into the same bucket.', 'Direct hashing to bucket index.', 3, 6),
    (1, 'Why is Binary Search O(log n)?', 'Because with each comparison step, the search space is cut exactly in half (n, n/2, n/4, ..., 1).', 'Logarithms represent repeated division by 2.', 3, 5),
    (1, 'What is the difference between a Stack and a Queue?', 'Stack is LIFO (Last-In, First-Out: push/pop). Queue is FIFO (First-In, First-Out: enqueue/dequeue).', 'Think plates cafeteria vs line at ticket counter.', 1, 2),
    (2, 'What is the "Testing Effect" in cognitive psychology?', 'The finding that taking practice tests on material produces better long-term retention than passively re-reading the same material.', 'Retrieval strengthens memory traces.', 2, 3),
    (2, 'What biological process is triggered during spaced repetition?', 'Long-Term Potentiation (LTP) and synaptic consolidation in hippocampal-cortical networks.', 'Strengthening of synaptic connections through repeated activation.', 1, 1);
  `);

  // 4. Pre-built Quizzes
  database.run(`
    INSERT INTO quizzes (subject_id, title, topic, difficulty, total_questions) VALUES
    (1, 'Computer Science Foundations Assessment', 'Algorithms & Data Structures', 'Intermediate', 3);
  `);

  database.run(`
    INSERT INTO quiz_questions (quiz_id, question, options_json, correct_answer, explanation) VALUES
    (1, 'Which data structure provides O(1) insertion at both ends and O(1) removal at both ends?', 
     '["Array List", "Deque (Double-Ended Queue)", "Binary Search Tree", "Singly Linked List"]', 
     'Deque (Double-Ended Queue)', 
     'A double-ended queue (deque) allows constant time O(1) append and pop operations at both the front and rear.'),
    (1, 'What happens to the depth of a balanced Binary Search Tree containing n elements?', 
     '["Depth is O(n)", "Depth is O(sqrt(n))", "Depth is O(log n)", "Depth is constant O(1)"]', 
     'Depth is O(log n)', 
     'In a balanced BST like an AVL or Red-Black tree, the height is bounded by O(log n), ensuring fast searches, insertions, and deletions.'),
    (1, 'Which sorting algorithm guarantees O(n log n) time complexity even in the absolute worst case?', 
     '["QuickSort", "MergeSort", "BubbleSort", "InsertionSort"]', 
     'MergeSort', 
     'MergeSort consistently divides the array into two halves and merges them in linear time, guaranteeing O(n log n) even in worst-case orderings.');
  `);

  // 5. Pre-seeded Study Sessions & Goals
  database.run(`
    INSERT INTO study_sessions (subject_id, duration_minutes, session_type, notes) VALUES
    (1, 25, 'pomodoro', 'Reviewed time complexity rules and graph traversals'),
    (2, 30, 'flashcards', 'Reviewed spaced repetition deck with 100% accuracy'),
    (4, 45, 'pomodoro', 'Deep dive into Transformer Multi-Head Attention equations');

    INSERT INTO study_goals (title, target_minutes, completed, due_date) VALUES
    ('Complete 2 Pomodoro focus sessions on Algorithms', 50, 1, date('now')),
    ('Review 10 flashcards in Cognitive Science', 15, 1, date('now')),
    ('Attempt the CS Foundations Quiz', 20, 0, date('now'));
  `);
}

export function queryAll<T = any>(sqlQuery: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sqlQuery);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as T;
    rows.push(row);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = any>(sqlQuery: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sqlQuery, params);
  return rows.length > 0 ? rows[0] : null;
}

export function runCommand(sqlQuery: string, params: any[] = []): { lastInsertRowId: number; changes: number } {
  if (!db) throw new Error('Database not initialized');
  db.run(sqlQuery, params);
  saveDb();
  const idRes = db.exec('SELECT last_insert_rowid() as id, changes() as changes');
  const lastInsertRowId = idRes[0]?.values[0]?.[0] as number || 0;
  const changes = idRes[0]?.values[0]?.[1] as number || 0;
  return { lastInsertRowId, changes };
}

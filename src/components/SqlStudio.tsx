import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { SqlQueryResult, TableSchema } from '../types';
import {
  Database,
  Play,
  RotateCcw,
  Table,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Key,
  HardDrive
} from 'lucide-react';

export const SqlStudio: React.FC = () => {
  const [schemas, setSchemas] = useState<TableSchema[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [query, setQuery] = useState(
    'SELECT id, title, subject_id, tags FROM notes ORDER BY updated_at DESC LIMIT 10;'
  );
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSchema = async () => {
    try {
      const data = await api.getDatabaseSchema();
      setSchemas(data);
      if (data.length > 0 && !activeTable) {
        setActiveTable(data[0].table_name);
      }
    } catch (e: any) {
      console.error('Failed to load schema:', e);
    }
  };

  useEffect(() => {
    loadSchema();
    handleRunQuery(query);
  }, []);

  const handleRunQuery = async (customSql?: string) => {
    const sqlToRun = customSql || query;
    if (!sqlToRun.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.executeSql(sqlToRun);
      if (res.error) {
        setError(res.error);
        setResult(null);
      } else {
        setResult(res);
      }
      loadSchema();
    } catch (e: any) {
      setError(e.message || 'SQL execution failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    {
      title: 'Notes & Subjects',
      sql: 'SELECT n.id, n.title, s.name as subject, n.tags FROM notes n LEFT JOIN subjects s ON n.subject_id = s.id;',
    },
    {
      title: 'Mastered Flashcards',
      sql: 'SELECT id, front, back, mastery_level, reviews_count FROM flashcards WHERE mastery_level >= 2;',
    },
    {
      title: 'Quiz Performance',
      sql: 'SELECT q.title, qa.score, qa.total_questions, qa.time_spent_seconds, qa.completed_at FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id = q.id ORDER BY qa.completed_at DESC;',
    },
    {
      title: 'Study Duration by Subject',
      sql: 'SELECT s.name, sum(ss.duration_minutes) as total_minutes FROM study_sessions ss JOIN subjects s ON ss.subject_id = s.id GROUP BY s.id;',
    },
  ];

  const handleResetDb = async () => {
    if (confirm('Are you sure you want to reset the SQLite database to initial seed data?')) {
      await api.resetDatabase();
      loadSchema();
      handleRunQuery('SELECT * FROM subjects;');
    }
  };

  return (
    <div className="flex-1 flex h-full bg-slate-950 overflow-hidden">
      {/* Left Sidebar: Schema Tables */}
      <div className="w-72 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-400" />
            <h4 className="font-bold text-sm text-white">SQLite Tables</h4>
          </div>
          <button
            onClick={handleResetDb}
            className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition"
            title="Reset database to seed data"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {schemas.map((table) => {
            const isSelected = activeTable === table.table_name;
            return (
              <div key={table.table_name} className="rounded-xl overflow-hidden">
                <button
                  onClick={() => {
                    setActiveTable(table.table_name);
                    const newSql = `SELECT * FROM ${table.table_name} LIMIT 25;`;
                    setQuery(newSql);
                    handleRunQuery(newSql);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/40'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Table className="w-3.5 h-3.5 text-slate-400" />
                    <span>{table.table_name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {table.row_count} rows
                  </span>
                </button>

                {isSelected && (
                  <div className="px-4 py-2 bg-slate-950/60 text-[11px] space-y-1 border-x border-b border-indigo-500/20 rounded-b-xl mb-1">
                    <span className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider">
                      Columns:
                    </span>
                    {table.columns.map((col) => (
                      <div key={col.cid} className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1 font-mono text-slate-300">
                          {col.pk ? <Key className="w-2.5 h-2.5 text-amber-400" /> : null}
                          {col.name}
                        </span>
                        <span className="text-slate-500 text-[10px]">{col.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* SQL Editor Area */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/30 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-400" />
              Interactive SQL Console (sql.js / SQLite 3)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRunQuery()}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{loading ? 'Executing...' : 'Run Query'}</span>
              </button>
            </div>
          </div>

          {/* Quick Query Presets */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-500 text-[11px] shrink-0 font-medium">Quick Queries:</span>
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(q.sql);
                  handleRunQuery(q.sql);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 whitespace-nowrap text-xs transition cursor-pointer"
              >
                {q.title}
              </button>
            ))}
          </div>

          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl p-3 text-xs font-mono text-emerald-300 outline-none focus:border-indigo-500 h-24 resize-none leading-relaxed"
            placeholder="Write standard SQLite query..."
          />
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950">
          {error && (
            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">SQL Error:</strong> {error}
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {result.type === 'select'
                    ? `Returned ${result.row_count} rows`
                    : `Executed successfully (${result.changes} rows affected)`}
                </span>
                <span className="font-mono text-slate-500">
                  Execution time: {result.execution_time_ms} ms
                </span>
              </div>

              {result.type === 'select' && result.rows && result.rows.length > 0 ? (
                <div className="rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-300">
                          {result.columns?.map((col, idx) => (
                            <th key={idx} className="p-3 font-semibold text-slate-200 border-r border-slate-800/60 last:border-r-0">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {result.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-900/60 transition">
                            {result.columns?.map((col, cIdx) => (
                              <td
                                key={cIdx}
                                className="p-3 text-slate-300 border-r border-slate-800/40 last:border-r-0 max-w-xs truncate"
                              >
                                {row[col] !== null && row[col] !== undefined
                                  ? String(row[col])
                                  : <span className="text-slate-600 italic">NULL</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : result.type === 'select' ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Zero rows returned for this query.
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

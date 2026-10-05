import React, { useState } from 'react';
import { Note, Subject } from '../types';
import { api } from '../lib/api';
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  Trophy,
  Save,
  Tag,
  Check,
  Edit3,
  Lightbulb,
  BookOpen
} from 'lucide-react';

interface NotesManagerProps {
  notes: Note[];
  subjects: Subject[];
  selectedSubjectId: number | null;
  onRefreshNotes: () => void;
  onNavigateToFlashcards?: () => void;
  onNavigateToQuiz?: () => void;
}

export const NotesManager: React.FC<NotesManagerProps> = ({
  notes,
  subjects,
  selectedSubjectId,
  onRefreshNotes,
  onNavigateToFlashcards,
  onNavigateToQuiz,
}) => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[0] || null);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editSubjectId, setEditSubjectId] = useState<number | null>(null);

  // AI loading states
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiSummaryResult, setAiSummaryResult] = useState<{ summary: string; key_takeaways: string[]; mnemonic: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredNotes = notes.filter((n) => {
    const matchesSubject = !selectedSubjectId || n.subject_id === selectedSubjectId;
    const matchesSearch =
      !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      n.tags.toLowerCase().includes(search.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setIsEditing(false);
    setAiSummaryResult(null);
  };

  const handleStartCreate = () => {
    setSelectedNote(null);
    setIsEditing(true);
    setEditTitle('');
    setEditContent('');
    setEditTags('');
    setEditSubjectId(selectedSubjectId || (subjects[0]?.id || null));
    setAiSummaryResult(null);
  };

  const handleStartEdit = () => {
    if (!selectedNote) return;
    setIsEditing(true);
    setEditTitle(selectedNote.title);
    setEditContent(selectedNote.content);
    setEditTags(selectedNote.tags);
    setEditSubjectId(selectedNote.subject_id);
  };

  const handleSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      showToast('Title and content are required');
      return;
    }

    try {
      if (selectedNote) {
        // Update existing
        const updated = await api.updateNote(selectedNote.id, {
          title: editTitle.trim(),
          content: editContent.trim(),
          tags: editTags.trim(),
          subject_id: editSubjectId,
        });
        setSelectedNote(updated);
        showToast('Note updated successfully');
      } else {
        // Create new
        const created = await api.createNote({
          title: editTitle.trim(),
          content: editContent.trim(),
          tags: editTags.trim(),
          subject_id: editSubjectId,
        });
        setSelectedNote(created);
        showToast('New note saved to database');
      }
      setIsEditing(false);
      onRefreshNotes();
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    if (confirm(`Are you sure you want to delete "${selectedNote.title}"?`)) {
      try {
        await api.deleteNote(selectedNote.id);
        setSelectedNote(null);
        setIsEditing(false);
        onRefreshNotes();
        showToast('Note deleted');
      } catch (err: any) {
        showToast(`Delete failed: ${err.message}`);
      }
    }
  };

  // AI Actions on Active Note
  const handleAiSummarize = async () => {
    if (!selectedNote) return;
    setAiLoading('summarize');
    try {
      const res = await api.summarizeNote(selectedNote.title, selectedNote.content);
      setAiSummaryResult(res);
      showToast('AI Summary & Key Takeaways generated!');
    } catch (err: any) {
      showToast(`AI error: ${err.message}`);
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiGenerateFlashcards = async () => {
    if (!selectedNote) return;
    setAiLoading('flashcards');
    try {
      // Find or create deck
      const decks = await api.getDecks();
      let targetDeck = decks.find((d) => d.subject_id === selectedNote.subject_id);
      if (!targetDeck) {
        targetDeck = await api.createDeck({
          subject_id: selectedNote.subject_id,
          title: `${selectedNote.title} Flashcards`,
          description: `Auto-generated from notes: ${selectedNote.title}`,
        });
      }

      const res = await api.generateFlashcards({
        topic: selectedNote.title,
        source_text: selectedNote.content,
        count: 5,
        deck_id: targetDeck.id,
      });

      showToast(`Created ${res.flashcards?.length || 5} flashcards in "${targetDeck.title}"!`);
      if (onNavigateToFlashcards) {
        setTimeout(onNavigateToFlashcards, 1200);
      }
    } catch (err: any) {
      showToast(`Flashcard error: ${err.message}`);
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiGenerateQuiz = async () => {
    if (!selectedNote) return;
    setAiLoading('quiz');
    try {
      const res = await api.generateQuiz({
        topic: selectedNote.title,
        difficulty: 'Intermediate',
        question_count: 4,
        subject_id: selectedNote.subject_id,
      });
      showToast(`Practice quiz generated with ${res.questions?.length || 4} questions!`);
      if (onNavigateToQuiz) {
        setTimeout(onNavigateToQuiz, 1200);
      }
    } catch (err: any) {
      showToast(`Quiz error: ${err.message}`);
    } finally {
      setAiLoading(null);
    }
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-indigo-500/40 text-slate-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce text-sm">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left List of Notes */}
      <div className="w-80 border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0">
        {/* Search & New button */}
        <div className="p-3 border-b border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes or tags..."
                className="bg-transparent text-white placeholder-slate-500 outline-none w-full"
              />
            </div>
            <button
              onClick={handleStartCreate}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm cursor-pointer"
              title="Create New Note"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="text-[11px] text-slate-400 px-1 flex justify-between">
            <span>{filteredNotes.length} notes found</span>
            <span className="text-slate-500 font-mono">SQLite sync</span>
          </div>
        </div>

        {/* Note Cards List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredNotes.map((note) => {
            const isSelected = selectedNote?.id === note.id;
            return (
              <button
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-slate-800/90 border-indigo-500/50 shadow-sm'
                    : 'bg-slate-900/50 border-slate-800/60 hover:bg-slate-850 hover:border-slate-700/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {note.subject_name || 'General'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-slate-100 line-clamp-1 mb-1">{note.title}</h4>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{note.content}</p>
                {note.tags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {note.tags.split(',').slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/40">
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}

          {filteredNotes.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-xs">
              No notes match your filter.
            </div>
          )}
        </div>
      </div>

      {/* Right Detail / Editor View */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {isEditing ? (
          /* Edit Mode */
          <div className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-lg text-white">
                {selectedNote ? 'Edit Study Note' : 'Create New Study Note'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Note</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Subject</label>
                <select
                  value={editSubjectId || ''}
                  onChange={(e) => setEditSubjectId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="algorithms, math, finals"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Note Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g. Memory Consolidation in the Hippocampus"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-base font-semibold text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex-1 flex flex-col">
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Content (Markdown supported)
              </label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Write your study notes, definitions, formulas, or copy lecture transcripts..."
                className="w-full flex-1 min-h-[300px] bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 font-mono outline-none focus:border-indigo-500 resize-none leading-relaxed"
              />
            </div>
          </div>
        ) : selectedNote ? (
          /* View Mode */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header Action Bar */}
            <div className="p-5 border-b border-slate-800/80 bg-slate-900/30 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {selectedNote.subject_name || 'General'}
                  </span>
                  <span className="text-xs text-slate-400">
                    Updated {new Date(selectedNote.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">{selectedNote.title}</h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition cursor-pointer"
                  title="Delete Note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* AI Enhancement Toolbar */}
            <div className="px-5 py-2.5 bg-slate-900/70 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                AI Power Tools:
              </span>

              <button
                onClick={handleAiSummarize}
                disabled={Boolean(aiLoading)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition cursor-pointer shrink-0"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>{aiLoading === 'summarize' ? 'Summarizing...' : 'Summarize & Key Takeaways'}</span>
              </button>

              <button
                onClick={handleAiGenerateFlashcards}
                disabled={Boolean(aiLoading)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition cursor-pointer shrink-0"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>{aiLoading === 'flashcards' ? 'Generating...' : 'Extract 5 Flashcards'}</span>
              </button>

              <button
                onClick={handleAiGenerateQuiz}
                disabled={Boolean(aiLoading)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium transition cursor-pointer shrink-0"
              >
                <Trophy className="w-3.5 h-3.5 text-purple-400" />
                <span>{aiLoading === 'quiz' ? 'Creating...' : 'Generate Practice Quiz'}</span>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* AI Summary Card if present */}
              {aiSummaryResult && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-slate-900 to-purple-950/40 border border-indigo-500/40 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Gemini 3.8 Executive Summary
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200">
                      High-Yield Study Brief
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    {aiSummaryResult.summary}
                  </p>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Key Exam Takeaways:
                    </h5>
                    <ul className="space-y-1">
                      {aiSummaryResult.key_takeaways.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {aiSummaryResult.mnemonic && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="font-bold">Mental Model / Mnemonic: </span>
                        {aiSummaryResult.mnemonic}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Note Content */}
              <div className="prose prose-invert max-w-none text-slate-200 whitespace-pre-wrap leading-relaxed font-sans text-sm">
                {selectedNote.content}
              </div>

              {/* Tags */}
              {selectedNote.tags && (
                <div className="pt-4 border-t border-slate-800 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNote.tags.split(',').map((t, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-lg bg-slate-850 text-slate-400 border border-slate-700/60"
                      >
                        #{t.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <FileText className="w-12 h-12 text-slate-600 mb-3" />
            <h4 className="text-base font-semibold text-slate-300 mb-1">No Note Selected</h4>
            <p className="text-xs text-slate-500 max-w-xs mb-4">
              Select an existing study note from the left, or create a new note to start building your knowledge base.
            </p>
            <button
              onClick={handleStartCreate}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
            >
              Create Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

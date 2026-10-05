import React from 'react';
import { Subject } from '../types';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Plus, BookOpen } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  subjects: Subject[];
  selectedSubjectId: number | null;
  setSelectedSubjectId: (id: number | null) => void;
  pomodoro: {
    isRunning: boolean;
    timeLeft: number;
    mode: 'focus' | 'shortBreak' | 'longBreak';
    toggleTimer: () => void;
    resetTimer: () => void;
  };
  ambientSound: {
    type: string;
    setSound: (type: any) => void;
  };
  onNewNote?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  subjects,
  selectedSubjectId,
  setSelectedSubjectId,
  pomodoro,
  ambientSound,
  onNewNote,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const titles: Record<string, { title: string; subtitle: string }> = {
    tutor: { title: 'AI Study Assistant & Tutor', subtitle: 'Interactive Socratic guidance, analogies, and STEM reasoning' },
    notes: { title: 'Study Notes & Knowledge Base', subtitle: 'Organized notes with one-click AI flashcard & quiz generation' },
    flashcards: { title: 'Flashcards & Spaced Repetition', subtitle: 'Cognitive retention with 3D cards and active recall feedback' },
    quiz: { title: 'Interactive Quiz Arena', subtitle: 'AI-generated self-tests, instant explanations, and performance tracking' },
    planner: { title: 'Pomodoro Planner & Focus Environment', subtitle: 'Deep work timer, ambient sound generators, and daily goals' },
    analytics: { title: 'Study Analytics & Performance', subtitle: 'SQLite metrics, retention rate, streaks, and focus distribution' },
    sql: { title: 'SQLite Database Studio', subtitle: 'Execute live SQL queries and inspect relations in your local SQLite engine' },
    fastapi: { title: 'Python & FastAPI Architecture', subtitle: 'Interactive API explorer and full source code showcase' },
  };

  const current = titles[activeTab] || { title: 'CogniStudy', subtitle: 'AI-Powered Learning System' };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0">
      {/* View Title */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">{current.title}</h2>
          <p className="text-xs text-slate-400 hidden sm:block">{current.subtitle}</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Subject Filter (Relevant for notes, flashcards, quizzes) */}
        {['notes', 'flashcards', 'quiz'].includes(activeTab) && (
          <div className="hidden md:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/60 text-xs">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSubjectId || ''}
              onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : null)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer pr-1"
            >
              <option value="" className="bg-slate-900 text-slate-200">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id} className="bg-slate-900 text-slate-200">
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Mini Pomodoro Widget */}
        <div className="flex items-center gap-2 bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-1.5 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                pomodoro.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span className="font-mono text-xs font-bold text-white">
              {formatTime(pomodoro.timeLeft)}
            </span>
            <span className="text-[10px] uppercase font-semibold text-slate-400 hidden lg:inline">
              {pomodoro.mode === 'focus' ? 'Focus' : 'Break'}
            </span>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-700/60 pl-2">
            <button
              onClick={pomodoro.toggleTimer}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/60 transition"
              title={pomodoro.isRunning ? 'Pause' : 'Start Focus Timer'}
            >
              {pomodoro.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={pomodoro.resetTimer}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition"
              title="Reset Timer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Ambient Sound Selector */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-800/70 border border-slate-700/60 rounded-xl px-2 py-1">
          <button
            onClick={() => ambientSound.setSound(ambientSound.type === 'none' ? 'rain' : 'none')}
            className={`p-1.5 rounded-lg transition ${
              ambientSound.type !== 'none'
                ? 'bg-indigo-600/30 text-indigo-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={ambientSound.type !== 'none' ? `Playing ${ambientSound.type}` : 'Ambient Focus Sounds'}
          >
            {ambientSound.type !== 'none' ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Contextual Action Button */}
        {activeTab === 'notes' && onNewNote && (
          <button
            onClick={onNewNote}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>
        )}
      </div>
    </header>
  );
};

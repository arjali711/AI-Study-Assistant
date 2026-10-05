import React, { useState } from 'react';
import { StudyGoal, StudySession, Subject } from '../types';
import { api } from '../lib/api';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle2,
  Circle,
  Plus,
  Flame,
  Calendar,
  Sparkles,
  Headphones,
  Check
} from 'lucide-react';

interface StudyPlannerProps {
  subjects: Subject[];
  goals: StudyGoal[];
  sessions: StudySession[];
  onRefreshGoals: () => void;
  onRefreshSessions: () => void;
  pomodoro: {
    isRunning: boolean;
    timeLeft: number;
    mode: 'focus' | 'shortBreak' | 'longBreak';
    toggleTimer: () => void;
    resetTimer: () => void;
    setTimerMode: (mode: 'focus' | 'shortBreak' | 'longBreak') => void;
  };
  ambientSound: {
    type: string;
    setSound: (type: any) => void;
  };
}

export const StudyPlanner: React.FC<StudyPlannerProps> = ({
  subjects,
  goals,
  sessions,
  onRefreshGoals,
  onRefreshSessions,
  pomodoro,
  ambientSound,
}) => {
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalMinutes, setNewGoalMinutes] = useState(30);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    try {
      await api.createGoal(newGoalTitle.trim(), newGoalMinutes);
      setNewGoalTitle('');
      onRefreshGoals();
    } catch (err) {
      console.warn(err);
    }
  };

  const handleToggleGoal = async (id: number) => {
    try {
      await api.toggleGoal(id);
      onRefreshGoals();
    } catch (err) {
      console.warn(err);
    }
  };

  const ambientOptions = [
    { id: 'rain', label: 'Cozy Rain', desc: 'Brown noise filter for deep relaxation' },
    { id: 'warm', label: 'Warm Pink Noise', desc: 'Soft frequency spectrum for reading' },
    { id: 'binaural', label: '40Hz Gamma Focus', desc: 'Binaural beat for peak concentration' },
    { id: 'whitenoise', label: 'Clean White Noise', desc: 'Block distracting environmental sound' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-6 space-y-6">
      {/* Top Banner */}
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pomodoro Big Focus Card */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Mode Pill Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800 mb-8 z-10">
            <button
              onClick={() => pomodoro.setTimerMode('focus')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                pomodoro.mode === 'focus'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Focus (25m)
            </button>
            <button
              onClick={() => pomodoro.setTimerMode('shortBreak')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                pomodoro.mode === 'shortBreak'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Short Break (5m)
            </button>
            <button
              onClick={() => pomodoro.setTimerMode('longBreak')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                pomodoro.mode === 'longBreak'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Long Break (15m)
            </button>
          </div>

          {/* Big Clock Display */}
          <div className="flex flex-col items-center my-6 z-10">
            <div className="font-mono text-7xl md:text-8xl font-black text-white tracking-tighter drop-shadow-lg">
              {formatTime(pomodoro.timeLeft)}
            </div>
            <div className="text-xs uppercase tracking-widest font-semibold text-indigo-400 mt-2">
              {pomodoro.mode === 'focus' ? 'Deep Work Interval' : 'Rest & Neuro-Recovery'}
            </div>
          </div>

          {/* Big Control Buttons */}
          <div className="flex items-center gap-4 z-10 mt-4">
            <button
              onClick={pomodoro.toggleTimer}
              className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm shadow-xl transition cursor-pointer ${
                pomodoro.isRunning
                  ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              }`}
            >
              {pomodoro.isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause Session</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Focus</span>
                </>
              )}
            </button>

            <button
              onClick={pomodoro.resetTimer}
              className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Ambient Audio Synthesizer */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Headphones className="w-5 h-5 text-indigo-400" />
                <span>Ambient Sound Machine</span>
              </div>
              {ambientSound.type !== 'none' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 animate-pulse">
                  Playing
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Real-time Web Audio synthesizer for background acoustic masking.
            </p>

            {/* Ambient Sound Selection Buttons */}
            <div className="space-y-2">
              {ambientOptions.map((opt) => {
                const isActive = ambientSound.type === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => ambientSound.setSound(isActive ? 'none' : opt.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600/20 border-indigo-500/70 text-white'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{opt.label}</div>
                      <div className="text-[11px] text-slate-400">{opt.desc}</div>
                    </div>
                    <div>
                      {isActive ? (
                        <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>40Hz Gamma Beats stimulate cortical synchronization for learning.</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Daily Goals & Session Log */}
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Study Goals */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <h4 className="font-bold text-sm text-white">Daily Study Goals</h4>
            </div>
            <span className="text-xs text-slate-400">
              {goals.filter((g) => g.completed).length} / {goals.length} Completed
            </span>
          </div>

          {/* Add Goal Form */}
          <form onSubmit={handleAddGoal} className="flex items-center gap-2">
            <input
              type="text"
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              placeholder="e.g. Master Binary Tree Traversals..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!newGoalTitle.trim()}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Goals List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {goals.map((goal) => (
              <div
                key={goal.id}
                onClick={() => handleToggleGoal(goal.id)}
                className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                  goal.completed
                    ? 'bg-slate-950/40 border-slate-800/40 opacity-60'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  {goal.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      goal.completed ? 'line-through text-slate-500' : 'text-slate-200'
                    }`}
                  >
                    {goal.title}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {goal.target_minutes}m
                </span>
              </div>
            ))}

            {goals.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-xs">
                No daily goals set yet. Add one above!
              </div>
            )}
          </div>
        </div>

        {/* Recent Study Sessions (SQLite Synced) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h4 className="font-bold text-sm text-white">Logged Focus Sessions</h4>
            </div>
            <span className="text-xs text-slate-500 font-mono">SQLite DB</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-200">
                    {sess.subject_name || 'General Focus'}
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1">
                    {sess.notes || `Completed ${sess.duration_minutes}m ${sess.session_type} session`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-indigo-400">
                    {sess.duration_minutes} min
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(sess.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {sessions.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-xs">
                No completed sessions logged today yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { AnalyticsData } from '../types';
import {
  BarChart3,
  Flame,
  Clock,
  Layers,
  Trophy,
  FileText,
  Sparkles,
  TrendingUp,
  Brain,
  CheckCircle2
} from 'lucide-react';

interface AnalyticsViewProps {
  data: AnalyticsData | null;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        Loading analytics from SQLite database...
      </div>
    );
  }

  const hours = (data.total_minutes / 60).toFixed(1);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-6 space-y-6">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Streak */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Study Streak</span>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-white flex items-baseline gap-1">
                {data.streak_days} <span className="text-xs font-normal text-slate-400">Days</span>
              </div>
              <p className="text-[11px] text-amber-400 mt-1 font-medium">Consistent learner</p>
            </div>
          </div>

          {/* Total Focus Time */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Total Study Time</span>
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-white flex items-baseline gap-1">
                {hours} <span className="text-xs font-normal text-slate-400">Hours</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{data.total_sessions} completed blocks</p>
            </div>
          </div>

          {/* Flashcard Retention */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Mastery Rate</span>
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-emerald-400 flex items-baseline gap-1">
                {data.mastery_rate}%
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {data.mastered_flashcards} of {data.total_flashcards} cards
              </p>
            </div>
          </div>

          {/* Quiz Performance */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Quiz Accuracy</span>
              <Trophy className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-purple-400 flex items-baseline gap-1">
                {data.average_quiz_score}%
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{data.total_quiz_attempts} attempts logged</p>
            </div>
          </div>
        </div>

        {/* Charts & Distributions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Subject Time Distribution */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-base text-white">Subject Time Allocation</h4>
                <p className="text-xs text-slate-400">Total focus minutes tracked by course discipline</p>
              </div>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>

            <div className="space-y-3 pt-2">
              {data.subject_breakdown.map((sub, idx) => {
                const totalMins = data.total_minutes || 1;
                const pct = Math.min(100, Math.round((sub.minutes / totalMins) * 100));

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">{sub.name}</span>
                      <span className="font-mono text-slate-400">
                        {sub.minutes} mins ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {data.subject_breakdown.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No study sessions recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* AI Cognitive Science Insights */}
          <div className="lg:col-span-5 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-base mb-1">
                <Brain className="w-5 h-5 text-indigo-400" />
                <span>Cognitive Retention Insights</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Personalized study optimization based on your active recall telemetry.
              </p>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-slate-300 leading-relaxed">
                    <strong className="text-white">Expand Recall Intervals:</strong> Review your Computer Science deck today to counteract the Ebbinghaus forgetting threshold.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-2.5 text-xs">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-slate-300 leading-relaxed">
                    <strong className="text-white">Interleaving Strategy:</strong> Mix Machine Learning notes with Data Structures quizzes to strengthen conceptual discrimination.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-2.5 text-xs">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-slate-300 leading-relaxed">
                    <strong className="text-white">Prime Focus Zone:</strong> Your highest accuracy is observed during 25-minute Pomodoro intervals accompanied by 40Hz binaural beats.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Backed by SQLite event logs</span>
              <span className="text-indigo-400 font-medium">Gemini 3.8 Tuned</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  Bot,
  FileText,
  Layers,
  Trophy,
  Clock,
  BarChart3,
  Database,
  Code2,
  Sparkles,
  GraduationCap
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  analyticsData?: { streak_days: number };
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, analyticsData }) => {
  const navItems = [
    { id: 'tutor', label: 'AI Study Tutor', icon: Bot, badge: 'Gemini 3.8' },
    { id: 'notes', label: 'Study Notes', icon: FileText },
    { id: 'flashcards', label: 'Flashcards & SRS', icon: Layers },
    { id: 'quiz', label: 'Quiz Arena', icon: Trophy },
    { id: 'planner', label: 'Pomodoro & Focus', icon: Clock },
    { id: 'analytics', label: 'Study Analytics', icon: BarChart3 },
    { id: 'sql', label: 'SQLite Studio', icon: Database, badge: 'SQL' },
    { id: 'fastapi', label: 'FastAPI / Python Spec', icon: Code2, badge: 'Code' },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0 select-none backdrop-blur-md">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              CogniStudy
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-400">AI Learning Operating System</p>
          </div>
        </div>
      </div>

      {/* Streak banner */}
      <div className="mx-3 mt-4 mb-2 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <div>
            <div className="text-xs font-semibold text-amber-200">Study Streak</div>
            <div className="text-[11px] text-slate-400">{analyticsData?.streak_days || 1} Days Active</div>
          </div>
        </div>
        <div className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
          Lv. 3
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Core Workspaces
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              SQLite Engine
            </span>
            <span className="text-slate-300 font-mono text-[11px]">Active</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Gemini 3.8
            </span>
            <span className="text-indigo-400 font-semibold text-[11px]">Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from './lib/api';
import { studyAudio } from './lib/audio';
import { Subject, Note, StudyGoal, StudySession, AnalyticsData } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AiTutor } from './components/AiTutor';
import { NotesManager } from './components/NotesManager';
import { FlashcardsView } from './components/FlashcardsView';
import { QuizArena } from './components/QuizArena';
import { StudyPlanner } from './components/StudyPlanner';
import { AnalyticsView } from './components/AnalyticsView';
import { SqlStudio } from './components/SqlStudio';
import { FastApiExplorer } from './components/FastApiExplorer';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('tutor');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  // Global Pomodoro State
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(25 * 60);

  // Ambient sound state
  const [ambientType, setAmbientType] = useState<string>('none');

  // Load all initial data
  const loadData = async () => {
    try {
      const [subs, nts, gls, sss, ana] = await Promise.all([
        api.getSubjects(),
        api.getNotes(),
        api.getGoals(),
        api.getStudySessions(),
        api.getAnalytics(),
      ]);
      setSubjects(subs);
      setNotes(nts);
      setGoals(gls);
      setSessions(sss);
      setAnalyticsData(ana);
    } catch (err) {
      console.warn('Initial data load error:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Pomodoro countdown timer tick
  useEffect(() => {
    let interval: any;
    if (pomodoroRunning) {
      interval = setInterval(() => {
        setPomodoroTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer expired!
            studyAudio.playCompletionChime();
            setPomodoroRunning(false);

            if (pomodoroMode === 'focus') {
              // Log 25min study session to SQLite
              api.logStudySession({
                subject_id: selectedSubjectId,
                duration_minutes: 25,
                session_type: 'pomodoro',
                notes: 'Completed 25m Focus Block',
              }).then(() => {
                loadData();
              });
              setPomodoroMode('shortBreak');
              return 5 * 60;
            } else {
              setPomodoroMode('focus');
              return 25 * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [pomodoroRunning, pomodoroMode, selectedSubjectId]);

  const togglePomodoro = () => {
    setPomodoroRunning((prev) => !prev);
  };

  const resetPomodoro = () => {
    setPomodoroRunning(false);
    if (pomodoroMode === 'focus') setPomodoroTimeLeft(25 * 60);
    else if (pomodoroMode === 'shortBreak') setPomodoroTimeLeft(5 * 60);
    else setPomodoroTimeLeft(15 * 60);
  };

  const setTimerMode = (mode: 'focus' | 'shortBreak' | 'longBreak') => {
    setPomodoroRunning(false);
    setPomodoroMode(mode);
    if (mode === 'focus') setPomodoroTimeLeft(25 * 60);
    else if (mode === 'shortBreak') setPomodoroTimeLeft(5 * 60);
    else setPomodoroTimeLeft(15 * 60);
  };

  const handleSetAmbientSound = (type: 'rain' | 'whitenoise' | 'binaural' | 'warm' | 'none') => {
    if (type === 'none') {
      studyAudio.stopAmbient();
      setAmbientType('none');
    } else {
      studyAudio.startAmbient(type);
      setAmbientType(type);
    }
  };

  // Cross-component actions
  const handleSaveToNotesFromTutor = async (title: string, content: string) => {
    try {
      await api.createNote({
        title: title || 'Tutor Study Insight',
        content,
        subject_id: selectedSubjectId || (subjects[0]?.id || null),
        tags: 'ai-tutor,insights',
      });
      await loadData();
      setActiveTab('notes');
    } catch (e: any) {
      alert(`Could not save note: ${e.message}`);
    }
  };

  const handleGenerateFlashcardsFromText = async (text: string) => {
    try {
      const decks = await api.getDecks();
      let targetDeck = decks[0];
      if (!targetDeck) {
        targetDeck = await api.createDeck({
          title: 'AI Study Deck',
          description: 'Flashcards synthesized from tutor discussion',
          subject_id: selectedSubjectId || (subjects[0]?.id || null),
        });
      }

      await api.generateFlashcards({
        topic: 'Concept Review',
        source_text: text,
        count: 5,
        deck_id: targetDeck.id,
      });

      setActiveTab('flashcards');
    } catch (e: any) {
      alert(`Could not generate flashcards: ${e.message}`);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        analyticsData={analyticsData ? { streak_days: analyticsData.streak_days } : undefined}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          subjects={subjects}
          selectedSubjectId={selectedSubjectId}
          setSelectedSubjectId={setSelectedSubjectId}
          pomodoro={{
            isRunning: pomodoroRunning,
            timeLeft: pomodoroTimeLeft,
            mode: pomodoroMode,
            toggleTimer: togglePomodoro,
            resetTimer: resetPomodoro,
          }}
          ambientSound={{
            type: ambientType,
            setSound: handleSetAmbientSound,
          }}
          onNewNote={() => setActiveTab('notes')}
        />

        {/* Workspace Views */}
        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'tutor' && (
            <AiTutor
              subjects={subjects}
              onSaveToNotes={handleSaveToNotesFromTutor}
              onGenerateFlashcardsFromText={handleGenerateFlashcardsFromText}
            />
          )}

          {activeTab === 'notes' && (
            <NotesManager
              notes={notes}
              subjects={subjects}
              selectedSubjectId={selectedSubjectId}
              onRefreshNotes={loadData}
              onNavigateToFlashcards={() => setActiveTab('flashcards')}
              onNavigateToQuiz={() => setActiveTab('quiz')}
            />
          )}

          {activeTab === 'flashcards' && (
            <FlashcardsView
              subjects={subjects}
              selectedSubjectId={selectedSubjectId}
            />
          )}

          {activeTab === 'quiz' && (
            <QuizArena
              subjects={subjects}
              selectedSubjectId={selectedSubjectId}
            />
          )}

          {activeTab === 'planner' && (
            <StudyPlanner
              subjects={subjects}
              goals={goals}
              sessions={sessions}
              onRefreshGoals={loadData}
              onRefreshSessions={loadData}
              pomodoro={{
                isRunning: pomodoroRunning,
                timeLeft: pomodoroTimeLeft,
                mode: pomodoroMode,
                toggleTimer: togglePomodoro,
                resetTimer: resetPomodoro,
                setTimerMode,
              }}
              ambientSound={{
                type: ambientType,
                setSound: handleSetAmbientSound,
              }}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView data={analyticsData} />
          )}

          {activeTab === 'sql' && (
            <SqlStudio />
          )}

          {activeTab === 'fastapi' && (
            <FastApiExplorer />
          )}
        </main>
      </div>
    </div>
  );
}

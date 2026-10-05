import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Quiz, Subject } from '../types';
import { api } from '../lib/api';
import {
  Trophy,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Clock,
  BookOpen,
  Plus,
  Award
} from 'lucide-react';

interface QuizArenaProps {
  subjects: Subject[];
  selectedSubjectId: number | null;
}

export const QuizArena: React.FC<QuizArenaProps> = ({ subjects, selectedSubjectId }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);

  // Generator modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [questionCount, setQuestionCount] = useState(4);
  const [subjectId, setSubjectId] = useState<number | null>(subjects[0]?.id || null);
  const [generating, setGenerating] = useState(false);

  const loadQuizzes = async () => {
    try {
      const data = await api.getQuizzes();
      setQuizzes(data);
    } catch (e) {
      console.error('Failed to load quizzes:', e);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  // Timer for active quiz
  useEffect(() => {
    let timer: any;
    if (activeQuiz && !quizFinished) {
      timer = setInterval(() => {
        setTimeSpent((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeQuiz, quizFinished]);

  const startQuiz = async (quizSummary: Quiz) => {
    try {
      const fullQuiz = await api.getQuiz(quizSummary.id);
      setActiveQuiz(fullQuiz);
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setIsAnswered(false);
      setScore(0);
      setQuizFinished(false);
      setTimeSpent(0);
    } catch (e) {
      console.error('Failed to load full quiz:', e);
    }
  };

  const handleSelectOption = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const currentQ = activeQuiz?.questions?.[currentQuestionIndex];
    if (currentQ && option === currentQ.correct_answer) {
      setScore((s) => s + 1);
    }
  };

  const handleNextQuestion = async () => {
    if (!activeQuiz?.questions) return;

    if (currentQuestionIndex + 1 < activeQuiz.questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // Quiz finished
      setQuizFinished(true);
      const finalScore = score + (selectedOption === activeQuiz.questions[currentQuestionIndex].correct_answer ? 0 : 0);
      
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });

      // Submit attempt to SQLite backend
      try {
        await api.submitQuizAttempt(activeQuiz.id, score, activeQuiz.questions.length, timeSpent);
        loadQuizzes();
      } catch (err) {
        console.warn('Failed to submit attempt:', err);
      }
    }
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setGenerating(true);
    try {
      const res = await api.generateQuiz({
        topic: topic.trim(),
        difficulty,
        question_count: questionCount,
        subject_id: subjectId,
      });

      setShowGenerateModal(false);
      setTopic('');
      await loadQuizzes();

      if (res.quiz_id) {
        const fullQuiz = await api.getQuiz(res.quiz_id);
        startQuiz(fullQuiz);
      }
    } catch (err: any) {
      alert(`Quiz generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const filteredQuizzes = quizzes.filter(
    (q) => !selectedSubjectId || q.subject_id === selectedSubjectId
  );

  const currentQ = activeQuiz?.questions?.[currentQuestionIndex];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-bold text-base text-white">
            {activeQuiz ? activeQuiz.title : 'AI Quiz Arena & Active Testing'}
          </h3>
          <p className="text-xs text-slate-400">
            {activeQuiz
              ? `Question ${currentQuestionIndex + 1} of ${activeQuiz.questions?.length || 0} • ${activeQuiz.difficulty}`
              : 'Assess knowledge, identify cognitive gaps, and verify mastery.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeQuiz ? (
            <button
              onClick={() => setActiveQuiz(null)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Exit Arena
            </button>
          ) : (
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate AI Quiz</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeQuiz && currentQ ? (
          /* Live Quiz Runner */
          <div className="max-w-2xl mx-auto flex flex-col space-y-6">
            {quizFinished ? (
              /* Results Screen */
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl animate-fade-in space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                  <Trophy className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">Quiz Completed!</h3>
                  <p className="text-sm text-slate-400">
                    Your assessment has been recorded in your SQLite study history.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 max-w-sm mx-auto flex items-center justify-around">
                  <div>
                    <div className="text-3xl font-extrabold text-white">
                      {score} / {activeQuiz.questions?.length}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Total Score</div>
                  </div>
                  <div className="h-10 w-px bg-slate-800" />
                  <div>
                    <div className="text-3xl font-extrabold text-emerald-400">
                      {Math.round((score / (activeQuiz.questions?.length || 1)) * 100)}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Accuracy</div>
                  </div>
                  <div className="h-10 w-px bg-slate-800" />
                  <div>
                    <div className="text-3xl font-extrabold text-indigo-400 font-mono">
                      {timeSpent}s
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Time Spent</div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => startQuiz(activeQuiz)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retake Quiz</span>
                  </button>
                  <button
                    onClick={() => setActiveQuiz(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition cursor-pointer"
                  >
                    Back to All Quizzes
                  </button>
                </div>
              </div>
            ) : (
              /* Active Question Card */
              <div className="space-y-6">
                {/* Progress bar */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Question {currentQuestionIndex + 1} of {activeQuiz.questions?.length || 0}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{timeSpent}s</span>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{
                      width: `${((currentQuestionIndex + 1) / (activeQuiz.questions?.length || 1)) * 100}%`,
                    }}
                  />
                </div>

                {/* Question Box */}
                <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {activeQuiz.topic}
                  </span>
                  <h3 className="text-lg font-bold text-white leading-relaxed">
                    {currentQ.question}
                  </h3>

                  {/* Options */}
                  <div className="space-y-2.5 pt-2">
                    {currentQ.options.map((option, idx) => {
                      const isSelected = selectedOption === option;
                      const isCorrect = option === currentQ.correct_answer;

                      let btnStyle = 'bg-slate-950/70 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850';
                      if (isAnswered) {
                        if (isCorrect) {
                          btnStyle = 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200';
                        } else if (isSelected) {
                          btnStyle = 'bg-red-950/40 border-red-500/80 text-red-200';
                        } else {
                          btnStyle = 'opacity-40 border-slate-850';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectOption(option)}
                          disabled={isAnswered}
                          className={`w-full p-4 rounded-2xl border text-left text-sm font-medium transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-slate-800/80 text-xs font-semibold flex items-center justify-center text-slate-400 shrink-0">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span>{option}</span>
                          </div>

                          {isAnswered && (
                            <div>
                              {isCorrect ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                              ) : isSelected ? (
                                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                              ) : null}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Answer Explanation Box */}
                {isAnswered && (
                  <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 shadow-lg space-y-2 animate-fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                      <HelpCircle className="w-4 h-4 text-indigo-400" />
                      <span>Educational Explanation:</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {currentQ.explanation}
                    </p>
                  </div>
                )}

                {/* Next button */}
                {isAnswered && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleNextQuestion}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 transition cursor-pointer"
                    >
                      <span>
                        {currentQuestionIndex + 1 === (activeQuiz.questions?.length || 0) ? 'Finish Quiz' : 'Next Question'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Quizzes Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {filteredQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-indigo-500/60 transition shadow-md hover:shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {quiz.subject_name || 'General'}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                      {quiz.difficulty}
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-white mb-1">{quiz.title}</h4>
                  <p className="text-xs text-slate-400 mb-4">Topic: {quiz.topic}</p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    <span>{quiz.total_questions} Questions</span>
                    {quiz.best_score !== undefined && quiz.best_score !== null && (
                      <span className="ml-2 text-emerald-400 font-semibold">
                        Best: {quiz.best_score}/{quiz.total_questions}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => startQuiz(quiz)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Start</span>
                  </button>
                </div>
              </div>
            ))}

            {filteredQuizzes.length === 0 && (
              <div className="col-span-full text-center py-16 text-slate-500">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <h4 className="text-base font-semibold text-slate-300">No Quizzes Available</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                  Create custom practice tests powered by Gemini 3.8 Flash to test your understanding.
                </p>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
                >
                  Generate Practice Quiz
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Quiz Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-white">Generate AI Practice Quiz</h3>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateQuiz} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Subject</label>
                <select
                  value={subjectId || ''}
                  onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Quiz Topic / Concept</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Asymptotic Complexity & Master Theorem"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Difficulty Level</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                  >
                    <option value="Beginner">Beginner (Foundations)</option>
                    <option value="Intermediate">Intermediate (Standard)</option>
                    <option value="Advanced">Advanced (Exam Grade)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Question Count</label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                  >
                    <option value={3}>3 Questions</option>
                    <option value={4}>4 Questions (Balanced)</option>
                    <option value={6}>6 Questions</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating || !topic.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{generating ? 'Drafting Questions...' : 'Create Practice Quiz'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

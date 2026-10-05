import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { FlashcardDeck, Flashcard, Subject } from '../types';
import { api } from '../lib/api';
import {
  Layers,
  Sparkles,
  Plus,
  Play,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trash2,
  BookOpen,
  ArrowLeft,
  Flame,
  Award
} from 'lucide-react';

interface FlashcardsViewProps {
  subjects: Subject[];
  selectedSubjectId: number | null;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({ subjects, selectedSubjectId }) => {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);

  // Study Mode State
  const [studyMode, setStudyMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [sessionStats, setSessionStats] = useState({ again: 0, good: 0, mastered: 0 });
  const [studyCompleted, setStudyCompleted] = useState(false);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [newDeckSubjectId, setNewDeckSubjectId] = useState<number | null>(subjects[0]?.id || null);

  // AI Generator Form
  const [aiTopic, setAiTopic] = useState('');
  const [aiSourceText, setAiSourceText] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiTargetDeckId, setAiTargetDeckId] = useState<number | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Manual Add Card Form
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [newCardHint, setNewCardHint] = useState('');

  const loadDecks = async () => {
    try {
      const data = await api.getDecks();
      setDecks(data);
    } catch (e) {
      console.error('Failed to load decks:', e);
    }
  };

  useEffect(() => {
    loadDecks();
  }, []);

  const handleOpenDeck = async (deck: FlashcardDeck) => {
    setActiveDeck(deck);
    setLoading(true);
    try {
      const deckCards = await api.getDeckCards(deck.id);
      setCards(deckCards);
    } catch (e) {
      console.error('Failed to load cards:', e);
    } finally {
      setLoading(false);
    }
  };

  const startStudySession = () => {
    if (cards.length === 0) return;
    setStudyMode(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setSessionStats({ again: 0, good: 0, mastered: 0 });
    setStudyCompleted(false);
  };

  const handleRateCard = async (rating: 'again' | 'good' | 'mastered') => {
    const card = cards[currentIndex];
    if (!card) return;

    try {
      const updated = await api.reviewFlashcard(card.id, rating);
      setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

      setSessionStats((prev) => ({
        ...prev,
        [rating]: prev[rating] + 1,
      }));

      if (currentIndex + 1 < cards.length) {
        setIsFlipped(false);
        setShowHint(false);
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Completed deck
        setStudyCompleted(true);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        // Log study session to SQLite
        if (activeDeck) {
          api.logStudySession({
            subject_id: activeDeck.subject_id,
            duration_minutes: Math.max(5, cards.length * 2),
            session_type: 'flashcards',
            notes: `Reviewed ${cards.length} cards in "${activeDeck.title}"`,
          }).catch(console.warn);
        }
      }
    } catch (e) {
      console.error('Review error:', e);
    }
  };

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckTitle.trim()) return;

    try {
      const created = await api.createDeck({
        title: newDeckTitle.trim(),
        description: newDeckDesc.trim(),
        subject_id: newDeckSubjectId,
      });
      setShowCreateModal(false);
      setNewDeckTitle('');
      setNewDeckDesc('');
      await loadDecks();
      handleOpenDeck(created);
    } catch (err: any) {
      alert(`Error creating deck: ${err.message}`);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeck || !newCardFront.trim() || !newCardBack.trim()) return;

    try {
      const created = await api.createFlashcard({
        deck_id: activeDeck.id,
        front: newCardFront.trim(),
        back: newCardBack.trim(),
        hint: newCardHint.trim(),
      });
      setCards((prev) => [...prev, created]);
      setNewCardFront('');
      setNewCardBack('');
      setNewCardHint('');
      setShowAddCard(false);
      loadDecks();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim() && !aiSourceText.trim()) return;

    setAiGenerating(true);
    try {
      let targetId = aiTargetDeckId;
      if (!targetId) {
        // Create new deck for these cards
        const newDeck = await api.createDeck({
          title: `${aiTopic || 'AI Generated'} Flashcards`,
          description: 'Synthesized with Gemini 3.8 Flash',
          subject_id: selectedSubjectId || (subjects[0]?.id || null),
        });
        targetId = newDeck.id;
      }

      await api.generateFlashcards({
        topic: aiTopic.trim(),
        source_text: aiSourceText.trim(),
        count: aiCount,
        deck_id: targetId,
      });

      setShowAiModal(false);
      setAiTopic('');
      setAiSourceText('');
      await loadDecks();
      const updatedDecks = await api.getDecks();
      const found = updatedDecks.find((d) => d.id === targetId);
      if (found) handleOpenDeck(found);
    } catch (err: any) {
      alert(`Flashcard generation failed: ${err.message}`);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleDeleteDeck = async (deckId: number) => {
    if (confirm('Are you sure you want to delete this deck and all its flashcards?')) {
      await api.deleteDeck(deckId);
      setActiveDeck(null);
      setStudyMode(false);
      loadDecks();
    }
  };

  const filteredDecks = decks.filter(
    (d) => !selectedSubjectId || d.subject_id === selectedSubjectId
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Action Bar */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {activeDeck && (
            <button
              onClick={() => {
                setActiveDeck(null);
                setStudyMode(false);
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Back to All Decks"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h3 className="font-bold text-base text-white">
              {activeDeck ? activeDeck.title : 'Flashcard Decks & Spaced Repetition'}
            </h3>
            <p className="text-xs text-slate-400">
              {activeDeck
                ? `${cards.length} cards • SQLite Persisted`
                : 'Boost recall with active retrieval and Leitner spaced intervals'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!activeDeck ? (
            <>
              <button
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Generate Deck</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Deck</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowAddCard(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Card</span>
              </button>
              {cards.length > 0 && !studyMode && (
                <button
                  onClick={startStudySession}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Study Deck</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {studyMode && activeDeck ? (
          /* Interactive Study Mode */
          <div className="max-w-2xl mx-auto flex flex-col items-center">
            {studyCompleted ? (
              /* Completion Screen */
              <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-4">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Deck Completed!</h3>
                <p className="text-sm text-slate-400 mb-6">
                  You reviewed all {cards.length} cards in this deck. Session logged to SQLite.
                </p>

                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-8">
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <div className="text-xl font-bold text-red-400">{sessionStats.again}</div>
                    <div className="text-xs text-slate-400">Needs Review</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <div className="text-xl font-bold text-amber-400">{sessionStats.good}</div>
                    <div className="text-xs text-slate-400">Good</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-xl font-bold text-emerald-400">{sessionStats.mastered}</div>
                    <div className="text-xs text-slate-400">Mastered</div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={startStudySession}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition cursor-pointer"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>Study Again</span>
                  </button>
                  <button
                    onClick={() => setStudyMode(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition cursor-pointer"
                  >
                    Back to Deck
                  </button>
                </div>
              </div>
            ) : (
              /* Active 3D Flashcard */
              <div className="w-full flex flex-col items-center">
                {/* Progress bar */}
                <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-3 px-2">
                  <span>Card {currentIndex + 1} of {cards.length}</span>
                  <div className="flex items-center gap-2">
                    <span className="w-32 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <span
                        className="h-full bg-indigo-500 block transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
                      />
                    </span>
                    <span>{Math.round(((currentIndex + 1) / cards.length) * 100)}%</span>
                  </div>
                </div>

                {/* 3D Flip Card */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="w-full min-h-[320px] rounded-3xl bg-slate-900 border border-slate-700/80 p-8 flex flex-col justify-between shadow-2xl cursor-pointer select-none transition-all hover:border-indigo-500/60 relative group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-400 uppercase tracking-wider">
                      {isFlipped ? 'Answer' : 'Question Prompt'}
                    </span>
                    <span className="text-slate-500 text-[11px]">Click or tap to flip</span>
                  </div>

                  <div className="my-auto py-6 text-center">
                    <p className={`font-semibold leading-relaxed ${isFlipped ? 'text-lg text-emerald-200' : 'text-xl text-white'}`}>
                      {isFlipped ? cards[currentIndex]?.back : cards[currentIndex]?.front}
                    </p>

                    {/* Hint */}
                    {cards[currentIndex]?.hint && !isFlipped && (
                      <div className="mt-4">
                        {showHint ? (
                          <div className="inline-block px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                            💡 Hint: {cards[currentIndex]?.hint}
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowHint(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-amber-300 transition"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Show Hint</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-800">
                    <span>Mastery Level: {cards[currentIndex]?.mastery_level || 0}/3</span>
                    <span>Reviewed: {cards[currentIndex]?.reviews_count || 0} times</span>
                  </div>
                </div>

                {/* Spaced Repetition Buttons */}
                <div className="w-full grid grid-cols-3 gap-3 mt-6">
                  <button
                    onClick={() => handleRateCard('again')}
                    className="p-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-semibold text-sm transition cursor-pointer flex flex-col items-center gap-1"
                  >
                    <span>Again</span>
                    <span className="text-[10px] text-red-400/80 font-normal">Needs Work (1)</span>
                  </button>

                  <button
                    onClick={() => handleRateCard('good')}
                    className="p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-sm transition cursor-pointer flex flex-col items-center gap-1"
                  >
                    <span>Good</span>
                    <span className="text-[10px] text-amber-400/80 font-normal">Recalled (2)</span>
                  </button>

                  <button
                    onClick={() => handleRateCard('mastered')}
                    className="p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-sm transition cursor-pointer flex flex-col items-center gap-1"
                  >
                    <span>Mastered</span>
                    <span className="text-[10px] text-emerald-400/80 font-normal">Easy Recall (3)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : activeDeck ? (
          /* Deck Cards List View */
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-indigo-400 font-semibold">{activeDeck.subject_name || 'General'}</span>
                <p className="text-xs text-slate-400 mt-0.5">{activeDeck.description || 'No description'}</p>
              </div>
              <button
                onClick={() => handleDeleteDeck(activeDeck.id)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition cursor-pointer"
                title="Delete Deck"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* List of cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Front:</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      Lv. {card.mastery_level}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white">{card.front}</p>
                  <div className="pt-2 border-t border-slate-800/60">
                    <span className="text-xs font-semibold text-emerald-400">Back:</span>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{card.back}</p>
                  </div>
                  {card.hint && (
                    <div className="text-[11px] text-amber-300/80 italic">Hint: {card.hint}</div>
                  )}
                </div>
              ))}
            </div>

            {cards.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Layers className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p className="text-sm font-medium text-slate-400">No cards in this deck yet.</p>
                <p className="text-xs text-slate-500 mt-1">Add cards manually or use the AI Generator!</p>
              </div>
            )}
          </div>
        ) : (
          /* Decks Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {filteredDecks.map((deck) => {
              const total = deck.total_cards || 0;
              const mastered = deck.mastered_cards || 0;
              const percent = total > 0 ? Math.round((mastered / total) * 100) : 0;

              return (
                <div
                  key={deck.id}
                  onClick={() => handleOpenDeck(deck)}
                  className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-indigo-500/60 transition-all cursor-pointer shadow-md hover:shadow-xl group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {deck.subject_name || 'General'}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {total} Cards
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-white group-hover:text-indigo-300 transition mb-1">
                      {deck.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                      {deck.description || 'Active recall study deck.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Mastery Progress</span>
                      <span className="font-semibold text-emerald-400">{percent}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredDecks.length === 0 && (
              <div className="col-span-full text-center py-16 text-slate-500">
                <Layers className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <h4 className="text-base font-semibold text-slate-300">No Flashcard Decks Found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                  Create your first deck or use Gemini 3.8 Flash to auto-generate flashcards from any topic.
                </p>
                <button
                  onClick={() => setShowAiModal(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
                >
                  Generate with AI
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Generate Deck Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-white">AI Flashcard Generator</h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAiGenerate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Study Topic</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Graph Algorithms or Cellular Respiration"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Source Text or Notes (Optional)
                </label>
                <textarea
                  value={aiSourceText}
                  onChange={(e) => setAiSourceText(e.target.value)}
                  placeholder="Paste lecture notes or textbook excerpts for Gemini to extract cards from..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500 h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Target Deck</label>
                  <select
                    value={aiTargetDeckId || ''}
                    onChange={(e) => setAiTargetDeckId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                  >
                    <option value="">Create New Deck</option>
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Number of Cards</label>
                  <select
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                  >
                    <option value={3}>3 Cards (Fast)</option>
                    <option value={5}>5 Cards (Recommended)</option>
                    <option value={10}>10 Cards (Deep)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={aiGenerating || (!aiTopic.trim() && !aiSourceText.trim())}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold shadow-md shadow-indigo-600/30"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiGenerating ? 'Synthesizing Cards...' : 'Generate Flashcards'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Create Deck Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">Create Flashcard Deck</h3>
            <form onSubmit={handleCreateDeck} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Subject</label>
                <select
                  value={newDeckSubjectId || ''}
                  onChange={(e) => setNewDeckSubjectId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Deck Title</label>
                <input
                  type="text"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  placeholder="e.g. Operating Systems Core Concepts"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  value={newDeckDesc}
                  onChange={(e) => setNewDeckDesc(e.target.value)}
                  placeholder="Brief note about the scope of this deck..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500 h-20 resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Create Deck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add Card Modal */}
      {showAddCard && activeDeck && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">Add Flashcard to "{activeDeck.title}"</h3>
            <form onSubmit={handleAddCard} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Front (Question / Prompt)</label>
                <textarea
                  value={newCardFront}
                  onChange={(e) => setNewCardFront(e.target.value)}
                  placeholder="e.g. What is the time complexity of QuickSelect?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500 h-20 resize-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Back (Answer)</label>
                <textarea
                  value={newCardBack}
                  onChange={(e) => setNewCardBack(e.target.value)}
                  placeholder="e.g. O(n) average time complexity, O(n^2) worst case."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500 h-24 resize-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Hint (Optional)</label>
                <input
                  type="text"
                  value={newCardHint}
                  onChange={(e) => setNewCardHint(e.target.value)}
                  placeholder="Subtle memory clue..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCard(false)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Save Flashcard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

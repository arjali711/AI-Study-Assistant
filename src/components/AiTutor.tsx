import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Volume2,
  Copy,
  Check,
  FilePlus,
  Layers,
  HelpCircle,
  Lightbulb,
  Zap,
  Code
} from 'lucide-react';
import { api } from '../lib/api';
import { ChatMessage, Subject } from '../types';

interface AiTutorProps {
  subjects: Subject[];
  onSaveToNotes: (title: string, content: string) => void;
  onGenerateFlashcardsFromText: (text: string) => void;
}

export const AiTutor: React.FC<AiTutorProps> = ({
  subjects,
  onSaveToNotes,
  onGenerateFlashcardsFromText,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 **Welcome to CogniStudy AI Tutor!**\n\nI am your personalized learning companion powered by **Google Gemini 3.8 Flash** and an integrated **SQLite** database.\n\nChoose an instruction mode above or try asking:\n- *"Can you explain the intuition behind the Attention Mechanism in Transformers?"*\n- *"Quiz me on Big-O complexity for graph search algorithms."*\n- *"Explain Spaced Repetition using the Feynman Technique."*\n- *"Help me debug a recursive binary tree traversal."*`,
      mode: 'socratic',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'socratic' | 'exam_prep' | 'simplifier' | 'stem_code'>('socratic');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      mode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const data = await api.chatWithTutor(text.trim(), mode);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'No response generated.',
        mode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ **Connection Error:** Could not contact the study assistant backend. (${err.message})`,
        mode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown characters for pleasant speech
    const cleanText = text
      .replace(/[#*_`~-]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/\n+/g, '. ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const modes = [
    { id: 'socratic', name: 'Socratic Tutor', icon: HelpCircle, desc: 'Guides you with questions' },
    { id: 'exam_prep', name: 'Exam Prep Coach', icon: Zap, desc: 'High-yield traps & recall' },
    { id: 'simplifier', name: 'Feynman ELI5', icon: Lightbulb, desc: 'Intuitive analogies' },
    { id: 'stem_code', name: 'STEM & Code Mentor', icon: Code, desc: 'Rigorous math & code' },
  ];

  const quickPrompts = [
    'Explain the intuition of Dynamic Programming',
    'Quiz me on the Forgetting Curve and Spaced Repetition',
    'Explain the Difference between TCP and UDP with a real-world analogy',
    'How does Self-Attention work in Transformers?',
  ];

  // Simple Markdown renderer
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="text-base font-bold text-indigo-300 mt-3 mb-1.5">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="text-lg font-bold text-white mt-4 mb-2">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="text-xl font-extrabold text-white mt-4 mb-2">{line.replace('# ', '')}</h2>;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-4 border-indigo-500/60 pl-3 my-2 text-slate-300 italic text-sm">
            {line.replace('> ', '')}
          </blockquote>
        );
      }

      // Bullet lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const itemText = line.trim().replace(/^[-*]\s+/, '');
        return (
          <div key={idx} className="flex items-start gap-2 my-1 text-slate-200 text-sm">
            <span className="text-indigo-400 mt-1">•</span>
            <span>{renderFormattedText(itemText)}</span>
          </div>
        );
      }

      // Empty lines
      if (!line.trim()) {
        return <div key={idx} className="h-2"></div>;
      }

      return <p key={idx} className="my-1 text-slate-200 text-sm leading-relaxed">{renderFormattedText(line)}</p>;
    });
  };

  const renderFormattedText = (text: string) => {
    // Process bold **text** and inline code `code`
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 text-xs font-mono border border-slate-700/60">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Mode Selector Strip */}
      <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between gap-3 overflow-x-auto shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Tutor Persona:</span>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
            {modes.map((m) => {
              const Icon = m.icon;
              const isSelected = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={m.desc}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Gemini 3.8 Flash • Socratic Active Recall</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 max-w-3xl ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm ${
                  isUser
                    ? 'bg-indigo-600'
                    : 'bg-gradient-to-tr from-purple-600 to-indigo-600 border border-indigo-400/30'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`rounded-2xl px-5 py-4 shadow-md transition-all ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-none'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-4 mb-2 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">
                    {isUser ? 'You' : 'CogniStudy Tutor'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{msg.timestamp}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="text-sm">
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    renderMarkdown(msg.content)
                  )}
                </div>

                {/* Actions on Assistant messages */}
                {!isUser && msg.id !== 'welcome' && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSpeak(msg.id, msg.content)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 transition ${
                          speakingId === msg.id ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400'
                        }`}
                        title="Listen to response"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{speakingId === msg.id ? 'Stop' : 'Listen'}</span>
                      </button>

                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                        title="Copy to clipboard"
                      >
                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSaveToNotes('Study Tutor Insight', msg.content)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-300 transition"
                        title="Save this reply directly to your study notes database"
                      >
                        <FilePlus className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Save to Notes</span>
                      </button>

                      <button
                        onClick={() => onGenerateFlashcardsFromText(msg.content)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-300 transition"
                        title="Generate active recall flashcards from this concept"
                      >
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Make Flashcards</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3 max-w-2xl mr-auto">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-2xl rounded-tl-none bg-slate-900 border border-slate-800 px-5 py-4 text-slate-300 flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
              <span className="text-sm font-medium">CogniStudy Tutor is synthesizing insights...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar (when input is empty) */}
      {messages.length < 4 && (
        <div className="px-6 py-2 bg-slate-900/30 border-t border-slate-800/60 overflow-x-auto flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">Try asking:</span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qp)}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 whitespace-nowrap transition cursor-pointer"
            >
              {qp}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-4xl mx-auto flex items-center gap-2 bg-slate-900 border border-slate-700/70 focus-within:border-indigo-500 rounded-2xl px-4 py-2 shadow-lg transition"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question, request a concept breakdown, or ask for a practice problem..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm py-1"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  Code2,
  FileCode,
  Copy,
  Check,
  Play,
  Server,
  Layers,
  Sparkles,
  ExternalLink,
  Terminal,
  BookOpen
} from 'lucide-react';

export const FastApiExplorer: React.FC = () => {
  const [pythonFiles, setPythonFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('main.py');
  const [copied, setCopied] = useState(false);

  // Interactive Endpoint Tester
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('GET /api/notes');
  const [testResponse, setTestResponse] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    const fetchCode = async () => {
      try {
        const res = await api.getPythonCode();
        setPythonFiles(res.files || {});
      } catch (err) {
        console.warn('Failed to load python files:', err);
      }
    };
    fetchCode();
  }, []);

  const handleCopyCode = () => {
    const code = pythonFiles[activeFile] || '';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const endpoints = [
    { method: 'GET', path: '/api/subjects', desc: 'List all study courses and subjects' },
    { method: 'GET', path: '/api/notes', desc: 'Query persisted study notes with optional search filter' },
    { method: 'GET', path: '/api/flashcards/decks', desc: 'Retrieve flashcard decks and mastery counts' },
    { method: 'GET', path: '/api/analytics', desc: 'Fetch calculated study streak, hours, and retention' },
    { method: 'POST', path: '/api/chat', desc: 'Send study prompt to Gemini 3.8 Flash with Socratic context' },
  ];

  const handleTestEndpoint = async (endpoint: string) => {
    setSelectedEndpoint(endpoint);
    setTestLoading(true);
    setTestResponse(null);

    try {
      if (endpoint === 'GET /api/subjects') {
        const res = await api.getSubjects();
        setTestResponse({ status: 200, data: res });
      } else if (endpoint === 'GET /api/notes') {
        const res = await api.getNotes();
        setTestResponse({ status: 200, data: res });
      } else if (endpoint === 'GET /api/flashcards/decks') {
        const res = await api.getDecks();
        setTestResponse({ status: 200, data: res });
      } else if (endpoint === 'GET /api/analytics') {
        const res = await api.getAnalytics();
        setTestResponse({ status: 200, data: res });
      } else if (endpoint === 'POST /api/chat') {
        const res = await api.chatWithTutor('Explain QuickSort in one sentence.', 'simplifier');
        setTestResponse({ status: 200, payload: { message: 'Explain QuickSort in one sentence.', mode: 'simplifier' }, response: res });
      }
    } catch (err: any) {
      setTestResponse({ status: 500, error: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  const fileList = Object.keys(pythonFiles);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Banner */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-white">
              Python & FastAPI Architecture Specification
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Python 3.10+ / FastAPI / SQLite
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Production-grade backend source code, Pydantic schemas, and interactive Swagger API simulation.
          </p>
        </div>

        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : `Copy ${activeFile}`}</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Code Files Explorer */}
        <div className="flex-1 flex flex-col border-r border-slate-800 overflow-hidden">
          {/* File Tabs */}
          <div className="flex items-center bg-slate-900 border-b border-slate-800 overflow-x-auto px-2 pt-2 gap-1 shrink-0">
            {fileList.map((fn) => {
              const isActive = activeFile === fn;
              return (
                <button
                  key={fn}
                  onClick={() => setActiveFile(fn)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono rounded-t-xl transition cursor-pointer ${
                    isActive
                      ? 'bg-slate-950 text-indigo-300 font-semibold border-t border-x border-slate-800'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{fn}</span>
                </button>
              );
            })}
          </div>

          {/* Code Viewer */}
          <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-200 leading-relaxed">
            <pre className="whitespace-pre">
              {pythonFiles[activeFile] || '# Loading source code...'}
            </pre>
          </div>
        </div>

        {/* Right Side: Interactive API Sandbox & Swagger Simulator */}
        <div className="w-96 bg-slate-900/40 flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-xs text-white">Live API Endpoint Sandbox</h4>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">FastAPI docs</span>
          </div>

          {/* Endpoints List */}
          <div className="p-3 border-b border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400">Select Endpoint to Test:</span>
            <div className="space-y-1.5">
              {endpoints.map((ep, idx) => {
                const epKey = `${ep.method} ${ep.path}`;
                const isSelected = selectedEndpoint === epKey;
                return (
                  <button
                    key={idx}
                    onClick={() => handleTestEndpoint(epKey)}
                    className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                            ep.method === 'GET'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {ep.method}
                        </span>
                        <span className="font-mono text-xs font-semibold">{ep.path}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{ep.desc}</p>
                    </div>

                    <Play className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Response Payload Viewer */}
          <div className="flex-1 flex flex-col p-3 overflow-hidden bg-slate-950">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-slate-300">Live JSON Response:</span>
              {testLoading ? (
                <span className="text-indigo-400 animate-pulse">Invoking...</span>
              ) : testResponse?.status ? (
                <span className="font-mono text-emerald-400 text-[10px]">
                  HTTP {testResponse.status} OK
                </span>
              ) : null}
            </div>

            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 overflow-auto font-mono text-[11px] text-emerald-300">
              {testLoading ? (
                <div className="flex items-center gap-2 text-slate-400 py-4">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                  <span>Executing request via backend proxy...</span>
                </div>
              ) : testResponse ? (
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(testResponse, null, 2)}
                </pre>
              ) : (
                <span className="text-slate-500 italic">
                  Click any endpoint above to execute a live query and view the response payload.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { askAssistantRag, fetchAssistantHealth, reindexAssistant } from '../services/api';
import { AssistantAnswer, AssistantHealth } from '../types';
import {
  Send,
  Bot,
  Lightbulb,
  RefreshCw,
  Trash2,
  FileText,
  Cpu,
  AlertTriangle,
  Database,
  BookOpen,
  Wrench,
  Copy,
  Check
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  answer?: AssistantAnswer;
  timestamp: string;
  error?: boolean;
}

const WELCOME =
  "Welcome to the **Smart Campus Local RAG Assistant**.\n\n" +
  "I combine a **local code/documentation index** with a **live-data query engine** and an optional **OpenRouter** language model. " +
  "Ask about the project (architecture, APIs, risk rules, setup) **or** your student data (counts, branch comparisons, " +
  "averages, individual risk explanations). Retrieval and analytics run locally; generated answers optionally use OpenRouter.";

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatInline = (s: string): string =>
  escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-100 text-teal-700 font-mono text-[10px]">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

const renderFormattedMarkdown = (txt: string): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const items = list.items;
    const key = `list-${out.length}`;
    const render = (it: string, i: number) => (
      <li key={i} className="text-xs leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: formatInline(it) }} />
    );
    out.push(
      list.type === 'ul' ? (
        <ul key={key} className="ml-4 list-disc space-y-0.5">{items.map(render)}</ul>
      ) : (
        <ol key={key} className="ml-4 list-decimal space-y-0.5">{items.map(render)}</ol>
      )
    );
    list = null;
  };
  txt.split('\n').forEach((line, i) => {
    const bullet = line.match(/^\s*[•\-*]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (bullet) {
      if (!list || list.type !== 'ul') { flush(); list = { type: 'ul', items: [] }; }
      list.items.push(bullet[1]);
      return;
    }
    if (ordered) {
      if (!list || list.type !== 'ol') { flush(); list = { type: 'ol', items: [] }; }
      list.items.push(ordered[1]);
      return;
    }
    flush();
    if (line.trim() === '') { out.push(<div key={i} className="h-1.5" />); return; }
    if (heading) {
      out.push(<h5 key={i} className="font-bold text-slate-900 mt-2 text-xs" dangerouslySetInnerHTML={{ __html: formatInline(heading[1]) }} />);
      return;
    }
    if (/^\*\*.+\*\*:?$/.test(line.trim())) {
      out.push(<h5 key={i} className="font-bold text-slate-900 mt-2 text-xs" dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/\*\*/g, '')) }} />);
      return;
    }
    out.push(<p key={i} className="text-xs leading-relaxed text-slate-800" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />);
  });
  flush();
  return out;
};

export const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: WELCOME,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<AssistantHealth | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const lastQueryRef = useRef<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const loadHealth = useCallback(async () => {
    try {
      const h = await fetchAssistantHealth();
      setHealth(h);
    } catch {
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  const buildHistory = (): { role: 'user' | 'assistant'; content: string }[] =>
    messages
      .filter((m) => m.id !== 'welcome')
      .slice(-16)
      .map((m) => ({ role: m.sender, content: m.sender === 'user' ? m.text : m.answer?.answer || m.text }));

  const runQuery = async (queryText: string, history: { role: 'user' | 'assistant'; content: string }[]) => {
    setLoading(true);
    try {
      const resp = await askAssistantRag(queryText, history);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: resp.answer,
          answer: resp,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text:
            'Unable to reach the local analytics server. Please confirm the backend is running ' +
            `(start_backend.bat).\n\n_Reason: ${err instanceof Error ? err.message : String(err)}_`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          error: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (queryText: string) => {
    const q = queryText.trim();
    if (!q || loading) return;
    lastQueryRef.current = q;
    const history = buildHistory();
    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: q,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setInput('');
    await runQuery(q, history);
  };

  const handleRetry = async (index: number) => {
    // Re-run the user query that produced this assistant message.
    let userIdx = -1;
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') {
        userIdx = i;
        break;
      }
    }
    if (userIdx < 0) return;
    const priorHistory = messages
      .slice(0, userIdx)
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.sender, content: m.sender === 'user' ? m.text : m.answer?.answer || m.text }));
    setMessages((prev) => prev.slice(0, userIdx + 1));
    await runQuery(messages[userIdx].text, priorHistory);
  };

  const handleCopy = async (msg: Message) => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId((c) => (c === msg.id ? null : c)), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleClear = () => {
    lastQueryRef.current = '';
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: WELCOME,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleReindex = async () => {
    if (reindexing) return;
    setReindexing(true);
    try {
      const summary = await reindexAssistant(true);
      await loadHealth();
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'assistant',
          text:
            `**Re-index complete.** ${summary.document_count ?? '?'} documents · ` +
            `${summary.chunk_count ?? '?'} chunks · backend: ${summary.embed_backend ?? 'n/a'} ` +
            `(added ${summary.added ?? 0}, updated ${summary.updated ?? 0}, removed ${summary.removed ?? 0}, ` +
            `${summary.seconds ?? '?'}s).`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-err-${Date.now()}`,
          sender: 'assistant',
          text: `Re-index failed: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          error: true
        }
      ]);
    } finally {
      setReindexing(false);
    }
  };

  const statusBadge = () => {
    if (!health) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700/60 text-slate-300 border border-slate-600">
          Checking status…
        </span>
      );
    }
    const gen = health.ready.generation;
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
          gen ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' : 'bg-amber-500/15 text-amber-200 border-amber-400/30'
        }`}
        title={gen ? `LLM: ${health.llm.model}` : health.llm.reason || 'Local LLM unavailable'}
      >
        {gen ? `LLM: ${health.llm.model}` : 'Retrieval-only (LLM offline)'}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col h-full min-h-0 overflow-hidden">
      {/* Assistant Header */}
      <div className="p-4 bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 text-white flex items-center justify-between border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm tracking-tight text-white">Smart Campus Local Assistant</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                RAG + Live Data
              </span>
              {statusBadge()}
            </div>
            <p className="text-[11px] text-slate-300">
              {health
                ? `Index: ${health.index.document_count} docs · ${health.index.chunk_count} chunks · Embeddings: ${health.embedding.backend}`
                : 'Local code index + live dataset query engine'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleReindex}
            disabled={reindexing}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800 transition-colors disabled:opacity-50"
            title="Re-index project files"
          >
            <Database className={`w-4 h-4 ${reindexing ? 'animate-pulse' : ''}`} />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800 transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/60">
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-navy-900 text-teal-300 flex items-center justify-center shrink-0 border border-navy-700 mt-1 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[88%] rounded-2xl p-4 shadow-sm space-y-2 text-xs ${
                msg.sender === 'user'
                  ? 'bg-navy-900 text-white rounded-tr-none'
                  : msg.error
                  ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-none'
                  : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-none'
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-1 border-b border-slate-100 pb-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${msg.sender === 'user' ? 'text-teal-300' : 'text-slate-400'}`}>
                  {msg.sender === 'user' ? 'Faculty Query' : msg.answer?.intent ? `Answer · ${msg.answer.intent}` : 'Assistant'}
                </span>
                <span className={`text-[10px] ${msg.sender === 'user' ? 'text-slate-300' : 'text-slate-400'}`}>{msg.timestamp}</span>
              </div>

              {/* Degraded banner */}
              {msg.answer?.degraded && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="text-[11px]">
                    Answered in <strong>degraded mode</strong> (no LLM generation). Evidence below is grounded and deterministic.
                  </span>
                </div>
              )}

              {/* Answer text */}
              <div className="space-y-1">{renderFormattedMarkdown(msg.text)}</div>

              {/* Live data table */}
              {msg.answer?.data?.table_rows && msg.answer.data.table_rows.length > 0 && (
                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        {msg.answer.data.table_headers?.map((h, hi) => (
                          <th key={hi} className="py-1.5 px-2.5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {msg.answer.data.table_rows.map((row, ri) => (
                        <tr key={ri} className="hover:bg-slate-50">
                          {Object.values(row).map((val: any, vi) => (
                            <td key={vi} className="py-1.5 px-2.5 font-medium text-slate-700">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Metrics */}
              {msg.answer?.data?.metrics_summary && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  {Object.entries(msg.answer.data.metrics_summary).map(([mk, mv]: any) => (
                    <div key={mk} className="px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200 text-[11px] text-teal-900">
                      <span className="font-semibold text-slate-500 mr-1">{mk}:</span>
                      <strong className="text-teal-800">{mv}</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Dataset scope footer */}
              {msg.answer?.data?.dataset && (
                <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  Active dataset: {String(msg.answer.data.dataset.active_dataset_records ?? '?')} records · Denominator:{' '}
                  {String(msg.answer.data.dataset.denominator ?? '?')}
                  {msg.answer.data.dataset.filters_applied &&
                  Object.keys(msg.answer.data.dataset.filters_applied).length > 0
                    ? ` · Filters: ${JSON.stringify(msg.answer.data.dataset.filters_applied)}`
                    : ''}
                </p>
              )}

              {/* Citations */}
              {msg.answer?.citations && msg.answer.citations.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <BookOpen className="w-3 h-3" /> Sources
                  </div>
                  {msg.answer.citations.map((c, ci) => (
                    <div key={ci} className="flex items-start gap-2 text-[11px] text-slate-600">
                      <FileText className="w-3 h-3 mt-0.5 shrink-0 text-teal-600" />
                      <span>
                        <strong className="text-slate-700">[{c.source}{c.section ? ` § ${c.section}` : ''}]</strong>
                        {c.start_line ? ` (lines ${c.start_line}-${c.end_line})` : ''}
                        {typeof c.score === 'number' ? ` · score ${c.score}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Engine footer */}
              {msg.answer?.engine && (
                <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                  <Cpu className="w-3 h-3" />
                  <span>
                    {msg.answer.engine.llm_available ? msg.answer.engine.llm_model : 'LLM unavailable'} ·{' '}
                    {msg.answer.engine.embed_backend || 'embed?'} · {msg.answer.engine.retrieved_chunks || 0} chunks ·{' '}
                    {msg.answer.engine.used_live_data ? 'live data used' : 'docs only'}
                  </span>
                </div>
              )}

              {/* Retry / Copy */}
              {msg.sender === 'assistant' && msg.id !== 'welcome' && (
                <div className="pt-1 flex items-center gap-4">
                  <button
                    onClick={() => handleRetry(idx)}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-teal-700 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                  <button
                    onClick={() => handleCopy(msg)}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-teal-700 transition-colors"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedId === msg.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-sm font-bold text-xs">
                U
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-navy-900 text-teal-300 flex items-center justify-center shrink-0 border border-navy-700">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3.5 shadow-sm text-xs text-slate-500 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-ping"></div>
              Retrieving local evidence and computing answers…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="p-2.5 px-4 bg-slate-100/90 border-t border-slate-200 overflow-x-auto flex items-center gap-2 text-xs">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Lightbulb className="w-3 h-3 text-amber-500" /> Suggested:
        </span>
        {[
          'How many students need support?',
          'Which branch has the highest risk percentage?',
          'Show students with attendance below 75%',
          'Explain student STU-2024-00005 risk factors',
          'How does the branch risk endpoint work?',
          'Where are the risk thresholds configured?',
          'How do I set up and run this project?'
        ].map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(s)}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-teal-500 hover:text-teal-700 text-slate-700 text-[11px] font-medium whitespace-nowrap transition-colors shadow-2xs"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the project (code, APIs, risk rules) or your student data…"
            className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-navy-900 hover:bg-navy-800 disabled:opacity-40 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors text-xs shadow-sm"
        >
          <Send className="w-3.5 h-3.5 text-teal-400" />
          <span>Send</span>
        </button>
      </form>

      {/* Setup hint when generation is unavailable */}
      {health && !health.ready.generation && health.llm.setup_hint && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-[10px] text-amber-800 flex items-center gap-2">
          <Wrench className="w-3 h-3 shrink-0" />
          <span>{health.llm.setup_hint}</span>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, X, Send, Square, ChevronDown, Sparkles, BookOpen, DollarSign, Calendar, Phone, RotateCcw, Copy, CheckCheck, Wifi, WifiOff, Maximize2 } from 'lucide-react';
import { useAIChat, Message } from '../contexts/AIChatContext';
import { useAuth } from '../auth/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface QuickCategory { icon: React.ReactNode; label: string; question: string; color: string; }

// ─── Constants ────────────────────────────────────────────────────────────────
const QUICK_CATEGORIES: QuickCategory[] = [
  { icon: <DollarSign size={14} />, label: 'Học phí', question: 'Học phí tại UIT năm 2024 là bao nhiêu?', color: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
  { icon: <BookOpen size={14} />, label: 'Ngành học', question: 'UIT có những ngành đào tạo nào?', color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' },
  { icon: <GraduationCap size={14} />, label: 'Tốt nghiệp', question: 'Điều kiện tốt nghiệp UIT là gì?', color: 'text-violet-600 bg-violet-50 border-violet-200 hover:bg-violet-100' },
  { icon: <Calendar size={14} />, label: 'Lịch học', question: 'Lịch học kỳ và đăng ký môn học UIT như thế nào?', color: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100' },
  { icon: <Phone size={14} />, label: 'Liên hệ', question: 'Liên hệ phòng đào tạo UIT như thế nào?', color: 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100' },
  { icon: <Sparkles size={14} />, label: 'Học bổng', question: 'UIT có những loại học bổng nào?', color: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100' },
];

const SOURCE_LABELS: Record<string, string> = {
  knowledge_base: '📚 Dữ liệu tĩnh',
  faq: '💡 Câu hỏi thường gặp',
  gemini_ai: '✨ Trả lời bởi AI (Trọng tâm)',
  scraped_direct_summary: '⚡ Trích xuất tự động',
  scraped_direct: '📄 Trích xuất nguyên văn',
  rag_vector: '✨ Trả lời bởi AI',
  rag_cache: '⚡ Trả lời nhanh',
  rule_based: '🤖 Hệ thống',
};

// ─── Markdown Renderer đơn giản ────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (!line.trim()) { elements.push(<br key={i} />); return; }
    const processInline = (str: string): React.ReactNode[] => {
      // Hỗ trợ: **đậm**, *nghiêng*, `code`, [chữ](url) và URL trần (https://...)
      const nodes: React.ReactNode[] = [];
      const regex = /(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))|(`[^`]+`)|(\*[^*\n]+\*)|(https?:\/\/[^\s)]+)/g;
      let last = 0;
      let key = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(str)) !== null) {
        if (m.index > last) nodes.push(<span key={key++}>{str.slice(last, m.index)}</span>);
        const tok = m[0];
        if (tok.startsWith('**')) {
          nodes.push(<strong key={key++} className="font-semibold text-slate-800">{tok.slice(2, -2)}</strong>);
        } else if (tok.startsWith('`')) {
          nodes.push(<code key={key++} className="px-1 py-0.5 rounded bg-slate-100 text-[12px] text-rose-600 font-mono">{tok.slice(1, -1)}</code>);
        } else if (tok.startsWith('[')) {
          const lm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/);
          nodes.push(lm
            ? <a key={key++} href={lm[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2 hover:text-blue-700 break-all">{lm[1]}</a>
            : <span key={key++}>{tok}</span>);
        } else if (tok.startsWith('http')) {
          nodes.push(<a key={key++} href={tok} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2 hover:text-blue-700 break-all">{tok}</a>);
        } else {
          nodes.push(<em key={key++} className="italic text-slate-600">{tok.slice(1, -1)}</em>);
        }
        last = regex.lastIndex;
      }
      if (last < str.length) nodes.push(<span key={key++}>{str.slice(last)}</span>);
      return nodes;
    };
    if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('🔹 ')) {
      const isBullet = line.startsWith('🔹 ') ? '🔹' : '•';
      const offset = line.startsWith('🔹 ') ? 2 : 2;
      elements.push(<div key={i} className="flex gap-1.5 my-0.5"><span className="text-blue-400 mt-0.5 shrink-0">{isBullet}</span><span>{processInline(line.slice(offset))}</span></div>);
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.+)/);
      if (match) elements.push(<div key={i} className="flex gap-1.5 my-0.5"><span className="text-blue-500 font-semibold shrink-0 min-w-[18px]">{match[1]}.</span><span>{processInline(match[2])}</span></div>);
    } else {
      elements.push(<p key={i} className="my-0.5">{processInline(line)}</p>);
    }
  });
  return elements;
}

// ─── Component ────────────────────────────────────────────────────────────────
const TypingDots = () => (
  <div className="flex gap-1 items-center py-1">
    {[0, 1, 2].map((i) => (<div key={i} className="w-2 h-2 rounded-full bg-blue-400" style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }} />))}
  </div>
);

// ─── Hiệu ứng gõ chữ dần (typewriter) như ChatGPT ────────────────────────────
// Hiển thị `text` tăng dần khi `enabled`. Tự điều chỉnh tốc độ để câu dài
// không phải chờ lâu (~tối đa ~120 bước). Trả về { shown, done, skip }.
function useTypewriter(text: string, enabled: boolean) {
  const [count, setCount] = useState(enabled ? 0 : text.length);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) { setCount(text.length); return; }
    setCount(0);
    const step = Math.max(1, Math.ceil(text.length / 120));
    let i = 0;
    const id = window.setInterval(() => {
      i = Math.min(text.length, i + step);
      setCount(i);
      if (i >= text.length) { window.clearInterval(id); intervalRef.current = null; }
    }, 16);
    intervalRef.current = id;
    return () => window.clearInterval(id);
  }, [text, enabled]);

  const skip = () => {
    if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
    setCount(text.length);
  };

  return { shown: text.slice(0, count), done: count >= text.length, skip };
}

const MessageBubble = ({ msg }: { msg: Message }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const { shown, done, skip } = useTypewriter(msg.content, !!msg.animate);
  const endRef = useRef<HTMLDivElement>(null);
  // Cuộn theo khi chữ đang chạy để luôn thấy dòng mới nhất
  useEffect(() => { if (msg.animate && !done) endRef.current?.scrollIntoView({ block: 'end' }); }, [shown, msg.animate, done]);

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end gap-2 group">
        <div className="max-w-[78%]">
          <div className="bg-gradient-to-br from-[#004DAA] to-[#0066CC] text-white px-4 py-2.5 rounded-2xl rounded-br-sm shadow-sm text-sm leading-relaxed">{msg.content}</div>
          <div className="text-[10px] text-slate-400 mt-1 text-right">{msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#004DAA] to-[#0066CC] flex items-center justify-center shrink-0 mt-0.5 shadow-sm"><span className="text-white text-xs font-bold">B</span></div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 group">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#004ac6] to-[#2563eb] flex items-center justify-center shrink-0 mt-0.5 shadow-sm ring-2 ring-white">
        <Sparkles size={14} className="text-white" />
      </div>
      <div className="max-w-[82%]">
        {msg.isLoading ? (
          <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm"><TypingDots /></div>
        ) : (
          <>
            <div
              onClick={msg.animate && !done ? skip : undefined}
              title={msg.animate && !done ? 'Bấm để hiện toàn bộ' : undefined}
              className={`bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm text-sm text-slate-700 leading-relaxed ${msg.animate && !done ? 'cursor-pointer' : ''}`}
            >
              {renderMarkdown(shown)}
              {msg.animate && !done && <span className="inline-block w-[2px] h-3.5 ml-0.5 align-middle bg-blue-400 animate-pulse rounded-full" />}
            </div>
            <div ref={endRef} />
            <div className={`flex items-center gap-2 mt-1.5 transition-opacity ${msg.animate && !done ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-[10px] text-slate-400">{msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
              {msg.source && SOURCE_LABELS[msg.source] && (
                <span className="text-[10px] text-slate-400/90 bg-slate-100 px-1.5 py-0.5 rounded-full">{SOURCE_LABELS[msg.source]}</span>
              )}
              <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-slate-400 hover:text-slate-600 p-0.5 rounded" title="Sao chép">{copied ? <CheckCheck size={12} className="text-emerald-500" /> : <Copy size={12} />}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const UITFaqWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const navigate = useNavigate();
  const { role } = useAuth();
  
  const { messages, input, isLoading, isOnline, unreadCount, setInput, sendMessage, stop, handleReset, clearUnread } = useAIChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      clearUnread();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized, messages, scrollToBottom, clearUnread]);

  const handleMaximize = () => {
    setIsOpen(false);
    const basePath = role === 'ADMIN' ? '/admin' : role === 'STUDENT' ? '/student' : '/advisor';
    navigate(`${basePath}/faq`);
  };

  const showQuickCategories = messages.length <= 1;

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); setIsMinimized(false); clearUnread(); }}
        className={`fixed bottom-4 right-8 z-40 flex h-[72px] w-[72px] flex-col items-center justify-center gap-1 bg-gradient-to-r from-[#004ac6] via-[#2563eb] to-[#0058be] text-white rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all outline-none font-bold text-sm ${isOpen ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'}`}
      >
        <div className="relative">
          <Sparkles className="w-5 h-5" />
          {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span></span>}
        </div>
        AI UIT
      </button>

      <div
        ref={chatRef}
        className={['fixed bottom-4 right-8 z-50', 'w-[390px] flex flex-col', 'bg-white rounded-3xl overflow-hidden', 'shadow-[0_32px_80px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.06)]', 'transition-all duration-300 origin-bottom-right', isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none', isMinimized ? 'h-auto' : 'h-[600px]'].join(' ')}
        style={{ maxHeight: 'calc(100vh - 130px)' }}
      >
        <div className="bg-gradient-to-r from-[#004ac6] via-[#2563eb] to-[#0058be] px-5 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner">
                  <Sparkles size={20} className="text-white fill-white/20" />
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2563eb] ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-[15px] leading-tight">AI UIT</h3>
                  <span className="text-[9px] font-bold text-white/60 bg-white/15 px-1.5 py-0.5 rounded-full tracking-wider uppercase">Beta</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isOnline ? (<><Wifi size={10} className="text-emerald-300" /><span className="text-[11px] text-white/70">Đang hoạt động</span></>) : (<><WifiOff size={10} className="text-red-300" /><span className="text-[11px] text-white/70">Mất kết nối</span></>)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={handleReset} className="p-2 hover:bg-white/15 rounded-xl transition-colors text-white/70 hover:text-white" title="Đặt lại"><RotateCcw size={15} /></button>
              <button onClick={handleMaximize} className="p-2 hover:bg-white/15 rounded-xl transition-colors text-white/70 hover:text-white" title="Mở trang lớn"><Maximize2 size={15} /></button>
              <button onClick={() => setIsMinimized((m) => !m)} className="p-2 hover:bg-white/15 rounded-xl transition-colors text-white/70 hover:text-white" title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}><ChevronDown size={16} className={`transition-transform duration-200 ${isMinimized ? 'rotate-180' : ''}`} /></button>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white/70 hover:text-white"><X size={16} /></button>
            </div>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#f6f8fc] min-h-0 scroll-smooth">
              {messages.map((msg) => (<React.Fragment key={msg.id}><MessageBubble msg={msg} /></React.Fragment>))}
              <div ref={messagesEndRef} />
            </div>

            {showQuickCategories && (
              <div className="px-4 py-3 bg-white/80 backdrop-blur-sm border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Chủ đề phổ biến</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {QUICK_CATEGORIES.map((cat, i) => (
                    <button key={i} onClick={() => sendMessage(cat.question)} disabled={isLoading} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-[11.5px] font-semibold transition-all duration-150 active:scale-95 disabled:opacity-50 ${cat.color}`}>{cat.icon}{cat.label}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 py-3 bg-white border-t border-slate-100 shrink-0">
              <div className={`flex items-center gap-2 bg-[#f6f8fc] border rounded-2xl px-3 py-2 transition-all duration-200 ${input ? 'border-[#004ac6]/40 shadow-[0_0_0_3px_rgba(0,74,198,0.08)]' : 'border-slate-200'}`}>
                <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }} placeholder="Nhập câu hỏi về UIT..." disabled={isLoading} className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none border-none resize-none" />
                {isLoading ? (
                  <button onClick={stop} title="Dừng trả lời" className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 bg-rose-50 text-rose-500 hover:bg-rose-100 active:scale-95">
                    <Square size={13} className="fill-rose-500" />
                  </button>
                ) : (
                  <button onClick={() => sendMessage(input)} disabled={!input.trim()} className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 ${input.trim() ? 'bg-gradient-to-br from-[#004ac6] to-[#2563eb] text-white hover:shadow-md hover:shadow-blue-500/30 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                    <Send size={14} />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }`}</style>
    </>
  );
};

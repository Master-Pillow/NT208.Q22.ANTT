import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  X,
  Send,
  ChevronDown,
  Sparkles,
  BookOpen,
  DollarSign,
  Calendar,
  Phone,
  RotateCcw,
  Copy,
  CheckCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  source?: 'knowledge_base' | 'faq' | 'gemini_ai';
  timestamp: Date;
  isLoading?: boolean;
}

interface QuickCategory {
  icon: React.ReactNode;
  label: string;
  question: string;
  color: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:4000';

const SESSION_ID = `uit_faq_${Math.random().toString(36).slice(2)}`;

const QUICK_CATEGORIES: QuickCategory[] = [
  { icon: <DollarSign size={14} />, label: 'Học phí', question: 'Học phí tại UIT năm 2024 là bao nhiêu?', color: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
  { icon: <BookOpen size={14} />, label: 'Ngành học', question: 'UIT có những ngành đào tạo nào?', color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' },
  { icon: <GraduationCap size={14} />, label: 'Tốt nghiệp', question: 'Điều kiện tốt nghiệp UIT là gì?', color: 'text-violet-600 bg-violet-50 border-violet-200 hover:bg-violet-100' },
  { icon: <Calendar size={14} />, label: 'Lịch học', question: 'Lịch học kỳ và đăng ký môn học UIT như thế nào?', color: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100' },
  { icon: <Phone size={14} />, label: 'Liên hệ', question: 'Liên hệ phòng đào tạo UIT như thế nào?', color: 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100' },
  { icon: <Sparkles size={14} />, label: 'Học bổng', question: 'UIT có những loại học bổng nào?', color: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100' },
];

const SOURCE_LABELS: Record<string, string> = {
  knowledge_base: '📚 Dữ liệu chính thức',
  faq: '💡 Câu hỏi thường gặp',
  gemini_ai: '✨ Trả lời bởi AI',
};

// ─── Markdown Renderer đơn giản ────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (!line.trim()) {
      elements.push(<br key={i} />);
      return;
    }

    // Bold **text**
    const processInline = (str: string): React.ReactNode[] => {
      const parts = str.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, j) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={j} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>
        ) : (
          <span key={j}>{part}</span>
        )
      );
    };

    if (line.startsWith('- ') || line.startsWith('• ')) {
      elements.push(
        <div key={i} className="flex gap-1.5 my-0.5">
          <span className="text-blue-400 mt-0.5 shrink-0">•</span>
          <span>{processInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.+)/);
      if (match) {
        elements.push(
          <div key={i} className="flex gap-1.5 my-0.5">
            <span className="text-blue-500 font-semibold shrink-0 min-w-[18px]">{match[1]}.</span>
            <span>{processInline(match[2])}</span>
          </div>
        );
      }
    } else {
      elements.push(<p key={i} className="my-0.5">{processInline(line)}</p>);
    }
  });

  return elements;
}

// ─── Typing Dots ──────────────────────────────────────────────────────────────
const TypingDots = () => (
  <div className="flex gap-1 items-center py-1">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="w-2 h-2 rounded-full bg-blue-400"
        style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }}
      />
    ))}
  </div>
);

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg }: { msg: Message }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end gap-2 group">
        <div className="max-w-[78%]">
          <div className="bg-gradient-to-br from-[#004DAA] to-[#0066CC] text-white px-4 py-2.5 rounded-2xl rounded-br-sm shadow-sm text-sm leading-relaxed">
            {msg.content}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 text-right">
            {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#004DAA] to-[#0066CC] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <span className="text-white text-xs font-bold">B</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 group">
      {/* Avatar UIT */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#004DAA] to-[#0070F3] flex items-center justify-center shrink-0 mt-0.5 shadow-sm ring-2 ring-white">
        <GraduationCap size={14} className="text-white" />
      </div>

      <div className="max-w-[82%]">
        {msg.isLoading ? (
          <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
            <TypingDots />
          </div>
        ) : (
          <>
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm text-sm text-slate-700 leading-relaxed">
              {renderMarkdown(msg.content)}
            </div>

            {/* Source badge + copy */}
            <div className="flex items-center gap-2 mt-1.5">
              {msg.source && (
                <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                  {SOURCE_LABELS[msg.source] || ''}
                </span>
              )}
              <span className="text-[10px] text-slate-400">
                {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-slate-400 hover:text-slate-600 p-0.5 rounded"
                title="Sao chép"
              >
                {copied ? <CheckCheck size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Main Widget Component ─────────────────────────────────────────────────────
export const UITFaqWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bot',
      content:
        'Xin chào! Tôi là **trợ lý AI của UIT** 🎓\n\nTôi có thể giúp bạn tìm hiểu về:\n- 💰 Học phí theo tín chỉ\n- 📚 Chương trình đào tạo & ngành học\n- 📋 Quy định học vụ\n- 🏆 Học bổng\n- 📞 Thông tin liên hệ\n\nBạn muốn hỏi gì?',
      timestamp: new Date(),
    },
  ]);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, messages, scrollToBottom]);

  // Click outside để đóng
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(e.target as Node)) {
        // Không đóng khi click ngoài — người dùng phải bấm nút X
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    const loadingMsg: Message = {
      id: `loading_${Date.now()}`,
      role: 'bot',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/uit-faq/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text.trim(), sessionId: SESSION_ID }),
      });

      const data = await res.json();
      setIsOnline(true);

      if (!res.ok) throw new Error(data.message || 'Lỗi server');

      const botMsg: Message = {
        id: `b_${Date.now()}`,
        role: 'bot',
        content: data.answer,
        source: data.source,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev.filter((m) => !m.isLoading), botMsg]);
      if (!isOpen) setUnreadCount((n) => n + 1);
    } catch (err: unknown) {
      setIsOnline(false);
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        role: 'bot',
        content:
          'Xin lỗi, có lỗi kết nối. Vui lòng thử lại hoặc liên hệ:\n- 📧 daotao@uit.edu.vn\n- 📱 (028) 37251997',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev.filter((m) => !m.isLoading), errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'bot',
        content:
          'Cuộc trò chuyện đã được đặt lại. Tôi có thể giúp gì cho bạn?\n\n- 💰 Học phí\n- 📚 Ngành học\n- 📋 Quy định học vụ\n- 🏆 Học bổng',
        timestamp: new Date(),
      },
    ]);
  };

  const showQuickCategories = messages.length <= 1;

  return (
    <>
      {/* ── Floating Button ── */}
      <button
        id="uit-faq-open-btn"
        onClick={() => { setIsOpen(true); setUnreadCount(0); }}
        className={[
          'fixed bottom-8 right-8 z-50',
          'flex items-center gap-2.5',
          'bg-gradient-to-r from-[#003F87] via-[#004DAA] to-[#0066CC]',
          'text-white pl-4 pr-5 py-3 rounded-2xl',
          'shadow-[0_8px_32px_rgba(0,77,170,0.45)]',
          'hover:shadow-[0_12px_40px_rgba(0,77,170,0.6)]',
          'hover:-translate-y-0.5 active:scale-95',
          'transition-all duration-200 font-semibold text-sm',
          'border border-white/10',
          isOpen ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100',
        ].join(' ')}
        aria-label="Hỏi đáp về UIT"
      >
        <div className="relative">
          <GraduationCap size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-white/60">
              {unreadCount}
            </span>
          )}
        </div>
        <span>Hỏi về UIT</span>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
      </button>

      {/* ── Chat Window ── */}
      <div
        id="uit-faq-widget"
        ref={chatRef}
        className={[
          'fixed bottom-8 right-8 z-50',
          'w-[390px] flex flex-col',
          'bg-white rounded-3xl overflow-hidden',
          'shadow-[0_32px_80px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.06)]',
          'transition-all duration-300 origin-bottom-right',
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-90 pointer-events-none',
          isMinimized ? 'h-auto' : 'h-[600px]',
        ].join(' ')}
        style={{ maxHeight: 'calc(100vh - 130px)' }}
      >
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-[#003F87] via-[#004DAA] to-[#0070F3] px-5 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo UIT style */}
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner">
                  <GraduationCap size={20} className="text-white" />
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#004DAA] ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-[15px] leading-tight">Trợ lý UIT</h3>
                  <span className="text-[9px] font-bold text-white/60 bg-white/15 px-1.5 py-0.5 rounded-full tracking-wider uppercase">AI</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isOnline ? (
                    <><Wifi size={10} className="text-emerald-300" /><span className="text-[11px] text-white/70">Đang hoạt động</span></>
                  ) : (
                    <><WifiOff size={10} className="text-red-300" /><span className="text-[11px] text-white/70">Mất kết nối</span></>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-2 hover:bg-white/15 rounded-xl transition-colors text-white/70 hover:text-white"
                title="Đặt lại cuộc trò chuyện"
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => setIsMinimized((m) => !m)}
                className="p-2 hover:bg-white/15 rounded-xl transition-colors text-white/70 hover:text-white"
                title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${isMinimized ? 'rotate-180' : ''}`}
                />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white/70 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Info bar */}
          {!isMinimized && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-white/60 bg-white/10 rounded-xl px-3 py-2">
              <span>🏫</span>
              <span>ĐH Công nghệ Thông tin – ĐHQG TP.HCM</span>
            </div>
          )}
        </div>

        {!isMinimized && (
          <>
            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#f6f8fc] min-h-0 scroll-smooth">
              {messages.map((msg) => (
                <React.Fragment key={msg.id}>
                  <MessageBubble msg={msg} />
                </React.Fragment>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Quick Categories ── */}
            {showQuickCategories && (
              <div className="px-4 py-3 bg-white/80 backdrop-blur-sm border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Chủ đề phổ biến
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {QUICK_CATEGORIES.map((cat, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(cat.question)}
                      disabled={isLoading}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-[11.5px] font-semibold transition-all duration-150 active:scale-95 disabled:opacity-50 ${cat.color}`}
                    >
                      {cat.icon}
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Input ── */}
            <div className="px-4 py-3 bg-white border-t border-slate-100 shrink-0">
              <div
                className={`flex items-center gap-2 bg-[#f6f8fc] border rounded-2xl px-3 py-2 transition-all duration-200 ${
                  input
                    ? 'border-[#004DAA]/40 shadow-[0_0_0_3px_rgba(0,77,170,0.08)]'
                    : 'border-slate-200'
                }`}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  placeholder="Nhập câu hỏi về UIT..."
                  disabled={isLoading}
                  className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none border-none resize-none"
                  id="uit-faq-input"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 ${
                    input.trim() && !isLoading
                      ? 'bg-gradient-to-br from-[#004DAA] to-[#0066CC] text-white hover:shadow-md hover:shadow-blue-500/30 active:scale-95'
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                  id="uit-faq-send-btn"
                >
                  {isLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-slate-400">
                  Powered by <span className="text-[#004DAA] font-semibold">UIT Knowledge Base</span> + Gemini AI
                </p>
                <a
                  href="https://www.uit.edu.vn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-[#004DAA]/60 hover:text-[#004DAA] transition-colors"
                >
                  uit.edu.vn ↗
                </a>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
};

export default UITFaqWidget;

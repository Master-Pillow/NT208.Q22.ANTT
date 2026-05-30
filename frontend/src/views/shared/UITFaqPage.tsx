import React, { useRef, useEffect, useCallback, useState } from 'react';
import { GraduationCap, Send, Sparkles, BookOpen, DollarSign, Calendar, Phone, RotateCcw, Copy, CheckCheck, Wifi, WifiOff } from 'lucide-react';
import { PageLayout } from '../../components/layout/PageLayout';
import { useAIChat, Message } from '../../contexts/AIChatContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface QuickCategory { icon: React.ReactNode; label: string; question: string; color: string; }

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
};

// ─── Markdown Renderer ────────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (!line.trim()) { elements.push(<br key={i} />); return; }
    const processInline = (str: string): React.ReactNode[] => {
      const parts = str.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, j) => part.startsWith('**') && part.endsWith('**') ? <strong key={j} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong> : <span key={j}>{part}</span>);
    };
    if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('🔹 ')) {
      const isBullet = line.startsWith('🔹 ') ? '🔹' : '•';
      const offset = line.startsWith('🔹 ') ? 2 : 2;
      elements.push(<div key={i} className="flex gap-2 my-1.5 leading-relaxed"><span className="text-blue-500 mt-0.5 shrink-0">{isBullet}</span><span>{processInline(line.slice(offset))}</span></div>);
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.+)/);
      if (match) elements.push(<div key={i} className="flex gap-2 my-1.5 leading-relaxed"><span className="text-blue-600 font-semibold shrink-0 min-w-[20px]">{match[1]}.</span><span>{processInline(match[2])}</span></div>);
    } else {
      elements.push(<p key={i} className="my-1.5 leading-relaxed">{processInline(line)}</p>);
    }
  });
  return elements;
}

// ─── Component ────────────────────────────────────────────────────────────────
const TypingDots = () => (
  <div className="flex gap-1 items-center py-2 px-1">
    {[0, 1, 2].map((i) => (<div key={i} className="w-2.5 h-2.5 rounded-full bg-blue-400" style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }} />))}
  </div>
);

const MessageBubble = ({ msg }: { msg: Message }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end gap-3 group mb-4">
        <div className="max-w-[75%] md:max-w-[60%]">
          <div className="bg-gradient-to-br from-[#004DAA] to-[#0066CC] text-white px-5 py-3 rounded-2xl rounded-br-sm shadow-sm text-[15px] leading-relaxed">{msg.content}</div>
          <div className="text-xs text-slate-400 mt-1.5 text-right font-medium">{msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#004DAA] to-[#0066CC] flex items-center justify-center shrink-0 mt-0.5 shadow-sm"><span className="text-white text-sm font-bold">B</span></div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 group mb-4">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#004ac6] to-[#2563eb] flex items-center justify-center shrink-0 mt-0.5 shadow-sm ring-2 ring-white">
        <Sparkles size={18} className="text-white" />
      </div>
      <div className="max-w-[85%] md:max-w-[75%]">
        {msg.isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm"><TypingDots /></div>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm text-[15px] text-slate-700">{renderMarkdown(msg.content)}</div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs font-medium text-slate-400">{msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
              <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100" title="Sao chép">{copied ? <CheckCheck size={14} className="text-emerald-500" /> : <Copy size={14} />}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default function UITFaqPage() {
  const { messages, input, isLoading, isOnline, setInput, sendMessage, handleReset, clearUnread } = useAIChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    scrollToBottom();
    clearUnread(); // Khi đang ở trang lớn thì reset unread
  }, [scrollToBottom, clearUnread]);

  const showQuickCategories = messages.length <= 1;

  return (
    <PageLayout title="AI Chatbox UIT" breadcrumb={['AI Chatbox UIT', 'Hỏi đáp']}>
      <div className="flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#004ac6] via-[#2563eb] to-[#0058be] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                <Sparkles size={24} className="text-white fill-white/20" />
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#2563eb] ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-lg leading-tight">AI Chatbox UIT</h3>
                <span className="text-[10px] font-bold text-[#2563eb] bg-white px-2 py-0.5 rounded-full tracking-wider uppercase shadow-sm">Beta</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {isOnline ? (<><Wifi size={12} className="text-emerald-300" /><span className="text-xs text-white/80 font-medium">Đang hoạt động trực tuyến</span></>) : (<><WifiOff size={12} className="text-red-300" /><span className="text-xs text-white/80 font-medium">Mất kết nối server</span></>)}
              </div>
            </div>
          </div>
          <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white text-sm font-medium"><RotateCcw size={16} /> Đặt lại</button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 md:px-10 py-6 bg-[#f8fafc] scroll-smooth">
          <div className="max-w-4xl mx-auto">
            {messages.map((msg) => (<React.Fragment key={msg.id}><MessageBubble msg={msg} /></React.Fragment>))}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Quick Categories */}
        {showQuickCategories && (
          <div className="px-6 md:px-10 py-4 bg-white border-t border-slate-100">
            <div className="max-w-4xl mx-auto">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Chủ đề phổ biến</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {QUICK_CATEGORIES.map((cat, i) => (
                  <button key={i} onClick={() => sendMessage(cat.question)} disabled={isLoading} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0 ${cat.color}`}><div className="p-2 bg-white/50 rounded-full">{cat.icon}</div><span className="text-xs font-bold">{cat.label}</span></button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-6 md:px-10 py-5 bg-white border-t border-slate-200 shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className={`flex items-end gap-3 bg-[#f8fafc] border-2 rounded-3xl p-2 transition-all duration-200 ${input ? 'border-[#004ac6]/40 bg-blue-50/30 shadow-[0_0_0_3px_rgba(0,74,198,0.08)]' : 'border-slate-100'}`}>
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }} placeholder="Nhập câu hỏi của bạn về trường ĐH Công nghệ Thông tin..." disabled={isLoading} rows={Math.min(3, Math.max(1, input.split('\n').length))} className="flex-1 bg-transparent text-[15px] text-slate-700 placeholder:text-slate-400 outline-none border-none resize-none px-4 py-2.5 max-h-32 min-h-[44px]" />
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || isLoading} className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 mb-0.5 ${input.trim() && !isLoading ? 'bg-gradient-to-br from-[#004ac6] to-[#2563eb] text-white shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>{isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} className="ml-1" />}</button>
            </div>
            <div className="flex items-center justify-between mt-3 px-2">
              <p className="text-xs font-medium text-slate-400">Hệ thống trả lời tự động dựa trên <span className="text-[#004ac6] font-bold">Dữ liệu nội bộ UIT</span> và <span className="text-[#004ac6] font-bold">Gemini AI</span></p>
              <a href="https://daa.uit.edu.vn" target="_blank" rel="noreferrer" className="text-xs font-medium text-slate-400 hover:text-[#004ac6] transition-colors">daa.uit.edu.vn ↗</a>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }`}</style>
    </PageLayout>
  );
}

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  source?: 'knowledge_base' | 'faq' | 'gemini_ai' | 'scraped_direct_summary' | 'scraped_direct' | 'rag_vector' | 'rag_cache' | 'rule_based';
  timestamp: Date;
  isLoading?: boolean;
  animate?: boolean; // true = tin mới vừa nhận → chạy hiệu ứng gõ chữ
}

interface AIChatContextType {
  messages: Message[];
  input: string;
  isLoading: boolean;
  isOnline: boolean;
  unreadCount: number;
  setInput: (value: string) => void;
  sendMessage: (text: string) => Promise<void>;
  stop: () => void;
  handleReset: () => void;
  clearUnread: () => void;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

// Đọc URL backend từ biến môi trường Vite (fallback về local khi dev)
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:4000';

// ─── Khóa lưu trữ localStorage (TÁCH RIÊNG THEO TỪNG TÀI KHOẢN) ──────────────
// Mỗi tài khoản có không gian chat riêng → không dùng chung. Khách chưa đăng
// nhập dùng khóa "guest".
const LS_SESSION = 'uit_chat_session_id';
const LS_MESSAGES = 'uit_chat_messages';
const MAX_PERSIST = 50; // chỉ lưu tối đa 50 tin gần nhất để tránh phình localStorage

// Định danh ổn định cho mỗi tài khoản (ưu tiên id, rồi email, cuối cùng là guest)
function accountKeyFromUser(user: { id?: number; email?: string } | null): string {
  if (user?.id != null) return `id_${user.id}`;
  if (user?.email) return `em_${user.email.toLowerCase()}`;
  return 'guest';
}

const sessionKeyFor = (acc: string) => `${LS_SESSION}__${acc}`;
const messagesKeyFor = (acc: string) => `${LS_MESSAGES}__${acc}`;

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'bot',
  content:
    'Xin chào! Tôi là **AI Chatbox UIT** 🎓\n\nTôi có thể giúp bạn tìm hiểu về:\n- 💰 Học phí theo tín chỉ\n- 📚 Chương trình đào tạo & ngành học\n- 📋 Quy định học vụ\n- 🏆 Học bổng\n- 📞 Thông tin liên hệ\n\nBạn muốn hỏi gì?',
  timestamp: new Date(),
};

function newSessionId(): string {
  return `uit_faq_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

// ─── Khôi phục / khởi tạo sessionId của 1 tài khoản, bền vững qua reload ──────
function getOrCreateSessionId(sessionKey: string): string {
  try {
    const existing = localStorage.getItem(sessionKey);
    if (existing) return existing;
    const fresh = newSessionId();
    localStorage.setItem(sessionKey, fresh);
    return fresh;
  } catch {
    return newSessionId();
  }
}

// ─── Khôi phục lịch sử tin nhắn của 1 tài khoản từ localStorage ──────────────
function loadMessages(messagesKey: string): Message[] {
  try {
    const raw = localStorage.getItem(messagesKey);
    if (!raw) return [WELCOME_MESSAGE];
    const parsed = JSON.parse(raw) as (Omit<Message, 'timestamp'> & { timestamp: string })[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [WELCOME_MESSAGE];
    // Hồi sinh Date, loại bỏ tin đang loading dở, và TẮT animate cho tin cũ
    // (tin khôi phục từ localStorage không nên chạy lại hiệu ứng gõ chữ).
    return parsed
      .filter((m) => !m.isLoading)
      .map((m) => ({ ...m, timestamp: new Date(m.timestamp), animate: false }));
  } catch {
    return [WELCOME_MESSAGE];
  }
}

export const AIChatProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const accountKey = accountKeyFromUser(currentUser);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState<Message[]>(() => loadMessages(messagesKeyFor(accountKey)));

  const sessionIdRef = useRef<string>(getOrCreateSessionId(sessionKeyFor(accountKey)));
  const abortRef = useRef<AbortController | null>(null);
  // Tài khoản mà `messages` hiện đang thuộc về — dùng để khóa việc lưu đúng chỗ.
  const ownerRef = useRef<string>(accountKey);

  // Khi ĐỔI TÀI KHOẢN (đăng nhập / đăng xuất / chuyển user): nạp đúng lịch sử &
  // session của tài khoản mới, không dùng chung với tài khoản cũ.
  useEffect(() => {
    if (ownerRef.current === accountKey) return; // lần mount đầu hoặc không đổi
    abortRef.current?.abort();
    abortRef.current = null;
    ownerRef.current = accountKey;
    sessionIdRef.current = getOrCreateSessionId(sessionKeyFor(accountKey));
    setMessages(loadMessages(messagesKeyFor(accountKey)));
    setIsLoading(false);
    setUnreadCount(0);
  }, [accountKey]);

  // Lưu lịch sử mỗi khi tin nhắn thay đổi (bỏ qua tin loading), theo đúng tài khoản.
  useEffect(() => {
    try {
      const toPersist = messages.filter((m) => !m.isLoading).slice(-MAX_PERSIST);
      localStorage.setItem(messagesKeyFor(ownerRef.current), JSON.stringify(toPersist));
    } catch {
      /* localStorage đầy hoặc bị chặn — bỏ qua */
    }
  }, [messages]);

  const clearUnread = () => setUnreadCount(0);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    setMessages((prev) => prev.filter((m) => !m.isLoading));
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: text.trim(), timestamp: new Date() };
    const loadingMsg: Message = { id: `loading_${Date.now()}`, role: 'bot', content: '', timestamp: new Date(), isLoading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput('');
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/uit-faq/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text.trim(), sessionId: sessionIdRef.current }),
        signal: controller.signal,
      });

      const data = await res.json();
      setIsOnline(true);
      if (!res.ok) throw new Error(data.message || 'Lỗi server');

      const botMsg: Message = { id: `b_${Date.now()}`, role: 'bot', content: data.answer, source: data.source, timestamp: new Date(), animate: true };
      setMessages((prev) => [...prev.filter((m) => !m.isLoading), botMsg]);
      setUnreadCount((prev) => prev + 1);
    } catch (err: unknown) {
      // Người dùng chủ động bấm dừng → không hiện lỗi
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setIsOnline(false);
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        role: 'bot',
        content: 'Xin lỗi, có lỗi kết nối. Vui lòng thử lại hoặc liên hệ:\n- 📧 daotao@uit.edu.vn\n- 📱 (028) 37251997',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev.filter((m) => !m.isLoading), errorMsg]);
    } finally {
      abortRef.current = null;
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    const fresh: Message = { id: `welcome_${Date.now()}`, role: 'bot', content: 'Cuộc trò chuyện đã được đặt lại. Tôi có thể giúp gì cho bạn?\n\n- 💰 Học phí\n- 📚 Ngành học\n- 📋 Quy định học vụ\n- 🏆 Học bổng', timestamp: new Date() };
    setMessages([fresh]);
    setUnreadCount(0);
    // Tạo session mới để server cũng xóa ngữ cảnh hội thoại cũ (chỉ cho tài khoản này)
    try {
      const newId = newSessionId();
      sessionIdRef.current = newId;
      localStorage.setItem(sessionKeyFor(ownerRef.current), newId);
    } catch { /* bỏ qua */ }
  };

  return (
    <AIChatContext.Provider value={{ messages, input, isLoading, isOnline, unreadCount, setInput, sendMessage, stop, handleReset, clearUnread }}>
      {children}
    </AIChatContext.Provider>
  );
};

export const useAIChat = () => {
  const context = useContext(AIChatContext);
  if (context === undefined) {
    throw new Error('useAIChat must be used within an AIChatProvider');
  }
  return context;
};

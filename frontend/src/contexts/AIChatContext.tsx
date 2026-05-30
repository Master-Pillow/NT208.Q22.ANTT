import React, { createContext, useContext, useState, ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  source?: 'knowledge_base' | 'faq' | 'gemini_ai' | 'scraped_direct_summary' | 'scraped_direct';
  timestamp: Date;
  isLoading?: boolean;
}

interface AIChatContextType {
  messages: Message[];
  input: string;
  isLoading: boolean;
  isOnline: boolean;
  unreadCount: number;
  setInput: (value: string) => void;
  sendMessage: (text: string) => Promise<void>;
  handleReset: () => void;
  clearUnread: () => void;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

const API_BASE = 'http://localhost:4000';
const SESSION_ID = `uit_faq_${Math.random().toString(36).slice(2)}`;

export const AIChatProvider = ({ children }: { children: ReactNode }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bot',
      content:
        'Xin chào! Tôi là **AI Chatbox UIT** 🎓\n\nTôi có thể giúp bạn tìm hiểu về:\n- 💰 Học phí theo tín chỉ\n- 📚 Chương trình đào tạo & ngành học\n- 📋 Quy định học vụ\n- 🏆 Học bổng\n- 📞 Thông tin liên hệ\n\nBạn muốn hỏi gì?',
      timestamp: new Date(),
    },
  ]);

  const clearUnread = () => setUnreadCount(0);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: text.trim(), timestamp: new Date() };
    const loadingMsg: Message = { id: `loading_${Date.now()}`, role: 'bot', content: '', timestamp: new Date(), isLoading: true };

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

      const botMsg: Message = { id: `b_${Date.now()}`, role: 'bot', content: data.answer, source: data.source, timestamp: new Date() };
      setMessages((prev) => [...prev.filter((m) => !m.isLoading), botMsg]);
      setUnreadCount((prev) => prev + 1);
    } catch (err: unknown) {
      setIsOnline(false);
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        role: 'bot',
        content: 'Xin lỗi, có lỗi kết nối. Vui lòng thử lại hoặc liên hệ:\n- 📧 daotao@uit.edu.vn\n- 📱 (028) 37251997',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev.filter((m) => !m.isLoading), errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([{ id: `welcome_${Date.now()}`, role: 'bot', content: 'Cuộc trò chuyện đã được đặt lại. Tôi có thể giúp gì cho bạn?\n\n- 💰 Học phí\n- 📚 Ngành học\n- 📋 Quy định học vụ\n- 🏆 Học bổng', timestamp: new Date() }]);
    setUnreadCount(0);
  };

  return (
    <AIChatContext.Provider value={{ messages, input, isLoading, isOnline, unreadCount, setInput, sendMessage, handleReset, clearUnread }}>
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

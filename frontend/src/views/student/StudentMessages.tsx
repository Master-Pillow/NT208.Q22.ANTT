import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, CheckCheck, Send } from 'lucide-react';
import apiClient from '../../lib/api';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: number;
  conversation_id: number;
  sender_role: 'ADVISOR' | 'STUDENT';
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  id: number;
  advisor_name: string;
  advisor_email: string;
  unread_count?: number;
  is_unread?: boolean;
}

interface MessagesReadEvent {
  conversationId: number;
  readerRole: 'ADVISOR' | 'STUDENT';
  messageIds: number[];
}

let socket: Socket | null = null;

const getSocket = (): Socket => {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', { transports: ['websocket'] });
  }

  return socket;
};

export const StudentMessages = () => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function loadMessages() {
    const { data } = await apiClient.get('/student/messages');

    setConversation(data.conversation || null);
    setMessages(data.messages || []);
  }

  async function markConversationAsRead(conversationId: number) {
    try {
      const { data } = await apiClient.patch(`/conversations/${conversationId}/read`);
      const readMessageIds: number[] = data?.read_message_ids || [];

      setConversation((prev) => prev ? { ...prev, unread_count: 0, is_unread: false } : prev);

      if (readMessageIds.length > 0) {
        setMessages((prev) => prev.map((msg) =>
          readMessageIds.includes(msg.id) ? { ...msg, is_read: true } : msg
        ));
      }
    } catch (err) {
      console.error('[StudentMessages/read]', err);
    }
  }

  useEffect(() => {
    loadMessages()
      .catch((err) => {
        console.error('[StudentMessages]', err);
        setErrorMsg(err.response?.data?.message || 'Không thể tải tin nhắn.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!conversation?.id) return;

    const sock = getSocket();
    sock.emit('join_conversation', conversation.id);
    markConversationAsRead(conversation.id);

    const handleNewMessage = (msg: Message) => {
      if (msg.conversation_id !== conversation.id) return;

      setMessages((prev) => {
        if (prev.some((item) => item.id === msg.id)) return prev;
        return [...prev, msg];
      });

      if (msg.sender_role === 'ADVISOR') {
        markConversationAsRead(conversation.id);
      }
    };

    const handleMessagesRead = (event: MessagesReadEvent) => {
      if (event.conversationId !== conversation.id) return;

      setMessages((prev) => prev.map((msg) =>
        event.messageIds.includes(msg.id) ? { ...msg, is_read: true } : msg
      ));
    };

    sock.on('new_message', handleNewMessage);
    sock.on('messages_read', handleMessagesRead);

    return () => {
      sock.off('new_message', handleNewMessage);
      sock.off('messages_read', handleMessagesRead);
    };
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const trimmedContent = content.trim();

    if (!trimmedContent || sending) return;

    try {
      setSending(true);
      setErrorMsg('');

      await apiClient.post('/student/messages', {
        content: trimmedContent,
      });

      setContent('');
      await loadMessages();
    } catch (err: any) {
      console.error('[StudentMessages/send]', err);
      setErrorMsg(err.response?.data?.message || 'Không thể gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-slate-500">Đang tải tin nhắn...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-5xl mx-auto xl:mx-0">
      <div>
        <h2 className="text-4xl font-sans font-black text-on-surface tracking-normal mb-2">
          Tin nhắn cố vấn
        </h2>
        <p className="text-on-surface-variant font-medium">
          Trao đổi trực tiếp với cố vấn học tập của bạn.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-slate-50">
          <p className="text-xs uppercase font-bold text-slate-400">Cố vấn học tập</p>

          <h3 className="text-xl font-bold text-blue-900 mt-1">
            {conversation?.advisor_name || 'Chưa có hội thoại'}
          </h3>

          {conversation?.advisor_email ? (
            <p className="text-sm text-slate-500">{conversation.advisor_email}</p>
          ) : (
            <p className="text-sm text-slate-400 mt-1">
              Gửi tin nhắn đầu tiên để tạo hội thoại với cố vấn phụ trách.
            </p>
          )}
        </div>

        <div className="h-[420px] overflow-y-auto p-6 space-y-4 bg-slate-50/40">
          {messages.length === 0 ? (
            <p className="text-center text-slate-400 mt-20">
              Chưa có tin nhắn. Hãy gửi lời nhắn đầu tiên cho cố vấn.
            </p>
          ) : (
            messages.map((msg) => {
              const isStudent = msg.sender_role === 'STUDENT';

              return (
                <div
                  key={msg.id}
                  className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                      isStudent
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-100 text-slate-700'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <div
                      className={`text-[10px] mt-1 flex items-center gap-1 ${
                        isStudent ? 'text-blue-100 justify-end' : 'text-slate-400'
                      }`}
                    >
                      <span>{new Date(msg.created_at).toLocaleString('vi-VN')}</span>
                      {isStudent && (
                        msg.is_read
                          ? <CheckCheck className="w-3 h-3 text-blue-100" />
                          : <Check className="w-3 h-3 text-blue-100" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t flex gap-3">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            disabled={sending}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
            placeholder="Nhập tin nhắn cho cố vấn..."
          />

          <button
            onClick={handleSend}
            disabled={sending || !content.trim()}
            className="px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Đang gửi...' : 'Gửi'}
          </button>
        </div>
      </section>
    </div>
  );
};

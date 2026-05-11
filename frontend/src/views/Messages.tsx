import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Send, Paperclip, Check, CheckCheck,
  MoreVertical, Phone, Video, MessageSquare, Loader2,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { cn } from '../lib/utils';
import apiClient from '../lib/api';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface Contact {
  id:   number;
  name: string;
  mssv: string;
}

interface MessagesProps {
  initialContact?: Contact | null;
}

interface Chat {
  id:          number;   // conversation_id từ DB
  student_id:  number;
  name:        string;
  idNumber:    string;   // mssv
  lastMessage: string;
  time:        string;
}

interface Message {
  id:              number;
  conversation_id: number;
  sender_role:     'ADVISOR' | 'STUDENT';
  sender_id:       number;
  content:         string;
  created_at:      string;
  is_read:         boolean;
}

// ─────────────────────────────────────────────────────────────────
// Socket singleton — chỉ tạo 1 lần
// ─────────────────────────────────────────────────────────────────
let socket: Socket | null = null;

const getSocket = (): Socket => {
  if (!socket) {
    socket = io('http://localhost:4000', { transports: ['websocket'] });
  }
  return socket;
};

// Helper lấy currentUser an toàn
const getCurrentUser = () => {
  try {
    const str = localStorage.getItem('user');
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────
export const Messages: React.FC<MessagesProps> = ({ initialContact }) => {
  const currentUser = getCurrentUser();

  const [chats,          setChats]          = useState<Chat[]>([]);
  const [loadingChats,   setLoadingChats]   = useState(true);

  const [activeChatId,   setActiveChatId]   = useState<number | null>(null);
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [loadingMsgs,    setLoadingMsgs]    = useState(false);

  const [inputValue,     setInputValue]     = useState('');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [sending,        setSending]        = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── 1. Fetch danh sách conversations ─────────────────────────
  useEffect(() => {
    async function fetchConversations() {
      try {
        setLoadingChats(true);
        const { data } = await apiClient.get('/conversations');
        setChats(data ?? []);

        // Tự động chọn conversation đầu tiên nếu chưa có gì active
        if (data?.length > 0 && !activeChatId) {
          setActiveChatId(data[0].id);
        }
      } catch (err) {
        console.error('[Messages] Lỗi lấy conversations:', err);
      } finally {
        setLoadingChats(false);
      }
    }
    fetchConversations();
  }, []);

  // ── 2. Xử lý initialContact (navigate từ ClassList/Dashboard) ─
  useEffect(() => {
    if (!initialContact) return;

    async function openOrCreateConversation() {
      try {
        // Tạo hoặc lấy conversation với student này
        const { data } = await apiClient.post('/conversations', {
          student_id: initialContact!.id,
        });

        const convId: number = data.id;

        // Kiểm tra xem đã có trong list chưa
        const exists = chats.find(c => c.id === convId);
        if (!exists) {
          // Thêm vào đầu danh sách
          const newChat: Chat = {
            id:          convId,
            student_id:  initialContact!.id,
            name:        initialContact!.name,
            idNumber:    initialContact!.mssv,
            lastMessage: 'Cuộc trò chuyện mới',
            time:        '',
          };
          setChats(prev => [newChat, ...prev]);
        }

        setActiveChatId(convId);
      } catch (err) {
        console.error('[Messages] Lỗi tạo conversation:', err);
      }
    }

    openOrCreateConversation();
  }, [initialContact]);

  // ── 3. Fetch tin nhắn khi đổi conversation ───────────────────
  useEffect(() => {
    if (!activeChatId) return;

    async function fetchMessages() {
      try {
        setLoadingMsgs(true);
        const { data } = await apiClient.get(`/conversations/${activeChatId}/messages`);
        setMessages(data ?? []);
      } catch (err) {
        console.error('[Messages] Lỗi lấy messages:', err);
      } finally {
        setLoadingMsgs(false);
      }
    }

    fetchMessages();

    // Join socket room
    const sock = getSocket();
    sock.emit('join_conversation', activeChatId);

    // Lắng nghe tin nhắn mới
    const handleNewMessage = (msg: Message) => {
      if (msg.conversation_id === activeChatId) {
        setMessages(prev => [...prev, msg]);
        // Cập nhật lastMessage trong chat list
        setChats(prev => prev.map(c =>
          c.id === activeChatId
            ? { ...c, lastMessage: msg.content, time: new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }
            : c
        ));
      }
    };

    sock.on('new_message', handleNewMessage);

    return () => {
      sock.off('new_message', handleNewMessage);
    };
  }, [activeChatId]);

  // ── 4. Auto scroll xuống cuối ────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── 5. Gửi tin nhắn qua Socket ───────────────────────────────
  const handleSend = () => {
    if (!inputValue.trim() || !activeChatId || !currentUser) return;

    setSending(true);
    const sock = getSocket();

    sock.emit('send_message', {
      conversationId: activeChatId,
      senderId:       currentUser.id,
      senderRole:     'ADVISOR',
      content:        inputValue.trim(),
    });

    setInputValue('');
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Derived state ─────────────────────────────────────────────
  const activeChat    = chats.find(c => c.id === activeChatId) ?? null;
  const filteredChats = chats.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.idNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      return new Date(isoStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 overflow-hidden animate-in fade-in duration-500">

      {/* ── LEFT: Conversation List ───────────────────────────── */}
      <div className="w-80 shrink-0 border-r border-slate-100 flex flex-col bg-slate-50/50">

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-headline font-bold text-lg text-slate-900 mb-3">Tin nhắn</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm sinh viên..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Đang tải...</span>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <MessageSquare className="w-10 h-10 opacity-20" />
              <p className="text-sm font-medium">Chưa có cuộc trò chuyện nào</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <div
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={cn(
                  'flex items-center gap-3 px-4 py-4 cursor-pointer transition-colors border-b border-slate-100/80',
                  activeChatId === chat.id
                    ? 'bg-primary/5 border-l-2 border-l-primary'
                    : 'hover:bg-white'
                )}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={`https://i.pravatar.cc/100?img=${(chat.student_id % 70) + 1}`}
                    alt={chat.name}
                    className="w-11 h-11 rounded-full object-cover shadow-sm border border-slate-200"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className={cn(
                      'font-bold truncate text-sm',
                      activeChatId === chat.id ? 'text-primary' : 'text-slate-900'
                    )}>
                      {chat.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">
                      {chat.time}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{chat.lastMessage || 'Bắt đầu trò chuyện...'}</p>
                  <span className="text-[10px] font-mono tracking-wider text-slate-400">{chat.idNumber}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Chat Window ────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {activeChat ? (
          <>
            {/* Header */}
            <div className="h-20 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={`https://i.pravatar.cc/100?img=${(activeChat.student_id % 70) + 1}`}
                    alt={activeChat.name}
                    className="w-10 h-10 rounded-full object-cover shadow-sm"
                  />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{activeChat.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                      {activeChat.idNumber}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full transition-colors">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Khu vực tin nhắn */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
              {loadingMsgs ? (
                <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Đang tải tin nhắn...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p className="text-sm font-medium">Bắt đầu cuộc trò chuyện với {activeChat.name}</p>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
                      Hôm nay
                    </span>
                  </div>

                  {messages.map(msg => {
                    const isMe = msg.sender_role === 'ADVISOR';
                    return (
                      <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                        <div className={cn('flex flex-col gap-1 max-w-[75%]', isMe ? 'items-end' : 'items-start')}>
                          <div className={cn(
                            'px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm',
                            isMe
                              ? 'bg-primary text-white font-medium rounded-tr-sm'
                              : 'bg-white border text-slate-700 border-slate-200 rounded-tl-sm'
                          )}>
                            {msg.content}
                          </div>
                          <div className="flex items-center gap-1.5 px-2">
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {formatTime(msg.created_at)}
                            </span>
                            {isMe && (
                              msg.is_read
                                ? <CheckCheck className="w-3 h-3 text-primary" />
                                : <Check className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-100 bg-white shrink-0">
              <div className="flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all shadow-sm">
                <button className="p-2 text-slate-400 hover:text-primary transition-colors shrink-0">
                  <Paperclip className="w-5 h-5" />
                </button>
                <textarea
                  placeholder="Nhập tin nhắn... (Enter để gửi)"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 text-sm text-slate-700 py-2 outline-none"
                  rows={1}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || sending}
                  className="p-2.5 bg-primary hover:bg-primary/90 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl shadow-md transition-colors shrink-0 group"
                >
                  <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
            <MessageSquare className="w-16 h-16 opacity-20" />
            <p className="font-medium">Chọn một cuộc trò chuyện để bắt đầu</p>
          </div>
        )}
      </div>
    </div>
  );
};
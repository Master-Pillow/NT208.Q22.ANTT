import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  Search, Send, Paperclip, Check, CheckCheck,
  MoreVertical, Phone, Video, MessageSquare, Loader2,
  Bell, BellOff, ChevronDown,
} from 'lucide-react';
import { cn } from '../lib/utils';
import apiClient from '../lib/api';
import { getSocket } from '../lib/socket';

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
  id:          number;   // conversation_id từ DB, hoặc số âm cho sinh viên chưa có hội thoại
  student_id:  number;
  name:        string;
  idNumber:    string;   // mssv
  lastMessage: string;
  time:        string;
  unreadCount?: number;
  isUnread?: boolean;
  student_user_id?: number;   // user id của sinh viên (để mute email)
  muted?: boolean;            // cố vấn đã tắt email từ sinh viên này
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

interface MessagesReadEvent {
  conversationId: number;
  readerRole: 'ADVISOR' | 'STUDENT';
  messageIds: number[];
}

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
  const [emailEnabled,   setEmailEnabled]   = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const unreadDividerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef<'unread' | 'bottom' | null>(null);
  const prevLenRef = useRef(0);

  // Kiểu Messenger: chỉ báo tin chưa đọc + nút cuộn xuống tin mới nhất.
  const [atBottom, setAtBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const [unreadOnOpen, setUnreadOnOpen] = useState(0);

  const scrollToBottom = (smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    setNewCount(0);
  };
  const scrollToFirstUnread = () => {
    unreadDividerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAtBottom(bottom);
    if (bottom) setNewCount(0);
  };

  // Công tắc email chung của tài khoản cố vấn.
  useEffect(() => {
    apiClient
      .get('/messaging/settings')
      .then(({ data }) => setEmailEnabled(Boolean(data?.message_email_enabled ?? true)))
      .catch(() => {});
  }, []);

  const toggleEmailGlobal = async () => {
    const next = !emailEnabled;
    setEmailEnabled(next);
    try {
      await apiClient.put('/messaging/settings', { message_email_enabled: next });
    } catch (err) {
      console.error('[Messages] toggle email:', err);
      setEmailEnabled(!next);
    }
  };

  // Tắt/bật email từ một sinh viên cụ thể (mute theo người).
  const toggleMute = async () => {
    const chat = chats.find((c) => c.id === activeChatId);
    if (!chat?.student_user_id) return;
    const next = !chat.muted;
    try {
      await apiClient.put('/messaging/mute', { peer_user_id: chat.student_user_id, muted: next });
      setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, muted: next } : c)));
    } catch (err) {
      console.error('[Messages] toggle mute:', err);
    }
  };

  const applyReadReceipt = (event: MessagesReadEvent) => {
    setMessages(prev => prev.map(msg =>
      event.messageIds.includes(msg.id) ? { ...msg, is_read: true } : msg
    ));

    if (event.readerRole === 'ADVISOR') {
      setChats(prev => prev.map(chat =>
        chat.id === event.conversationId
          ? { ...chat, unreadCount: 0, isUnread: false }
          : chat
      ));
    }
  };

  const markConversationAsRead = async (conversationId: number) => {
    try {
      const { data } = await apiClient.patch(`/conversations/${conversationId}/read`);
      const readMessageIds: number[] = data?.read_message_ids || [];

      setChats(prev => prev.map(chat =>
        chat.id === conversationId
          ? { ...chat, unreadCount: 0, isUnread: false }
          : chat
      ));

      if (readMessageIds.length > 0) {
        window.dispatchEvent(new Event('messages:changed'));
        setMessages(prev => prev.map(msg =>
          readMessageIds.includes(msg.id) ? { ...msg, is_read: true } : msg
        ));
      }
    } catch (err) {
      console.error('[Messages] Không thể đánh dấu đã đọc:', err);
    }
  };

  const toChat = (conversation: any, fallback?: Partial<Chat>): Chat => ({
    id: Number(conversation.id),
    student_id: Number(conversation.student_id ?? fallback?.student_id),
    name: conversation.name ?? fallback?.name ?? 'Sinh viên',
    idNumber: conversation.idNumber ?? conversation.mssv ?? fallback?.idNumber ?? '',
    lastMessage: conversation.lastMessage ?? fallback?.lastMessage ?? '',
    time: conversation.time ?? fallback?.time ?? '',
    unreadCount: Number(conversation.unreadCount ?? fallback?.unreadCount ?? 0),
    isUnread: Boolean(conversation.isUnread ?? fallback?.isUnread ?? false),
    student_user_id: conversation.student_user_id != null
      ? Number(conversation.student_user_id)
      : fallback?.student_user_id,
    muted: Boolean(conversation.muted ?? fallback?.muted ?? false),
  });

  const createConversationForStudent = async (student: Contact | Chat) => {
    const studentId = 'student_id' in student ? student.student_id : student.id;
    const { data } = await apiClient.post('/conversations', { student_id: studentId });
    const chat = toChat(data, {
      student_id: studentId,
      name: student.name,
      idNumber: 'mssv' in student ? student.mssv : student.idNumber,
      lastMessage: 'Cuộc trò chuyện mới',
    });

    setChats(prev => {
      const withoutVirtual = prev.filter(item => item.student_id !== chat.student_id || item.id > 0);
      const exists = withoutVirtual.some(item => item.id === chat.id);
      return exists
        ? withoutVirtual.map(item => item.id === chat.id ? { ...item, ...chat } : item)
        : [chat, ...withoutVirtual];
    });

    setActiveChatId(chat.id);
    return chat;
  };

  const openChat = async (chat: Chat) => {
    if (chat.id > 0) {
      setActiveChatId(chat.id);
      return;
    }

    try {
      await createConversationForStudent(chat);
    } catch (err) {
      console.error('[Messages] Lỗi tạo conversation:', err);
    }
  };

  // ── 1. Fetch danh sách conversations + sinh viên lớp mình ─────
  useEffect(() => {
    async function fetchConversations() {
      try {
        setLoadingChats(true);
        const [conversationsRes, studentsRes] = await Promise.all([
          apiClient.get('/conversations'),
          apiClient.get('/advisor/students'),
        ]);

        const conversationChats: Chat[] = (conversationsRes.data ?? []).map((item: any) => toChat(item));
        const existingStudentIds = new Set(conversationChats.map(chat => chat.student_id));
        const contactChats: Chat[] = (Array.isArray(studentsRes.data) ? studentsRes.data : [])
          .filter((student: any) => !existingStudentIds.has(Number(student.id)))
          .map((student: any) => ({
            id: -Number(student.id),
            student_id: Number(student.id),
            name: student.full_name || 'Sinh viên',
            idNumber: student.mssv || '',
            lastMessage: 'Chưa có hội thoại',
            time: '',
            unreadCount: 0,
            isUnread: false,
          }));

        const mergedChats = [...conversationChats, ...contactChats];
        setChats(mergedChats);

        // Tự động chọn conversation đầu tiên nếu chưa có gì active
        if (conversationChats.length > 0 && !activeChatId) {
          setActiveChatId(conversationChats[0].id);
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

    createConversationForStudent(initialContact).catch((err) => {
      console.error('[Messages] Lỗi tạo conversation:', err);
    });
  }, [initialContact]);
  useEffect(() => {
    if (chats.length === 0) return;

    const sock = getSocket();
    // Join ngay + join lại mỗi khi socket (re)connect. Quan trọng: khi backend
    // restart (nodemon) socket sẽ reconnect và MẤT hết room đã join phía server,
    // nếu không join lại thì cố vấn ngừng nhận 'new_message' cho tới khi reload.
    const joinAll = () => chats.filter(chat => chat.id > 0).forEach(chat => sock.emit('join_conversation', chat.id));
    joinAll();
    sock.on('connect', joinAll);

    return () => { sock.off('connect', joinAll); };
  }, [chats]);

  // ── 3. Fetch tin nhắn khi đổi conversation ───────────────────
  useEffect(() => {
    if (!activeChatId || activeChatId <= 0) return;

    async function fetchMessages() {
      try {
        setLoadingMsgs(true);
        const { data } = await apiClient.get(`/conversations/${activeChatId}/messages`);
        const list: Message[] = data ?? [];
        setMessages(list);
        // Mốc tin chưa đọc cũ nhất (tin sinh viên gửi chưa đọc) — bắt TRƯỚC khi markRead.
        const unread = list.filter((m) => m.sender_role === 'STUDENT' && !m.is_read);
        setFirstUnreadId(unread.length ? String(unread[0].id) : null);
        setUnreadOnOpen(unread.length);
        setNewCount(0);
        pendingScrollRef.current = unread.length ? 'unread' : 'bottom';
        await markConversationAsRead(activeChatId);
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

    // Lắng nghe tin nhắn mới. Lưu ý: pg trả BIGINT dạng chuỗi ("53") nên phải
    // ép Number trước khi so với activeChatId (số) — nếu không sẽ luôn lệch và
    // tin nhắn không hiện cho tới khi reload.
    const handleNewMessage = (msg: Message) => {
      const convId = Number(msg.conversation_id);

      if (convId !== activeChatId) {
        setChats(prev => prev.map(c => {
          if (c.id !== convId) return c;

          const unreadCount = msg.sender_role === 'STUDENT'
            ? Number(c.unreadCount || 0) + 1
            : Number(c.unreadCount || 0);

          return {
            ...c,
            lastMessage: msg.content,
            time: new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            unreadCount,
            isUnread: unreadCount > 0,
          };
        }));
        return;
      }

      setMessages(prev => {
        if (prev.some(item => Number(item.id) === Number(msg.id))) return prev;
        return [...prev, msg];
      });
      // Cập nhật lastMessage trong chat list
      setChats(prev => prev.map(c =>
        c.id === activeChatId
          ? { ...c, lastMessage: msg.content, time: new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }
          : c
      ));
      if (msg.sender_role === 'STUDENT') {
        markConversationAsRead(convId);
      }
    };

    const handleMessagesRead = (event: MessagesReadEvent) => {
      applyReadReceipt(event);
    };

    sock.on('new_message', handleNewMessage);
    sock.on('messages_read', handleMessagesRead);

    return () => {
      sock.off('new_message', handleNewMessage);
      sock.off('messages_read', handleMessagesRead);
    };
  }, [activeChatId]);

  // ── 4. Cuộn thông minh (kiểu Messenger) ──────────────────────
  useLayoutEffect(() => {
    if (pendingScrollRef.current) {
      const target = pendingScrollRef.current;
      pendingScrollRef.current = null;
      prevLenRef.current = messages.length;
      requestAnimationFrame(() => {
        if (target === 'unread' && unreadDividerRef.current) {
          unreadDividerRef.current.scrollIntoView({ block: 'center' });
        } else {
          messagesEndRef.current?.scrollIntoView();
        }
        handleScroll();
      });
      return;
    }

    const grew = messages.length > prevLenRef.current;
    prevLenRef.current = messages.length;
    if (!grew) return;

    const el = scrollRef.current;
    const last = messages[messages.length - 1];
    const mine = last?.sender_role === 'ADVISOR';
    const nearBottom = el ? el.scrollHeight - el.scrollTop - el.clientHeight < 140 : true;

    if (mine || nearBottom) {
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
    } else {
      setNewCount((c) => c + 1);
    }
  }, [messages]);

  // ── 5. Gửi tin nhắn qua Socket ───────────────────────────────
  const handleSend = () => {
    if (!inputValue.trim() || !activeChatId || activeChatId <= 0 || !currentUser) return;

    setSending(true);
    const sock = getSocket();

    sock.emit('send_message', {
      conversationId: activeChatId,
      senderId:       currentUser.id,
      senderRole:     'ADVISOR',
      content:        inputValue.trim(),
    });

    window.dispatchEvent(new Event('messages:changed'));
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-headline font-bold text-lg text-slate-900">Tin nhắn</h2>
            <button
              type="button"
              onClick={toggleEmailGlobal}
              title="Bật/tắt nhận email khi có tin nhắn mới"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                emailEnabled
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              )}
            >
              {emailEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              {emailEnabled ? 'Email' : 'Tắt'}
            </button>
          </div>
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
            filteredChats.map(chat => {
              const unreadCount = Number(chat.unreadCount || 0);

              return (
              <div
                key={chat.id}
                onClick={() => openChat(chat)}
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
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className={cn(
                      'font-bold truncate text-sm',
                      unreadCount > 0 ? 'text-slate-950' : activeChatId === chat.id ? 'text-primary' : 'text-slate-900'
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
              );
            })
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
                <button
                  type="button"
                  onClick={toggleMute}
                  disabled={!activeChat.student_user_id}
                  title={activeChat.muted ? 'Bật lại email từ sinh viên này' : 'Tắt email từ sinh viên này'}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                    activeChat.muted
                      ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  )}
                >
                  {activeChat.muted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                  {activeChat.muted ? 'Đã tắt báo' : 'Đang báo'}
                </button>
                <button type="button" className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full transition-colors">
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
            <div className="relative flex-1 min-h-0">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="absolute inset-0 overflow-y-auto p-6 space-y-4 bg-slate-50/30"
              >
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
                        <React.Fragment key={msg.id}>
                          {String(msg.id) === firstUnreadId && (
                            <div ref={unreadDividerRef} className="flex items-center gap-2 my-3">
                              <div className="flex-1 h-px bg-rose-200" />
                              <span className="text-[11px] font-bold uppercase tracking-wide text-rose-500">
                                Tin nhắn chưa đọc
                              </span>
                              <div className="flex-1 h-px bg-rose-200" />
                            </div>
                          )}
                          <div className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
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
                        </React.Fragment>
                      );
                    })}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chỉ báo tin chưa đọc → bấm nhảy tới tin cũ nhất chưa đọc */}
              {firstUnreadId && unreadOnOpen > 0 && !atBottom && (
                <button
                  type="button"
                  onClick={scrollToFirstUnread}
                  className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500 text-white text-xs font-bold shadow-lg hover:bg-rose-600 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                  {unreadOnOpen} tin chưa đọc
                </button>
              )}

              {/* Nút mũi tên cuộn xuống tin mới nhất */}
              {!atBottom && (
                <button
                  type="button"
                  onClick={() => scrollToBottom(true)}
                  title="Cuộn xuống tin mới nhất"
                  className="absolute bottom-4 right-4 z-10 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <ChevronDown className="w-5 h-5" />
                  {newCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                      {newCount > 9 ? '9+' : newCount}
                    </span>
                  )}
                </button>
              )}
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

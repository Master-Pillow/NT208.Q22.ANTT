import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, Bell, BellOff, Check, CheckCheck, ChevronDown, Loader2,
  MessageSquare, Search, Send, Users, GraduationCap,
} from 'lucide-react';
import apiClient from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { cn } from '../../lib/utils';

// ─────────────────────────────────────────────────────────────────
// Types (đã chuẩn hoá từ backend /messaging/*)
// ─────────────────────────────────────────────────────────────────
interface AdvisorContact { user_id: number; name: string; email: string; }
interface ClassmateContact { user_id: number; mssv: string; name: string; }

interface Thread {
  key: string;
  kind: 'advisor' | 'peer';
  peer_user_id: number;
  peer_name: string;
  peer_detail: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  muted: boolean;
}

interface Msg {
  id: number;
  key: string;
  sender_id: number;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface NewMessageEvent { key: string; message: Msg; }
interface MessageReadEvent { key: string; reader_id: number; message_ids: number[]; }

// Dòng danh bạ đã gộp contact + thread (nếu có).
interface Row { peer_user_id: number; name: string; detail: string; thread: Thread | null; }

const getCurrentUserId = (): number => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? Number(JSON.parse(raw)?.id) || 0 : 0;
  } catch {
    return 0;
  }
};

const formatTime = (iso?: string | null) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────
export const StudentMessages = () => {
  const meId = useMemo(() => getCurrentUserId(), []);

  const [advisors, setAdvisors] = useState<AdvisorContact[]>([]);
  const [classmates, setClassmates] = useState<ClassmateContact[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [emailEnabled, setEmailEnabled] = useState(true);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [opening, setOpening] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const activeKeyRef = useRef<string | null>(null);
  const threadsRef = useRef<Thread[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const unreadDividerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef<'unread' | 'bottom' | null>(null);
  const prevLenRef = useRef(0);

  // Kiểu Messenger: chỉ báo tin chưa đọc + nút cuộn xuống tin mới nhất.
  const [atBottom, setAtBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [firstUnreadId, setFirstUnreadId] = useState<number | null>(null);
  const [unreadOnOpen, setUnreadOnOpen] = useState(0);
  // Nút "còn N tin chưa đọc" hiển thị độc lập với vị trí cuộn: mở hội thoại là
  // nhảy thẳng xuống tin mới nhất, vẫn còn nút để lướt lên chỗ chưa đọc.
  const [showUnreadJump, setShowUnreadJump] = useState(false);

  useEffect(() => { activeKeyRef.current = activeKey; }, [activeKey]);
  useEffect(() => { threadsRef.current = threads; }, [threads]);

  const scrollToBottom = (smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
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

  const activeThread = threads.find((t) => t.key === activeKey) || null;

  // ── Helpers cập nhật state ──────────────────────────────────────
  const upsertThread = (incoming: Thread) =>
    setThreads((prev) => {
      const exists = prev.some((t) => t.key === incoming.key);
      return exists
        ? prev.map((t) => (t.key === incoming.key ? { ...t, ...incoming } : t))
        : [incoming, ...prev];
    });

  const bumpThreadPreview = (key: string, msg: Msg, incUnread: boolean) =>
    setThreads((prev) =>
      prev.map((t) =>
        t.key === key
          ? {
              ...t,
              last_message: msg.content,
              last_message_at: msg.created_at,
              unread_count: incUnread ? Number(t.unread_count || 0) + 1 : t.unread_count,
            }
          : t
      )
    );

  // ── Tải dữ liệu ban đầu ─────────────────────────────────────────
  async function loadInitial() {
    const [contactsRes, threadsRes, settingsRes] = await Promise.all([
      apiClient.get('/messaging/contacts'),
      apiClient.get('/messaging/threads'),
      apiClient.get('/messaging/settings'),
    ]);
    setAdvisors(contactsRes.data?.advisors || []);
    setClassmates(contactsRes.data?.classmates || []);
    setThreads(threadsRes.data || []);
    setEmailEnabled(Boolean(settingsRes.data?.message_email_enabled ?? true));
  }

  async function refreshThreads() {
    try {
      const { data } = await apiClient.get('/messaging/threads');
      setThreads(data || []);
    } catch (err) {
      console.error('[StudentMessages/refreshThreads]', err);
    }
  }

  useEffect(() => {
    loadInitial()
      .catch((err) => {
        console.error('[StudentMessages/init]', err);
        setErrorMsg(err.response?.data?.message || 'Không thể tải danh bạ tin nhắn.');
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Đọc tin nhắn của 1 thread + đánh dấu đã đọc ─────────────────
  async function markRead(key: string) {
    try {
      const { data } = await apiClient.patch(`/messaging/threads/${key}/read`);
      const readIds: number[] = data?.read_message_ids || [];
      setThreads((prev) => prev.map((t) => (t.key === key ? { ...t, unread_count: 0 } : t)));
      if (readIds.length > 0) window.dispatchEvent(new Event('messages:changed'));
    } catch (err) {
      console.error('[StudentMessages/markRead]', err);
    }
  }

  useEffect(() => {
    if (!activeKey) return;

    async function loadMessages() {
      try {
        setLoadingMsgs(true);
        const { data } = await apiClient.get(`/messaging/threads/${activeKey}/messages`);
        const list: Msg[] = data || [];
        setMessages(list);
        // Mốc tin chưa đọc cũ nhất (tin của người kia chưa đọc) — bắt TRƯỚC khi markRead.
        const unread = list.filter((m) => m.sender_id !== meId && !m.is_read);
        setFirstUnreadId(unread.length ? Number(unread[0].id) : null);
        setUnreadOnOpen(unread.length);
        setShowUnreadJump(unread.length > 0);
        setNewCount(0);
        // Luôn nhảy xuống tin mới nhất khi mở hội thoại; nút "còn N tin chưa đọc"
        // ở trên cho phép lướt ngược lên chỗ chưa đọc.
        pendingScrollRef.current = 'bottom';
        await markRead(activeKey!);
      } catch (err) {
        console.error('[StudentMessages/loadMessages]', err);
        setErrorMsg('Không thể tải tin nhắn của hội thoại này.');
      } finally {
        setLoadingMsgs(false);
      }
    }

    loadMessages();
  }, [activeKey]);

  // ── Realtime qua phòng user_<id> ────────────────────────────────
  useEffect(() => {
    const sock = getSocket();

    const handleNew = (evt: NewMessageEvent) => {
      const { key, message } = evt;
      const isActive = key === activeKeyRef.current;
      const mine = message.sender_id === meId;

      if (isActive) {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
        if (!mine) markRead(key);
      }

      if (threadsRef.current.some((t) => t.key === key)) {
        bumpThreadPreview(key, message, !mine && !isActive);
      } else {
        // Thread mới (vd: bạn cùng lớp nhắn lần đầu) → tải lại danh bạ.
        refreshThreads();
      }
      window.dispatchEvent(new Event('messages:changed'));
    };

    const handleRead = (evt: MessageReadEvent) => {
      if (evt.key !== activeKeyRef.current) return;
      if (evt.reader_id === meId) return; // tin của tôi được phía kia đọc
      setMessages((prev) =>
        prev.map((m) => (evt.message_ids.includes(m.id) ? { ...m, is_read: true } : m))
      );
    };

    // Khi socket reconnect (vd backend restart), kéo lại danh bạ + tin của hội
    // thoại đang mở để không sót tin gửi trong lúc mất kết nối. (socket.ts đã tự
    // join lại phòng user_<id> nên các tin MỚI vẫn về realtime.)
    const handleReconnect = () => {
      refreshThreads();
      const k = activeKeyRef.current;
      if (k) {
        apiClient
          .get(`/messaging/threads/${k}/messages`)
          .then(({ data }) => setMessages(data || []))
          .catch(() => {});
      }
    };

    sock.on('message:new', handleNew);
    sock.on('message:read', handleRead);
    sock.on('connect', handleReconnect);

    return () => {
      sock.off('message:new', handleNew);
      sock.off('message:read', handleRead);
      sock.off('connect', handleReconnect);
    };
  }, [meId]);

  // Cuộn thông minh: mở hội thoại → nhảy tới tin chưa đọc cũ nhất (hoặc đáy nếu
  // đã đọc hết). Tin mới đến → tự cuộn nếu đang ở đáy/tin của mình, ngược lại
  // tăng badge cho nút mũi tên.
  useLayoutEffect(() => {
    if (pendingScrollRef.current) {
      const target = pendingScrollRef.current;
      pendingScrollRef.current = null;
      prevLenRef.current = messages.length;
      requestAnimationFrame(() => {
        if (target === 'unread' && unreadDividerRef.current) {
          unreadDividerRef.current.scrollIntoView({ block: 'center' });
        } else {
          bottomRef.current?.scrollIntoView();
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
    const mine = last?.sender_id === meId;
    const nearBottom = el ? el.scrollHeight - el.scrollTop - el.clientHeight < 140 : true;

    if (mine || nearBottom) {
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
    } else {
      setNewCount((c) => c + 1);
    }
  }, [messages, meId]);

  // ── Mở 1 liên hệ (get-or-create thread) ─────────────────────────
  async function openContact(peerUserId: number) {
    const existing = threads.find((t) => t.peer_user_id === peerUserId);
    if (existing) {
      setActiveKey(existing.key);
      return;
    }
    try {
      setOpening(true);
      setErrorMsg('');
      const { data } = await apiClient.post('/messaging/threads', { peer_user_id: peerUserId });
      upsertThread(data);
      setActiveKey(data.key);
    } catch (err: any) {
      console.error('[StudentMessages/openContact]', err);
      setErrorMsg(err.response?.data?.message || 'Không thể mở hội thoại.');
    } finally {
      setOpening(false);
    }
  }

  // ── Gửi tin nhắn ────────────────────────────────────────────────
  async function handleSend() {
    const text = content.trim();
    if (!text || !activeKey || sending) return;
    try {
      setSending(true);
      setErrorMsg('');
      const { data } = await apiClient.post(`/messaging/threads/${activeKey}/messages`, {
        content: text,
      });
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      bumpThreadPreview(activeKey, data, false);
      setContent('');
      window.dispatchEvent(new Event('messages:changed'));
    } catch (err: any) {
      console.error('[StudentMessages/send]', err);
      setErrorMsg(err.response?.data?.message || 'Không thể gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  }

  // ── Tắt/bật email theo từng người ───────────────────────────────
  async function toggleMute() {
    if (!activeThread) return;
    const next = !activeThread.muted;
    try {
      await apiClient.put('/messaging/mute', {
        peer_user_id: activeThread.peer_user_id,
        muted: next,
      });
      setThreads((prev) =>
        prev.map((t) => (t.key === activeThread.key ? { ...t, muted: next } : t))
      );
    } catch (err) {
      console.error('[StudentMessages/toggleMute]', err);
    }
  }

  // ── Công tắc email chung của tài khoản ──────────────────────────
  async function toggleEmailGlobal() {
    const next = !emailEnabled;
    setEmailEnabled(next); // optimistic
    try {
      await apiClient.put('/messaging/settings', { message_email_enabled: next });
    } catch (err) {
      console.error('[StudentMessages/toggleEmailGlobal]', err);
      setEmailEnabled(!next); // revert
    }
  }

  // ── Ghép contact + thread để render danh bạ ─────────────────────
  const threadByPeer = useMemo(() => {
    const map = new Map<string, Thread>();
    threads.forEach((t) => map.set(String(t.peer_user_id), t));
    return map;
  }, [threads]);

  const advisorIds = useMemo(() => new Set(advisors.map((a) => String(a.user_id))), [advisors]);
  const classmateIds = useMemo(() => new Set(classmates.map((c) => String(c.user_id))), [classmates]);

  const matchesSearch = (name: string, detail: string) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (name || '').toLowerCase().includes(q) || (detail || '').toLowerCase().includes(q);
  };

  // Danh sách = liên hệ (cố vấn lớp / bạn cùng lớp) + các hội thoại đã có sẵn với
  // người không còn trong danh bạ (vd cố vấn cũ) để không mất lịch sử trò chuyện.
  const advisorRows: Row[] = [
    ...advisors.map((a) => ({
      peer_user_id: a.user_id, name: a.name, detail: a.email,
      thread: threadByPeer.get(String(a.user_id)) || null,
    })),
    ...threads
      .filter((t) => t.kind === 'advisor' && !advisorIds.has(String(t.peer_user_id)))
      .map((t) => ({ peer_user_id: t.peer_user_id, name: t.peer_name, detail: t.peer_detail || '', thread: t })),
  ];

  const classmateRows: Row[] = [
    ...classmates.map((c) => ({
      peer_user_id: c.user_id, name: c.name, detail: c.mssv,
      thread: threadByPeer.get(String(c.user_id)) || null,
    })),
    ...threads
      .filter((t) => t.kind === 'peer' && !classmateIds.has(String(t.peer_user_id)))
      .map((t) => ({ peer_user_id: t.peer_user_id, name: t.peer_name, detail: t.peer_detail || '', thread: t })),
  ].filter((r) => matchesSearch(r.name, r.detail));

  if (loading) {
    return <div className="p-8 text-slate-500">Đang tải tin nhắn...</div>;
  }

  // ── Render 1 dòng liên hệ ───────────────────────────────────────
  const renderContactRow = (
    peerUserId: number,
    name: string,
    detail: string,
    thread: Thread | null,
    accent: 'advisor' | 'peer'
  ) => {
    const unread = Number(thread?.unread_count || 0);
    const isActive = thread?.key === activeKey;
    return (
      <button
        key={`${accent}-${peerUserId}`}
        onClick={() => openContact(peerUserId)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-100/80',
          isActive ? 'bg-blue-50 border-l-2 border-l-blue-600' : 'hover:bg-white'
        )}
      >
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            accent === 'advisor' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'
          )}
        >
          {accent === 'advisor' ? <GraduationCap className="w-5 h-5" /> : <Users className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn('font-bold truncate text-sm', unread > 0 ? 'text-slate-950' : 'text-slate-800')}>
              {name}
            </span>
            <span className="text-[10px] text-slate-400 shrink-0">{formatTime(thread?.last_message_at)}</span>
          </div>
          <p className="text-xs text-slate-500 truncate">
            {thread?.last_message || detail || 'Bắt đầu trò chuyện...'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {unread > 0 && (
            <span className="min-w-5 h-5 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
          {thread?.muted && <BellOff className="w-3.5 h-3.5 text-slate-300" />}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-sans font-black text-on-surface tracking-normal mb-1">Tin nhắn</h2>
          <p className="text-on-surface-variant font-medium">
            Trao đổi với cố vấn học tập và bạn cùng lớp sinh hoạt.
          </p>
        </div>
        <button
          onClick={toggleEmailGlobal}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors',
            emailEnabled
              ? 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100'
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
          )}
          title="Bật/tắt nhận email khi có tin nhắn mới"
        >
          {emailEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          {emailEnabled ? 'Email: Bật' : 'Email: Tắt'}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      <div className="flex h-[calc(100vh-220px)] min-h-[480px] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* ── Danh bạ ───────────────────────────────────────────── */}
        <div className="w-80 shrink-0 border-r border-slate-100 flex flex-col bg-slate-50/50">
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 pt-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Cố vấn học tập
            </div>
            {advisorRows.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-400">Lớp bạn chưa có cố vấn.</p>
            ) : (
              advisorRows.map((r) =>
                renderContactRow(r.peer_user_id, r.name, r.detail, r.thread, 'advisor')
              )
            )}

            <div className="px-4 pt-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Bạn cùng lớp
            </div>
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo MSSV hoặc tên..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            {classmateRows.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-400">
                {search ? 'Không tìm thấy bạn nào.' : 'Lớp bạn chưa có sinh viên khác.'}
              </p>
            ) : (
              classmateRows.map((r) =>
                renderContactRow(r.peer_user_id, r.name, r.detail, r.thread, 'peer')
              )
            )}
          </div>
        </div>

        {/* ── Khung chat ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          {activeThread ? (
            <>
              <div className="h-16 border-b border-slate-100 flex items-center justify-between px-5 shrink-0">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400">
                    {activeThread.kind === 'advisor' ? 'Cố vấn học tập' : 'Sinh viên cùng lớp'}
                  </p>
                  <h3 className="font-bold text-slate-900 truncate">{activeThread.peer_name}</h3>
                  {activeThread.peer_detail && (
                    <p className="text-xs text-slate-500 truncate">{activeThread.peer_detail}</p>
                  )}
                </div>
                <button
                  onClick={toggleMute}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0',
                    activeThread.muted
                      ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  )}
                  title="Tắt/bật email thông báo từ người này"
                >
                  {activeThread.muted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                  {activeThread.muted ? 'Đã tắt báo' : 'Đang báo'}
                </button>
              </div>

              <div className="relative flex-1 min-h-0">
                <div
                  ref={scrollRef}
                  onScroll={handleScroll}
                  className="absolute inset-0 overflow-y-auto p-5 space-y-3 bg-slate-50/40"
                >
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Đang tải tin nhắn...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-slate-400 mt-16">
                      Chưa có tin nhắn. Hãy gửi lời nhắn đầu tiên.
                    </p>
                  ) : (
                    messages.map((msg) => {
                      const mine = msg.sender_id === meId;
                      return (
                        <React.Fragment key={msg.id}>
                          {msg.id === firstUnreadId && (
                            <div ref={unreadDividerRef} className="flex items-center gap-2 my-3">
                              <div className="flex-1 h-px bg-rose-200" />
                              <span className="text-[11px] font-bold uppercase tracking-wide text-rose-500">
                                Tin nhắn chưa đọc
                              </span>
                              <div className="flex-1 h-px bg-rose-200" />
                            </div>
                          )}
                          <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                            <div
                              className={cn(
                                'max-w-[72%] rounded-2xl px-4 py-2.5 text-sm',
                                mine ? 'bg-blue-600 text-white' : 'bg-white border border-slate-100 text-slate-700'
                              )}
                            >
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                              <div
                                className={cn(
                                  'text-[10px] mt-1 flex items-center gap-1',
                                  mine ? 'text-blue-100 justify-end' : 'text-slate-400'
                                )}
                              >
                                <span>{formatTime(msg.created_at)}</span>
                                {mine &&
                                  (msg.is_read ? (
                                    <CheckCheck className="w-3 h-3 text-blue-100" />
                                  ) : (
                                    <Check className="w-3 h-3 text-blue-100" />
                                  ))}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Chỉ báo tin chưa đọc → bấm nhảy tới tin cũ nhất chưa đọc */}
                {firstUnreadId && unreadOnOpen > 0 && showUnreadJump && (
                  <button
                    type="button"
                    onClick={() => {
                      scrollToFirstUnread();
                      setShowUnreadJump(false);
                    }}
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
                      <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                        {newCount > 9 ? '9+' : newCount}
                      </span>
                    )}
                  </button>
                )}
              </div>

              <div className="p-4 border-t flex gap-3 shrink-0">
                <input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sending}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  placeholder="Nhập tin nhắn..."
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !content.trim()}
                  className="px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Đang gửi...' : 'Gửi'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
              {opening ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="font-medium">Đang mở hội thoại...</p>
                </>
              ) : (
                <>
                  <MessageSquare className="w-14 h-14 opacity-20" />
                  <p className="font-medium">Chọn cố vấn hoặc bạn cùng lớp để bắt đầu trò chuyện</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

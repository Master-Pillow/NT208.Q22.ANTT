import React, { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import apiClient from '../../lib/api';

interface Message {
  id: number;
  sender_role: 'ADVISOR' | 'STUDENT';
  content: string;
  created_at: string;
}

export const StudentMessages = () => {
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadMessages() {
    const { data } = await apiClient.get('/student/messages');
    setConversation(data.conversation);
    setMessages(data.messages || []);
  }

  useEffect(() => {
    loadMessages()
      .catch((err) => console.error('[StudentMessages]', err))
      .finally(() => setLoading(false));
  }, []);

  async function handleSend() {
    if (!content.trim()) return;

    await apiClient.post('/student/messages', { content });
    setContent('');
    await loadMessages();
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

      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-slate-50">
          <p className="text-xs uppercase font-bold text-slate-400">Cố vấn học tập</p>
          <h3 className="text-xl font-bold text-blue-900 mt-1">
            {conversation?.advisor_name || 'Chưa có hội thoại'}
          </h3>
          {conversation?.advisor_email && (
            <p className="text-sm text-slate-500">{conversation.advisor_email}</p>
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
                <div key={msg.id} className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                      isStudent
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-100 text-slate-700'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t flex gap-3">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="Nhập tin nhắn cho cố vấn..."
          />
          <button
            onClick={handleSend}
            className="px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Gửi
          </button>
        </div>
      </section>
    </div>
  );
};
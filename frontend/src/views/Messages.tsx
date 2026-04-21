import React, { useState } from 'react';
import { Search, Send, Paperclip, Check, CheckCheck, MoreVertical, Phone, Video, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

export const Messages = () => {
  const [activeChat, setActiveChat] = useState(1);

  const chats = [
    {
      id: 1,
      name: 'Hoang Phuc Nguyen',
      idNumber: '23520104',
      avatar: '12',
      lastMessage: 'Thank you Professor, I will submit it tonight.',
      time: '10:42 AM',
      unread: 0,
      status: 'online',
    },
    {
      id: 2,
      name: 'Minh Quan Tran',
      idNumber: '23520115',
      avatar: '33',
      lastMessage: 'Can we schedule a meeting next week to discuss my GPA?',
      time: 'Yesterday',
      unread: 2,
      status: 'offline',
    },
    {
      id: 3,
      name: 'Thanh Hang Le',
      idNumber: '23520082',
      avatar: '5',
      lastMessage: 'I understand. I will try to be more active in class.',
      time: 'Yesterday',
      unread: 0,
      status: 'online',
    },
    {
      id: 4,
      name: 'Marcus Miller',
      idNumber: '#3102-BC',
      avatar: '68',
      lastMessage: 'Are there any extra credit opportunities?',
      time: 'Monday',
      unread: 0,
      status: 'offline',
    }
  ];

  const messages = [
    {
      id: 1,
      senderId: 1,
      text: "Hello Professor, I have a question regarding the recent assignment in Advanced Calculus.",
      time: "10:30 AM",
      isMe: false,
    },
    {
      id: 2,
      senderId: 'me',
      text: "Hi Hoang, sure. What's your question?",
      time: "10:32 AM",
      isMe: true,
      status: 'read'
    },
    {
      id: 3,
      senderId: 1,
      text: "I am having trouble with the third problem. Specifically, finding the limit of the series. The textbook example isn't very clear to me.",
      time: "10:34 AM",
      isMe: false,
    },
    {
      id: 4,
      senderId: 'me',
      text: "No problem. Let's look at it together. Have you tried using the ratio test instead of the root test? It often simplifies the expression significantly for factorials.",
      time: "10:38 AM",
      isMe: true,
      status: 'read'
    },
    {
      id: 5,
      senderId: 'me',
      text: "Also, remember condition #2 from lecture 4. I've attached the slides for your reference.",
      time: "10:39 AM",
      isMe: true,
      status: 'read',
      attachment: "Lecture_4_Series.pdf"
    },
    {
      id: 6,
      senderId: 1,
      text: "Oh, I see. I was stuck trying to apply the root test. Let me try the ratio test right now.",
      time: "10:41 AM",
      isMe: false,
    },
    {
      id: 7,
      senderId: 1,
      text: "Thank you Professor, I will submit it tonight.",
      time: "10:42 AM",
      isMe: false,
    }
  ];

  const activeUser = chats.find(c => c.id === activeChat);

  return (
    <div className="h-[calc(100vh-160px)] flex bg-white rounded-3xl shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 overflow-hidden animate-in fade-in duration-500 max-w-7xl mx-auto xl:mx-0">
      {/* Left Sidebar - Chat List */}
      <div className="w-full sm:w-80 border-r border-slate-100 flex flex-col bg-slate-50/30 flex-shrink-0">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-headline text-2xl font-black text-on-surface mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search students..." 
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <div 
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={cn(
                "p-4 border-b border-slate-100 cursor-pointer transition-colors flex items-start gap-4",
                activeChat === chat.id ? "bg-primary/5 relative" : "hover:bg-slate-50"
              )}
            >
              {activeChat === chat.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>
              )}
              
              <div className="relative flex-shrink-0 mt-1">
                <img 
                  src={`https://i.pravatar.cc/100?img=${chat.avatar}`} 
                  alt={chat.name} 
                  className="w-12 h-12 rounded-full object-cover shadow-sm border border-slate-200"
                />
                {chat.status === 'online' && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className={cn("font-bold truncate text-sm", activeChat === chat.id ? "text-primary dark:text-primary" : "text-slate-900")}>
                    {chat.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">{chat.time}</span>
                </div>
                <p className="text-xs text-slate-500 truncate mb-1">{chat.lastMessage}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">{chat.idNumber}</span>
                  {chat.unread > 0 && (
                    <span className="w-5 h-5 bg-error text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Content - Active Chat */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        {activeUser ? (
          <>
            <div className="h-20 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img 
                    src={`https://i.pravatar.cc/100?img=${activeUser.avatar}`} 
                    alt={activeUser.name} 
                    className="w-10 h-10 rounded-full object-cover shadow-sm"
                  />
                  {activeUser.status === 'online' && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{activeUser.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{activeUser.idNumber}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    {activeUser.status === 'online' ? 'Active Now' : 'Offline'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full transition-colors cursor-pointer">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full transition-colors cursor-pointer">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
              <div className="text-center">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
                  Today
                </span>
              </div>
              
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex", msg.isMe ? "justify-end" : "justify-start")}>
                  <div className={cn("flex flex-col gap-1 max-w-[75%]", msg.isMe ? "items-end" : "items-start")}>
                    
                    {msg.attachment ? (
                      <div className={cn(
                        "p-4 rounded-2xl border flex items-center gap-3 cursor-pointer",
                        msg.isMe ? "bg-primary text-white border-primary-container rounded-tr-sm" : "bg-white border-slate-200 text-slate-800 rounded-tl-sm shadow-sm"
                      )}>
                        <div className={cn("p-2 rounded-lg", msg.isMe ? "bg-white/20" : "bg-primary/10 text-primary")}>
                          <Paperclip className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{msg.attachment}</p>
                          <p className={cn("text-[10px]", msg.isMe ? "text-white/70" : "text-slate-400")}>PDF Document • 2.4 MB</p>
                        </div>
                      </div>
                    ) : (
                      <div className={cn(
                        "px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                        msg.isMe 
                          ? "bg-primary text-white font-medium rounded-tr-sm" 
                          : "bg-white border text-slate-700 border-slate-200 rounded-tl-sm"
                      )}>
                        {msg.text}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 px-2">
                      <span className="text-[10px] text-slate-400 font-semibold">{msg.time}</span>
                      {msg.isMe && (
                        msg.status === 'read' ? (
                          <CheckCheck className="w-3 h-3 text-primary" />
                        ) : (
                          <Check className="w-3 h-3 text-slate-400" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-100 bg-white shrink-0">
              <div className="flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all shadow-sm">
                <button className="p-2 text-slate-400 hover:text-primary transition-colors cursor-pointer shrink-0">
                  <Paperclip className="w-5 h-5" />
                </button>
                <textarea 
                  placeholder="Type a message..." 
                  className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 text-sm text-slate-700 py-2 outline-none"
                  rows={1}
                />
                <button className="p-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md transition-colors cursor-pointer shrink-0 group">
                  <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
            <MessageSquare className="w-16 h-16 opacity-20" />
            <p className="font-medium">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

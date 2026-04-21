import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, User } from 'lucide-react';
import { cn } from '../lib/utils';

export const AISupportWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      isBot: true,
      text: "Hello Dr. Thorne! I'm your AI Academic Assistant. How can I help you analyze your student data today?",
    },
    {
      id: 2,
      isBot: true,
      type: 'suggestions',
      suggestions: [
        "Which students are at highest risk?",
        "Summarize the performance of KHMT 2023.2",
        "Are there anomalies in Data Structures?",
        "Draft an email to failing students"
      ]
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const newUserMsg = { id: Date.now(), isBot: false, text };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');

    // Remove suggestions if they exist at the end
    setMessages(prev => prev.filter(m => m.type !== 'suggestions'));

    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        isBot: true,
        text: "I'm analyzing the requested data. Based on the current academic records: Elena Jenkins and Sarah Tish show the sharpest GPA drops. Would you like me to prepare an intervention report for them?"
      }]);
    }, 1000);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-8 right-8 z-50 flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-white px-5 py-3.5 rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all outline-none font-bold text-sm",
          isOpen ? "opacity-0 pointer-events-none scale-75" : "opacity-100 scale-100"
        )}
      >
        <Sparkles className="w-5 h-5" />
        AI Support
      </button>

      {/* Chat Window */}
      <div 
        className={cn(
          "fixed bottom-8 right-8 z-50 w-[360px] h-[540px] bg-white rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-slate-100 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right",
          isOpen ? "scale-100 opacity-100" : "scale-75 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-container p-4 text-white flex items-center justify-between shadow-sm relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">AI Advisor Assistant</h3>
              <p className="text-[10px] text-primary-fixed uppercase tracking-wider font-semibold">Online</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 flex flex-col gap-4">
          {messages.map((msg) => (
            <React.Fragment key={msg.id}>
              {msg.type === 'suggestions' ? (
                <div className="flex flex-col gap-2 mt-2 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-xs text-slate-500 font-medium ml-1">Suggested questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.suggestions?.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(suggestion)}
                        className="text-left text-[11px] font-semibold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={cn("flex gap-3", msg.isBot ? "items-end" : "flex-row-reverse items-end")}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-1 shadow-sm",
                    msg.isBot ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
                  )}>
                    {msg.isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl max-w-[75%] text-sm shadow-sm",
                    msg.isBot 
                      ? "bg-white border border-slate-100 text-slate-700 rounded-bl-sm" 
                      : "bg-primary text-white rounded-br-sm"
                  )}>
                    {msg.text}
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full p-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all shadow-sm">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
              placeholder="Ask anything about your cohorts..." 
              className="flex-1 bg-transparent border-none text-sm px-3 focus:ring-0 outline-none text-slate-700 placeholder:text-slate-400"
            />
            <button 
              onClick={() => handleSend(inputValue)}
              disabled={!inputValue.trim()}
              className="p-2.5 bg-primary hover:bg-primary/90 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-full transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Bot, User } from "lucide-react";

interface AIChatWidgetProps {
  token: string;
}

export default function AIChatWidget({ token }: AIChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "bot", text: "Welcome to BYD Horizon Club! I'm your AI assistant. Ask me about vehicles, pricing, payments, membership, insurance, investments, referrals, or anything else!" }]);
    }
  }, [open]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "bot", text: data.reply || "I'm sorry, I couldn't process that. Please try again." }]);
      if (data.topic) setTopic(data.topic);
    } catch {
      setMessages(prev => [...prev, { role: "bot", text: "Connection error. Please try again." }]);
    } finally { setLoading(false); }
  };

  const quickActions = [
    { label: "🚗 Vehicles", msg: "Tell me about your vehicles" },
    { label: "💰 Pricing", msg: "What are your prices?" },
    { label: "💳 Payment", msg: "How do I make a deposit?" },
    { label: "🛡️ Insurance", msg: "What insurance options do you have?" },
    { label: "👑 Elite", msg: "Tell me about Elite membership" },
    { label: "📈 Invest", msg: "What investment options are available?" },
  ];

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(!open)}
        className={`fixed bottom-6 left-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 cursor-pointer ${open ? 'bg-red-500 hover:bg-red-600 rotate-0' : 'bg-gradient-to-r from-[#00E5FF] to-blue-500 hover:shadow-[#00E5FF]/25 hover:shadow-lg animate-bounce'}`}>
        {open ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-[#0a0e1a]" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 left-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[520px] max-h-[calc(100vh-150px)] bg-[#0a0e1a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#00E5FF]/10 to-blue-500/10 border-b border-white/10 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00E5FF] to-blue-500 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#0a0e1a]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">BYD AI Assistant</h3>
              <p className="text-[10px] text-[#00E5FF]">Always here to help</p>
            </div>
            {topic && <span className="ml-auto text-[9px] bg-[#00E5FF]/10 text-[#00E5FF] px-2 py-1 rounded-full font-mono uppercase">{topic}</span>}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${m.role === 'user'
                  ? 'bg-[#00E5FF] text-[#0a0e1a] rounded-br-md'
                  : 'bg-white/5 text-white/80 border border-white/10 rounded-bl-md'
                }`}>
                  <div className="flex items-start gap-2">
                    {m.role === 'bot' && <Bot className="w-3.5 h-3.5 text-[#00E5FF] mt-0.5 flex-shrink-0" />}
                    {m.role === 'user' && <User className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-70" />}
                    <span className="whitespace-pre-wrap">{m.text}</span>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-[#00E5FF] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 bg-[#00E5FF] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 bg-[#00E5FF] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {quickActions.map((qa, i) => (
                <button key={i} onClick={() => { setInput(qa.msg); setTimeout(() => { setInput(""); setMessages(prev => [...prev, { role: "user", text: qa.msg }]); setLoading(true); fetch("/api/ai/chat", { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ message: qa.msg }) }).then(r => r.json()).then(d => { setMessages(prev => [...prev, { role: "bot", text: d.reply || "I'm sorry, I couldn't process that." }]); if (d.topic) setTopic(d.topic); }).catch(() => setMessages(prev => [...prev, { role: "bot", text: "Connection error." }])).finally(() => setLoading(false)); }, 50); }}
                  className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] text-white/60 hover:bg-[#00E5FF]/10 hover:text-[#00E5FF] hover:border-[#00E5FF]/20 transition cursor-pointer">
                  {qa.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask about vehicles, pricing, payments..."
                className="flex-1 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#00E5FF]/50" />
              <button onClick={send} disabled={!input.trim() || loading}
                className="p-2.5 bg-[#00E5FF] text-[#0a0e1a] rounded-xl hover:bg-[#00E5FF]/90 transition disabled:opacity-30 cursor-pointer">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

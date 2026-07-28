import React, { useState } from "react";
import { MessageSquare, Phone, ShieldAlert, X, Send, HelpCircle, ExternalLink } from "lucide-react";

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "call" | "escalate" | null>(null);
  
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "bot"; text: string; time: string }>>([
    { sender: "bot", text: "BYD Horizon Club Virtual Assistant online. All our licensed representatives are currently serving other luxury members. How can I assist you today?", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [chatInput, setChatInput] = useState("");
  
  const [escalateForm, setEscalateForm] = useState({ name: "", email: "", subject: "URGENT: Logistics Expedite Request", message: "" });
  const [escalateStatus, setEscalateStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: "user", text: userMsg, time }]);
    setChatInput("");
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        sender: "bot",
        text: "Please hold on... Connection congestion is high. All human managers are currently occupied reviewing vehicle custom clearings. We suggest leaving a support ticket or escalating directly using the Manager contact form.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1500);
  };

  const handleSendEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateForm.name || !escalateForm.email || !escalateForm.message) {
      alert("Please fill out all fields in the Escalation request.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(escalateForm)
      });
      const data = await res.json();
      if (res.ok) {
        setEscalateStatus(`Ticket #${1540 + data.ticketId} successfully issued to the Executive Board. Automatic secure SMTP servers sent a copy to ${escalateForm.email}. Average manager audit time is currently 72 hours.`);
        setEscalateForm({ name: "", email: "", subject: "URGENT: Logistics Expedite Request", message: "" });
      } else {
        alert(data.error || "Form transmission failed.");
      }
    } catch {
      alert("Error contacting escalation dispatch.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3" id="support-widget">
      {/* Telegram Button - always visible */}
      <a
        href="https://t.me/byd_horizon_support"
        target="_blank"
        rel="noopener noreferrer"
        className="h-12 w-12 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all group"
        title="Contact Telegram Support"
      >
        <Send className="w-5 h-5" />
      </a>

      {/* Expanded Support Menu */}
      {isOpen && (
        <div className="mb-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HelpCircle className="w-5 h-5 text-white" />
              <div>
                <h3 className="font-display font-semibold text-sm leading-none text-white">Horizon Club Helpdesk</h3>
                <span className="text-[10px] text-cyan-100 font-mono">24/7 Support</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Telegram Banner */}
          <a href="https://t.me/byd_horizon_support" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 bg-[#0088cc]/10 border-b border-[#0088cc]/20 hover:bg-[#0088cc]/20 transition group">
            <div className="w-8 h-8 rounded-full bg-[#0088cc] flex items-center justify-center">
              <Send className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-white">Telegram Support</p>
              <p className="text-[10px] text-white/60">Fastest response — DM us now</p>
            </div>
            <ExternalLink className="w-4 h-4 text-[#0088cc] group-hover:translate-x-0.5 transition" />
          </a>

          {/* Tab Nav */}
          <div className="flex border-b border-slate-800 bg-slate-950 text-xs font-mono">
            <button onClick={() => { setActiveTab("chat"); setEscalateStatus(null); }}
              className={`flex-1 py-2.5 text-center transition border-b-2 ${activeTab === "chat" ? "text-cyan-400 border-cyan-400 font-bold bg-slate-900" : "text-slate-400 border-transparent hover:text-slate-200"}`}>Live Chat</button>
            <button onClick={() => { setActiveTab("escalate"); setEscalateStatus(null); }}
              className={`flex-1 py-2.5 text-center transition border-b-2 ${activeTab === "escalate" ? "text-cyan-400 border-cyan-400 font-bold bg-slate-900" : "text-slate-400 border-transparent hover:text-slate-200"}`}>Escalate</button>
            <button onClick={() => { setActiveTab("call"); setEscalateStatus(null); }}
              className={`flex-1 py-2.5 text-center transition border-b-2 ${activeTab === "call" ? "text-cyan-400 border-cyan-400 font-bold bg-slate-900" : "text-slate-400 border-transparent hover:text-slate-200"}`}>Call</button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-950/50">
            {activeTab === null && (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <HelpCircle className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
                <h4 className="font-display font-medium text-sm mb-1 text-slate-300">How can we help?</h4>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">Choose a support option below or message us on Telegram for fastest response.</p>
                <div className="w-full space-y-2">
                  <button onClick={() => setActiveTab("chat")} className="w-full py-2 bg-slate-800 text-xs rounded-lg hover:bg-slate-700 transition flex items-center justify-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400" /><span>Live Chat</span>
                  </button>
                  <button onClick={() => setActiveTab("escalate")} className="w-full py-2 bg-slate-800 text-xs rounded-lg hover:bg-slate-700 transition flex items-center justify-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-emerald-400" /><span>Escalate to Executive</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "chat" && (
              <div className="flex flex-col h-full justify-between -m-4">
                <div className="p-4 space-y-3 overflow-y-auto flex-1 max-h-[280px]">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                      <div className={`p-3 max-w-[85%] rounded-2xl text-xs leading-relaxed ${msg.sender === "user" ? "bg-cyan-600 text-white rounded-tr-none" : "bg-slate-800 text-slate-100 rounded-tl-none"}`}>
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 px-1 font-mono">{msg.time}</span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendChat} className="border-t border-slate-800 p-2 flex bg-slate-900 space-x-2 items-center">
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white placeholder-slate-500" />
                  <button type="submit" className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition"><Send className="w-4 h-4" /></button>
                </form>
              </div>
            )}

            {activeTab === "escalate" && (
              <div>
                {escalateStatus ? (
                  <div className="bg-slate-900/60 border border-cyan-500/30 p-4 rounded-xl text-xs space-y-2 text-slate-300">
                    <h5 className="font-semibold text-cyan-400 flex items-center space-x-2"><ShieldAlert className="w-4 h-4" /><span>Escalation Active</span></h5>
                    <p className="leading-relaxed">{escalateStatus}</p>
                    <button onClick={() => setEscalateStatus(null)}
                      className="mt-3 w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded font-mono">File Another</button>
                  </div>
                ) : (
                  <form onSubmit={handleSendEscalate} className="space-y-3 p-1">
                    <div className="bg-slate-900/40 p-2 rounded border border-slate-800 text-[10px] text-slate-400">If your shipment is delayed or you need urgent assistance, escalate here.</div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-mono">Full Name</label>
                      <input required type="text" value={escalateForm.name} onChange={e => setEscalateForm(p => ({...p, name: e.target.value}))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-mono">Email</label>
                      <input required type="email" value={escalateForm.email} onChange={e => setEscalateForm(p => ({...p, email: e.target.value}))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white" placeholder="john@example.com" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-mono">Subject</label>
                      <select value={escalateForm.subject} onChange={e => setEscalateForm(p => ({...p, subject: e.target.value}))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white">
                        <option value="URGENT: Logistics Expedite Request">URGENT: Logistics Expedite Request</option>
                        <option value="PAYMENT: Double billing check">PAYMENT: Double billing check</option>
                        <option value="DISPUTE: Immediate refund audit">DISPUTE: Immediate refund audit</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-mono">Message</label>
                      <textarea required rows={3} value={escalateForm.message} onChange={e => setEscalateForm(p => ({...p, message: e.target.value}))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white placeholder-slate-600" placeholder="Describe your issue..." />
                    </div>
                    <button disabled={loading} type="submit"
                      className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition shadow-md">
                      {loading ? "Submitting..." : "Submit Escalation"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {activeTab === "call" && (
              <div className="flex flex-col items-center justify-center text-center py-8 px-4 space-y-4">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-full animate-bounce"><Phone className="w-8 h-8 text-cyan-400" /></div>
                <div>
                  <h4 className="font-display font-medium text-sm text-slate-200">Phone Support</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">Lines are currently busy due to high demand.</p>
                </div>
                <div className="bg-slate-950 border border-slate-900 p-3 rounded-lg w-full">
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-mono">Dispatch Line</span>
                  <a href="tel:+1234567890" className="text-cyan-400 font-mono text-lg font-bold hover:underline">+1 (234) 567-890</a>
                </div>
                <p className="text-[10px] text-slate-500">For fastest help, use <strong className="text-[#0088cc]">Telegram</strong> above.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button onClick={() => { setIsOpen(!isOpen); if(!isOpen) setActiveTab(null); }}
        className="h-12 w-12 bg-gradient-to-r from-cyan-500 to-blue-600 outline-none border-none hover:from-cyan-400 hover:to-blue-500 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:shadow-cyan-500/20 active:scale-95 transition-all">
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>
    </div>
  );
}

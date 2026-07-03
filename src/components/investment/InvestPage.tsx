import React, { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Wallet, Check, ArrowUpRight, Loader2, BarChart3, Clock, Shield, Zap, Globe } from "lucide-react";

interface InvestmentOption { id: number; name: string; description: string; min_amount: number; projected_apy: number; category: string; image_url: string; }
interface UserInvestment { id: number; option_name: string; amount: number; projected_apy: number; current_return: number; status: string; investment_number: string; created_at: string; }
interface Props { authToken: string; userBalance: number; onRefresh: () => void; }

const TESTIMONIALS = [
  { name: "John K.", amount: "$500", result: "+$75 in 6 months", fund: "Expansion Fund", quote: "Invested in the BYD Expansion Fund. Seeing consistent returns while supporting EV growth in Africa." },
  { name: "Sarah M.", amount: "$250", result: "+$20 in 4 months", fund: "Charging Network", quote: "The Charging Network fund is brilliant. I'm literally earning from the EV revolution." },
  { name: "Ahmed R.", amount: "$1,000", result: "+$180 in 8 months", fund: "Stock Pool", quote: "BYD stock has been incredible. This fund makes it accessible to everyone." },
  { name: "Priya S.", amount: "$200", result: "+$50 in 5 months", fund: "Battery Tech", quote: "The Battery Tech Fund is high risk but high reward. Worth it for the future of EVs." },
];

export function InvestPage({ authToken, userBalance, onRefresh }: Props) {
  const [options, setOptions] = useState<InvestmentOption[]>([]);
  const [myInvestments, setMyInvestments] = useState<UserInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<InvestmentOption | null>(null);
  const [investAmount, setInvestAmount] = useState("");
  const [investing, setInvesting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [optRes, invRes] = await Promise.all([
        fetch("/api/investments/options"),
        fetch("/api/investments/my", { headers: { Authorization: `Bearer ${authToken}` } })
      ]);
      setOptions(await optRes.json());
      setMyInvestments(await invRes.json());
    } catch {} finally { setLoading(false); }
  };

  const handleInvest = async () => {
    if (!selectedOption || !investAmount) return;
    setInvesting(true);
    try {
      const res = await fetch("/api/investments/invest", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ optionId: selectedOption.id, amount: parseFloat(investAmount) })
      });
      const data = await res.json();
      if (data.kycRequired) { alert("KYC verification required."); return; }
      if (data.success) { setMsg(`Invested $${investAmount} in ${selectedOption.name}! Projected APY: ${data.projected_apy}%`); setSelectedOption(null); setInvestAmount(""); fetchData(); onRefresh(); }
      else { alert(data.error || "Investment failed."); }
    } catch { alert("Network error."); } finally { setInvesting(false); }
  };

  const totalInvested = myInvestments.reduce((s, i) => s + i.amount, 0);
  const totalReturn = myInvestments.reduce((s, i) => s + i.current_return, 0);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center"><TrendingUp className="w-8 h-8 text-emerald-400" /></div>
        <h2 className="text-3xl font-bold mb-2">Invest in BYD's Future</h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">BYD is the fastest-growing EV manufacturer in the world. Invest through Horizon Club and earn projected returns of 15-30% APY.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400 font-mono">${totalInvested.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 font-mono">Total Invested</div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400 font-mono">+${totalReturn.toFixed(2)}</div>
          <div className="text-[10px] text-slate-500 font-mono">Current Returns</div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400 font-mono">{myInvestments.length}</div>
          <div className="text-[10px] text-slate-500 font-mono">Active Investments</div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400 font-mono">${userBalance.toFixed(0)}</div>
          <div className="text-[10px] text-slate-500 font-mono">Available Balance</div>
        </div>
      </div>

      {msg && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-300 flex items-center gap-2"><Check className="w-5 h-5" />{msg}<button onClick={() => setMsg(null)} className="ml-auto text-xs opacity-50">dismiss</button></div>}

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4">Investment Opportunities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {options.map(o => (
            <div key={o.id} className={`bg-white/5 border rounded-2xl p-5 transition cursor-pointer hover:border-cyan-500/30 ${selectedOption?.id === o.id ? "border-cyan-500/50 shadow-lg shadow-cyan-500/10" : "border-white/10"}`} onClick={() => setSelectedOption(o)}>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[9px] font-bold text-cyan-300">{o.category}</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">{o.projected_apy}% APY</span>
              </div>
              <h4 className="text-base font-bold mb-2">{o.name}</h4>
              <p className="text-xs text-slate-400 mb-4 line-clamp-3">{o.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Min: <span className="text-white font-mono">${o.min_amount}</span></span>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedOption && (
        <div className="bg-white/5 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">Invest in {selectedOption.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div><label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Amount (USD)</label><input type="number" min={selectedOption.min_amount} step="10" value={investAmount} onChange={e => setInvestAmount(e.target.value)} placeholder={`Min $${selectedOption.min_amount}`} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" /></div>
              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-400">Investment</span><span className="font-mono">${investAmount || 0}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Projected APY</span><span className="font-mono text-emerald-400">{selectedOption.projected_apy}%</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Est. Annual Return</span><span className="font-mono text-emerald-400">${investAmount ? (parseFloat(investAmount) * selectedOption.projected_apy / 100).toFixed(2) : "0.00"}</span></div>
                <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold"><span>From Balance</span><span className="font-mono">${userBalance.toFixed(2)}</span></div>
              </div>
                <button disabled={!investAmount || parseFloat(investAmount) < selectedOption.min_amount || parseFloat(investAmount) > userBalance || investing} onClick={handleInvest} className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm rounded-xl hover:shadow-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                  {investing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Invest $" + (investAmount || 0)}
                </button>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold">Member Testimonials</h4>
              {TESTIMONIALS.filter(t => t.fund === selectedOption.name || Math.random() > 0.5).slice(0, 2).map((t, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-slate-300 italic mb-3">"{t.quote}"</p>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">{t.name} • {t.fund}</span>
                    <span className="text-emerald-400 font-mono">{t.result}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {myInvestments.length > 0 && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">My Investments</h3>
          <div className="space-y-3">
            {myInvestments.map(inv => (
              <div key={inv.id} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">{inv.option_name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{inv.investment_number} • {inv.created_at?.split("T")[0]}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono">${inv.amount}</div>
                  <div className="text-[10px] text-emerald-400 font-mono">+${inv.current_return.toFixed(2)} ({inv.projected_apy}% APY)</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4">Why Invest in BYD?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5 text-emerald-400" /><span className="text-sm font-bold">Fastest Growing</span></div><p className="text-xs text-slate-400">BYD surpassed Tesla in global EV sales in 2025. The growth trajectory is just beginning.</p></div>
          <div className="bg-white/5 rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><Shield className="w-5 h-5 text-cyan-400" /><span className="text-sm font-bold">Battery Leader</span></div><p className="text-xs text-slate-400">Blade Battery technology is the safest in the world. Used by Tesla, Mercedes, and Toyota.</p></div>
          <div className="bg-white/5 rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><Globe className="w-5 h-5 text-yellow-400" /><span className="text-sm font-bold">Global Expansion</span></div><p className="text-xs text-slate-400">BYD is expanding into 60+ countries. Early investors ride the wave of global adoption.</p></div>
        </div>
      </div>
    </div>
  );
}

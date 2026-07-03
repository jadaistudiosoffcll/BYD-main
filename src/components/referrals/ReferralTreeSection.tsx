import React, { useState, useEffect } from "react";
import { Users, Copy, Check, ChevronDown, ChevronRight, Award, TreePine } from "lucide-react";

interface ReferralTree { level1: any[]; level2: any[]; level3: any[]; earnings: { direct: number; level2: number; level3: number; total: number }; achievement: string; totalRefs: number; }
interface Props { authToken: string; referralStats: any; leaderboard: any[]; formatBalance: (n: number, showDollar?: boolean) => string; copied: string | null; copyToClipboard: (text: string, key: string) => void; onClaim: () => void; }

const ACHIEVEMENTS = [
  { tier: "Bronze", min: 3, color: "from-orange-600 to-orange-800", perks: ["Basic referral dashboard"] },
  { tier: "Silver", min: 7, color: "from-slate-400 to-slate-500", perks: ["Priority support", "Monthly bonus"] },
  { tier: "Gold", min: 15, color: "from-yellow-500 to-yellow-600", perks: ["VIP support", "Exclusive merch"] },
  { tier: "Platinum", min: 30, color: "from-purple-500 to-purple-600", perks: ["Dedicated agent", "Elite events"] },
];

export function ReferralTreeSection({ authToken, referralStats, leaderboard, formatBalance, copied, copyToClipboard, onClaim }: Props) {
  const [tree, setTree] = useState<ReferralTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLevel, setExpandedLevel] = useState<number | null>(1);

  useEffect(() => { fetchTree(); }, []);

  const fetchTree = async () => {
    try {
      const res = await fetch("/api/referrals/tree", { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) setTree(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const currentAchievement = ACHIEVEMENTS.find(a => a.tier === tree?.achievement) || null;
  const nextAchievement = ACHIEVEMENTS.find(a => a.min > (tree?.totalRefs || 0)) || null;

  return (
    <div className="space-y-6">
      {/* Header & Code */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div><h2 className="text-lg font-bold">Referral Program</h2><p className="text-xs text-slate-400">Earn from 3 levels of referrals</p></div>
          <Users className="w-6 h-6 text-cyan-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4">
            <span className="text-[10px] text-slate-500 font-mono uppercase">Your Code</span>
            <div className="flex items-center gap-2 mt-2 bg-white/5 rounded-lg p-3">
              <code className="flex-1 text-sm font-mono text-cyan-300">{referralStats.code}</code>
              <button onClick={() => copyToClipboard(referralStats.code, "ref-code2")} className="p-1.5 hover:bg-white/10 rounded-lg transition cursor-pointer">
                {copied === "ref-code2" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <span className="text-[10px] text-slate-500 font-mono uppercase">Total Referrals</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1 font-mono">{tree?.totalRefs || 0}</div>
            <div className="text-[10px] text-slate-500 mt-1">across 3 levels</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <span className="text-[10px] text-slate-500 font-mono uppercase">Total Earnings</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">${tree?.earnings.total || 0}</div>
            <div className="text-[10px] text-slate-500 mt-1">from referrals</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <span className="text-[10px] text-slate-500 font-mono uppercase">Achievement</span>
            <div className="text-2xl font-bold text-yellow-400 mt-1 font-mono">{tree?.achievement || "None"}</div>
            <button onClick={onClaim} className="mt-1 px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-[10px] text-cyan-300 font-bold cursor-pointer">Claim Rewards</button>
          </div>
        </div>

        {/* Earnings Breakdown */}
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-bold mb-3">Earnings Breakdown</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center"><div className="text-lg font-bold text-emerald-400 font-mono">${tree?.earnings.direct || 0}</div><div className="text-[10px] text-slate-500">Direct ($50 each)</div></div>
            <div className="text-center"><div className="text-lg font-bold text-cyan-400 font-mono">${tree?.earnings.level2 || 0}</div><div className="text-[10px] text-slate-500">Level 2 ($10 each)</div></div>
            <div className="text-center"><div className="text-lg font-bold text-purple-400 font-mono">${tree?.earnings.level3 || 0}</div><div className="text-[10px] text-slate-500">Level 3 ($5 each)</div></div>
          </div>
        </div>

        {/* Achievement Progress */}
        {nextAchievement && (
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2"><span className="text-sm font-bold">Next: {nextAchievement.tier}</span><span className="text-xs text-slate-400">{tree?.totalRefs || 0}/{nextAchievement.min} referrals</span></div>
            <div className="w-full bg-white/5 rounded-full h-3"><div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all" style={{ width: `${Math.min(100, ((tree?.totalRefs || 0) / nextAchievement.min) * 100)}%` }} /></div>
            <div className="flex gap-4 mt-3">{nextAchievement.perks.map((p, i) => <span key={i} className="text-[10px] text-slate-400 flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" />{p}</span>)}</div>
          </div>
        )}
      </div>

      {/* Referral Tree Visualization */}
      {!loading && tree && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">Your Referral Tree</h3>
          {tree.level1.length === 0 ? (
            <div className="text-center py-8 text-slate-500"><TreePine className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No referrals yet. Share your code to start earning!</p></div>
          ) : (
            <div className="space-y-3">
              {tree.level1.map((ref, i) => (
                <div key={i} className="bg-white/5 rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedLevel(expandedLevel === ref.id ? null : ref.id)} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center"><span className="text-xs font-bold text-emerald-400">L1</span></div>
                      <div className="text-left"><div className="text-sm font-bold">{ref.name}</div><div className="text-[10px] text-slate-500">{ref.email}</div></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-bold text-emerald-300">$50</span>
                      {expandedLevel === ref.id ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>
                  {expandedLevel === ref.id && (
                    <div className="px-4 pb-4 border-t border-white/5 pt-3">
                      {tree.level2.filter((l: any) => l.parent === ref.name).map((l2: any, j: number) => (
                        <div key={j} className="flex items-center gap-3 py-2 pl-6">
                          <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center"><span className="text-[8px] font-bold text-cyan-400">L2</span></div>
                          <div className="text-left"><div className="text-xs font-bold">{l2.name}</div><div className="text-[9px] text-slate-500">{l2.email}</div></div>
                          <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[9px] font-bold text-cyan-300 ml-auto">$10</span>
                        </div>
                      ))}
                      {tree.level2.filter((l: any) => l.parent === ref.name).length === 0 && <p className="text-[10px] text-slate-600 pl-6">No level 2 referrals yet</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4">Top Referrers</h3>
        <div className="space-y-2">
          {leaderboard.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${idx < 3 ? "bg-yellow-500/20 text-yellow-400" : "bg-white/5 text-slate-500"}`}>{idx + 1}</span>
                <span className="text-sm">{item.name}</span>
              </div>
              <span className="text-xs text-slate-400">{item.count} referrals</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

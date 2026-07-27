import React, { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage";
import PaymentFlow from "./components/PaymentFlow";
import UserDashboard from "./components/UserDashboard";
import AdminPanel from "./components/AdminPanel";
import HelpPage from "./components/HelpPage";
import SupportWidget from "./components/SupportWidget";
import { VehiclesPage } from "./components/pages/VehiclesPage";
import { Home, Compass, HelpCircle, LogOut, User, Shield, Bell, Zap, Menu, X, UserCheck, Car, Gift, Award, MapPin, Gamepad2, DollarSign, BarChart3, Settings, Users, CreditCard, MessageSquare, Sparkles, LayoutDashboard, Search, HeartHandshake, Grid3X3, Camera, Crown, TrendingUp, Map, Navigation, Mail, Smartphone, Wallet, QrCode, Copy, Check, RefreshCw, ExternalLink } from "lucide-react";
import AIChatWidget from "./components/AIChatWidget";

export default function App() {
  const [currentView, setCurrentView] = useState<"landing" | "vehicles" | "payment" | "dashboard" | "admin" | "help">("landing");
  const [viewParams, setViewParams] = useState<any>(null);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [charityAmount, setCharityAmount] = useState(500450.0);
  const [appName, setAppName] = useState("BYD Horizon Club");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsScrolled, setTermsScrolled] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("byd_horizon_token");
    const savedUser = localStorage.getItem("byd_horizon_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        const u = JSON.parse(savedUser);
        setUser(u);
        if (u.is_admin) { setCurrentView("dashboard"); if (!localStorage.getItem("byd_terms_accepted")) setShowTerms(true); }
        else { setCurrentView("dashboard"); if (!localStorage.getItem("byd_terms_accepted")) setShowTerms(true); }
      } catch {
        localStorage.removeItem("byd_horizon_token");
        localStorage.removeItem("byd_horizon_user");
      }
    }
  }, []);

  useEffect(() => {
    if (token && !user?.is_admin) {
      fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          setNotifications(Array.isArray(d) ? d.slice(0, 5) : []);
          setUnreadCount(Array.isArray(d) ? d.filter((n: any) => !n.is_read).length : 0);
        })
        .catch(() => {});
    }
  }, [token, currentView]);

  const handleNavigate = (view: "landing" | "vehicles" | "payment" | "dashboard" | "admin" | "help", params?: any) => {
    setViewParams(params);
    if (token && view === "landing") { setCurrentView("dashboard"); return; }
    if (view === "payment" && token) { setCurrentView("dashboard"); return; }
    setCurrentView(view);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAdminEmblemClick = () => {
    const n = adminClickCount + 1;
    if (n >= 5) {
      setAdminClickCount(0);
      setShowAdminLogin(true);
    } else {
      setAdminClickCount(n);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginLoading(true);
    setAdminLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPass }),
      });
      const json = await res.json();
      if (res.ok && json.user?.is_admin) {
        handleLoginSuccess(json.token, json.user);
        setShowAdminLogin(false);
        setAdminEmail("");
        setAdminPass("");
        handleNavigate("admin");
      } else if (res.ok) {
        setAdminLoginError("This account is not an admin.");
      } else {
        setAdminLoginError(json.error || "Login failed");
      }
    } catch {
      setAdminLoginError("Connection error");
    } finally {
      setAdminLoginLoading(false);
    }
  };

  const handleLoginSuccess = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("byd_horizon_token", newToken);
    localStorage.setItem("byd_horizon_user", JSON.stringify(newUser));
    setCurrentView("dashboard");
    if (!localStorage.getItem("byd_terms_accepted")) setShowTerms(true);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("byd_horizon_token");
    localStorage.removeItem("byd_horizon_user");
    setCurrentView("landing");
  };

  const sidebarItems = [
    { icon: BarChart3, label: "Dashboard", view: "dashboard" as const, tab: "dashboard" },
    { icon: Grid3X3, label: "Showroom", view: "vehicles" as const },
    { icon: Car, label: "Rent a Vehicle", view: "dashboard" as const, tab: "rent" },
    { icon: MapPin, label: "Tracking & Transit", view: "dashboard" as const, tab: "tracking" },
    { icon: TrendingUp, label: "Financial Hub", view: "dashboard" as const, tab: "finance" },
    { icon: MessageSquare, label: "Help Center", view: "dashboard" as const, tab: "help" },
    { icon: Gamepad2, label: "Games", view: "dashboard" as const, tab: "games" },
    { icon: Users, label: "Referrals", view: "dashboard" as const, tab: "referrals" },
    { icon: Gift, label: "Rewards", view: "dashboard" as const, tab: "rewards" },
    { icon: UserCheck, label: "KYC", view: "dashboard" as const, tab: "kyc" },
    { icon: Settings, label: "Settings", view: "dashboard" as const, tab: "settings" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-sans flex flex-col">
      {/* Ticker */}
      <div className="h-7 bg-[#0d1117] flex items-center px-4 overflow-hidden border-b border-white/5 select-none">
        <div className="w-full overflow-hidden whitespace-nowrap">
          <div className="text-[9px] uppercase tracking-widest font-bold font-mono whitespace-nowrap animate-marquee inline-block text-[#00e5ff]">
            ✦ {appName.toUpperCase()} • THE WORLD'S FIRST DECENTRALIZED EV COLLECTIVE • OWN THE FUTURE • DRIVE THE PRESENT • EARN THE DIFFERENCE ✦ &nbsp;
            ✦ {appName.toUpperCase()} • THE WORLD'S FIRST DECENTRALIZED EV COLLECTIVE • OWN THE FUTURE • DRIVE THE PRESENT • EARN THE DIFFERENCE ✦ &nbsp;
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="border-b border-white/5 bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <button onClick={() => handleNavigate(token ? "dashboard" : "landing")} className="flex items-center space-x-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-[#00e5ff] to-[#10b981] rounded-lg flex items-center justify-center font-black italic text-[#0a0e1a] text-xs">B</div>
            <span className="text-base font-black tracking-tighter uppercase text-white font-display">{appName}</span>
          </button>
          <div className="hidden md:flex items-center space-x-1">
            {!token && (
              <>
                <button onClick={() => handleNavigate("vehicles")} className="px-3 py-1.5 text-white/60 hover:text-white text-xs font-mono tracking-wide uppercase hover:bg-white/5 rounded-lg transition">Showroom</button>
                <button onClick={() => handleNavigate("help")} className="px-3 py-1.5 text-white/60 hover:text-white text-xs font-mono tracking-wide uppercase hover:bg-white/5 rounded-lg transition">Help</button>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {token && !user?.is_admin && (
              <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="relative p-2 rounded-lg hover:bg-white/5 transition">
                <Bell className="w-4 h-4 text-white/70" />
                {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#00e5ff] text-[#0a0e1a] text-[8px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>}
              </button>
            )}
            {token ? (
              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex items-center space-x-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-mono text-white/60 uppercase">{user?.name || "User"}</span>
                </div>
                {token && !user?.is_admin && (
                  <button onClick={() => handleNavigate("help")} className="hidden sm:inline-flex px-3 py-1.5 text-white/60 hover:text-white text-xs font-mono tracking-wide uppercase hover:bg-white/5 rounded-lg transition">Help</button>
                )}
                {token && (
                  <button onClick={() => handleNavigate("dashboard")} className="px-3 py-1.5 bg-white/5 text-white/80 border border-white/10 rounded-lg text-xs font-bold font-mono uppercase tracking-wider hover:bg-white/10 transition">Portal</button>
                )}
                <button onClick={handleLogout} className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg transition"><LogOut className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button onClick={() => handleNavigate("help")} className="hidden sm:inline-flex px-3 py-1.5 text-white/60 hover:text-white text-xs font-mono tracking-wide uppercase hover:bg-white/5 rounded-lg transition">Help</button>
                <button onClick={() => handleNavigate("payment")} className="px-4 py-1.5 bg-[#00e5ff] text-[#0a0e1a] text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#00e5ff]/90 transition font-mono">Join the Club</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Dashboard Layout */}
      {token && !user?.is_admin && currentView === "dashboard" ? (
        <div className="flex flex-1">
          {/* Mobile sidebar toggle */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="fixed bottom-4 left-4 z-50 lg:hidden bg-[#00e5ff] text-[#0a0e1a] p-3 rounded-full shadow-lg shadow-[#00e5ff]/20">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {/* Sidebar */}
          <aside className={`fixed lg:sticky top-0 left-0 h-screen w-56 bg-[#0d1117]/95 backdrop-blur-xl border-r border-white/5 z-40 transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} pt-4`}>
            <div className="px-4 pb-4 border-b border-white/5 mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-[#00e5ff] to-[#10b981] rounded-xl flex items-center justify-center font-black italic text-[#0a0e1a] text-sm">B</div>
                <div>
                  <p className="text-sm font-bold font-display">{user?.name?.split(" ")[0] || "Member"}</p>
                  <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest">{(user?.membership_tier || "standard").toUpperCase()}</p>
                </div>
              </div>
            </div>
            <nav className="px-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-200px)]">
              {sidebarItems.map((item, i) => (
                <button key={i} onClick={() => { setShowNotifPanel(false); handleNavigate(item.view, item.tab ? { tab: item.tab } : undefined); }} className="flex items-center space-x-2.5 w-full px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition font-mono tracking-wide">
                  <item.icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
          {/* Notification panel */}
          {showNotifPanel && (
            <div className="fixed top-16 right-4 w-80 bg-[#0d1117] border border-white/10 rounded-xl shadow-2xl z-50 backdrop-blur-xl">
              <div className="p-3 border-b border-white/5 flex justify-between items-center">
                <span className="text-xs font-bold font-mono uppercase tracking-wider">Notifications</span>
                <button onClick={() => setShowNotifPanel(false)} className="text-white/40 hover:text-white"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-white/40 p-4 text-center">No notifications</p>
                ) : notifications.map((n: any) => (
                  <div key={n.id} className={`p-3 border-b border-white/5 hover:bg-white/5 transition ${!n.is_read ? 'bg-[#00e5ff]/5' : ''}`}>
                    <p className="text-xs font-medium text-white/80">{n.title || "Update"}</p>
                    <p className="text-[10px] text-white/40 mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            <UserDashboard authToken={token!} onNavigate={handleNavigate} initialTab={viewParams?.tab} />
          </main>
        </div>
      ) : (
        <main className="flex-1">
          {currentView === "landing" && <LandingPage onNavigate={handleNavigate} charityAmount={charityAmount} setCharityAmount={setCharityAmount} />}
          {currentView === "vehicles" && <VehiclesPage onNavigate={handleNavigate} />}
          {currentView === "payment" && <PaymentFlow initialPlan={viewParams?.planType} onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />}
          {currentView === "dashboard" && <UserDashboard authToken={token!} onNavigate={handleNavigate} />}
          {currentView === "admin" && <AdminPanel onNavigate={handleNavigate} initialToken={token || ""} initialIsAdmin={!!user?.is_admin} />}
          {currentView === "help" && <HelpPage onNavigate={handleNavigate} />}
        </main>
      )}

      {/* Footer for non-dashboard views */}
      {!(token && currentView === "dashboard") && (
        <footer className="border-t border-white/5 bg-[#0d1117]/80 backdrop-blur-md py-8 px-4">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-[#00e5ff] rounded flex items-center justify-center font-bold italic text-[#0a0e1a] text-[9px]">B</div>
                <span className="text-sm font-bold tracking-tight text-white uppercase font-display">{appName}</span>
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed">The World's First Decentralized EV Collective.</p>
            </div>
            <div><h5 className="text-[9px] uppercase font-mono tracking-widest text-white/40 font-bold mb-2">Showroom</h5><div className="space-y-1 text-[10px] text-white/40"><button onClick={() => handleNavigate("vehicles")} className="hover:text-[#00e5ff] bg-transparent border-none p-0 cursor-pointer">BYD Seal</button><button onClick={() => handleNavigate("vehicles")} className="hover:text-[#00e5ff] bg-transparent border-none p-0 cursor-pointer">BYD Han</button><button onClick={() => handleNavigate("vehicles")} className="hover:text-[#00e5ff] bg-transparent border-none p-0 cursor-pointer">BYD Atto 3</button></div></div>
            <div><h5 className="text-[9px] uppercase font-mono tracking-widest text-white/40 font-bold mb-2">Resources</h5><div className="space-y-1 text-[10px] text-white/40"><button onClick={() => handleNavigate("help")} className="hover:text-[#00e5ff] bg-transparent border-none p-0 cursor-pointer">Help Center</button><p>Privacy Policy</p><p>Terms of Service</p></div></div>
            <div className="text-right space-y-2">
              <button onClick={handleAdminEmblemClick} className="flex items-center gap-2 ml-auto opacity-40 hover:opacity-100 transition cursor-pointer bg-transparent border-none">
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                  <svg viewBox="0 0 24 24" width="14" height="14"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                </div>
                <span className="text-[8px] text-white/30 font-mono">[{adminClickCount}/5]</span>
              </button>
              <button onClick={handleAdminEmblemClick} className="flex items-center gap-2 ml-auto opacity-20 hover:opacity-60 transition cursor-pointer bg-transparent border-none blur-[0.5px] hover:blur-none">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <span className="text-[8px] font-black text-white italic">J</span>
                </div>
                <span className="text-[8px] text-white/20 font-mono">Studio</span>
              </button>
            </div>
          </div>
          <div className="max-w-7xl mx-auto pt-4 border-t border-white/5 flex justify-between items-center text-[9px] text-white/30 font-mono">
            <span>&copy; {new Date().getFullYear()} {appName}. All rights reserved.</span>
            <span>Own the future. Drive the present. Earn the difference.</span>
          </div>
        </footer>
      )}

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowAdminLogin(false)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Admin Access</h2>
              <button onClick={() => setShowAdminLogin(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              {adminLoginError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-300">{adminLoginError}</div>}
              <div>
                <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Email</label>
                <input type="email" required value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" placeholder="admin@bydhorizon.com" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Password</label>
                <input type="password" required value={adminPass} onChange={e => setAdminPass(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" placeholder="••••••••" />
              </div>
              <button type="submit" disabled={adminLoginLoading} className="w-full py-3 bg-[#00e5ff] text-[#0a0e1a] text-sm font-bold uppercase tracking-wider rounded-xl hover:bg-[#00e5ff]/90 transition font-mono disabled:opacity-40">
                {adminLoginLoading ? "Authenticating..." : "Access Admin Panel"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Terms & Conditions Popup */}
      {showTerms && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><Shield className="w-5 h-5 text-cyan-400" /></div>
                <div>
                  <h2 className="text-lg font-bold">Terms & Conditions</h2>
                  <p className="text-[10px] text-slate-500 font-mono">BYD Horizon Club — Please read carefully</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-400 leading-relaxed" onScroll={e => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) setTermsScrolled(true); }}>
              <div><h3 className="text-sm font-bold text-white mb-1">1. Platform Overview</h3><p>BYD Horizon Club is an exclusive electric vehicle membership and investment platform. All vehicle purchases, rentals, investments, and rewards operate within the Horizon Club ecosystem. Vehicle delivery timelines are estimates and subject to change.</p></div>
              <div><h3 className="text-sm font-bold text-white mb-1">2. KYC Requirements</h3><p>Identity verification (KYC) is required before making deposits, placing orders, or withdrawing funds. You must provide valid government-issued identification and proof of address. Failure to complete KYC may result in account limitations.</p></div>
              <div><h3 className="text-sm font-bold text-white mb-1">3. Payment Terms</h3><p>We accept cryptocurrency (USDT, BTC, ETH), Paystack, Stripe, PayPal, and bank transfers. Cryptocurrency payments are recommended for fastest processing. All payments are final once confirmed on the blockchain or by our payment processors.</p></div>
              <div><h3 className="text-sm font-bold text-white mb-1">4. Cryptocurrency Disclaimer</h3><p>Cryptocurrency transactions are irreversible. Always verify wallet addresses before sending. BYD Horizon Club is not responsible for funds sent to incorrect addresses. Gas fees apply to all crypto transactions.</p></div>
              <div><h3 className="text-sm font-bold text-white mb-1">5. Privacy Policy</h3><p>We collect personal information for KYC verification, payment processing, and platform improvement. Your data is encrypted and stored securely. We do not sell personal data to third parties.</p></div>
              <div><h3 className="text-sm font-bold text-white mb-1">6. Refund Policy</h3><p>Refund requests must be submitted within 14 days of payment. Approved refunds are processed to the original payment method within 5-10 business days. Crypto refunds are sent to the originating wallet address.</p></div>
              <div><h3 className="text-sm font-bold text-white mb-1">7. Referral Terms</h3><p>Referral rewards are earned when referred users complete KYC and make their first qualifying payment. Direct referrals earn $50. Indirect referrals (level 2-3) earn reduced amounts. Self-referrals are prohibited.</p></div>
              <div><h3 className="text-sm font-bold text-white mb-1">8. Elite Membership</h3><p>Elite membership is a premium subscription offering exclusive benefits. Benefits may be modified with 30 days notice. Membership auto-renews unless cancelled 7 days before renewal date.</p></div>
              <div><h3 className="text-sm font-bold text-white mb-1">9. Investment Risk Disclaimer</h3><p>Investments in BYD Horizon Club carry risk. Past performance does not guarantee future returns. Projected returns are estimates based on market conditions and may vary. You may lose part or all of your investment.</p></div>
              <div><h3 className="text-sm font-bold text-white mb-1">10. Charity Contributions</h3><p>Charity donations made through Horizon Points are non-refundable. BYD Horizon Club partners with verified charitable organizations. Tree planting and environmental impact are tracked and reported quarterly.</p></div>
            </div>
            <div className="p-6 border-t border-white/5">
              <label className="flex items-start gap-3 mb-4 cursor-pointer">
                <input type="checkbox" checked={termsScrolled} onChange={() => {}} disabled className="mt-0.5 accent-cyan-500" />
                <span className="text-xs text-slate-400">I have read, understood, and agree to the Terms & Conditions, Privacy Policy, and all platform policies.</span>
              </label>
              <button disabled={!termsScrolled} onClick={() => { localStorage.setItem("byd_terms_accepted", "true"); setShowTerms(false); setTermsScrolled(false); }} className="w-full py-3 bg-[#00e5ff] text-[#0a0e1a] text-sm font-bold uppercase tracking-wider rounded-xl hover:bg-[#00e5ff]/90 transition font-mono disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                Accept & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {token && !user?.is_admin && <AIChatWidget token={token} />}
      <SupportWidget />
    </div>
  );
}

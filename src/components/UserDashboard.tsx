import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Map, Grid3X3, Users, Gift, Gamepad2, Car, Truck, Leaf, Trophy, FileCheck, ShieldCheck, HeadphonesIcon, Settings, Copy, Check, RefreshCw, Award, Flame, Zap, X, Eye, EyeOff, Camera, Upload, Video, ChevronRight, ExternalLink, Clock, MapPin, Gauge, Compass, Wallet, CreditCard, Lock, Unlock, Sparkles, AlertTriangle, CheckCircle, Download, ArrowUpRight, Search, ChevronLeft, ChevronDown, LogOut, Bell, DollarSign, Filter, Star, Plus, Minus, Edit, Trash2, Share2, BarChart3, Cpu, Navigation, Signal, Package, Ship, Anchor, Plane, CircleDot, Crosshair, QrCode, Ticket, Banknote, Gem, HeartHandshake, HandCoins, Leaf as LeafIcon, TreePine, BadgeCheck, CircleCheck, BookOpen, CircleUser, MessageSquare, HelpCircle, ThumbsUp, Calendar, Coins, Info, Moon, Sun, Smartphone, Mail, Phone, Globe, Palette, Hash, Loader2, UserCheck, ShieldAlert, ZapOff, ArrowLeft, RotateCcw, Play, Pause, TimerReset, ChevronsRight, ChevronsLeft, ArrowRight, Send, Paperclip, FileImage, Image, Mic, Volume2, VolumeX, Wifi, WifiOff, BatteryFull, BatteryLow, SignalHigh, SignalLow, Disc, SlidersHorizontal, List, Columns, Activity, TrendingUp, Users2, CircleDollarSign, PiggyBank, Target, Swords, PartyPopper, BellRing, Lightbulb, Construction, Clover, Diamond, Crown, Medal, Music, Radio, Tv, SunDim, Eclipse, Contrast, SwatchBook, Brush, Eraser, Scissors, Eye as EyeIcon, FolderOpen, Folder, HardDrive, Laptop, MonitorSmartphone, TabletSmartphone, MousePointerClick, ArrowUpFromLine, ArrowDownToLine, ArrowUpWideNarrow, ArrowDownWideNarrow, Timer, Hourglass, AlarmClockCheck, AlarmClockPlus, AlarmClockOff, Waves, WavesLadder, ShipWheel, Sailboat, Container, Palette as PaletteIcon, Megaphone, Newspaper } from "lucide-react";
import { DashboardData, RewardItem } from "../types";
import { NotificationBell } from "./ui/NotificationBell";
import { DailyCheckin } from "./gamification/DailyCheckin";
import { SpinWheel } from "./gamification/SpinWheel";
import { BYDQuiz } from "./gamification/BYDQuiz";
import { CarInspectSection } from "./cars/CarInspectSection";
import { LiveTrackingMap } from "./map/LiveTrackingMap";
import { LiveWebcamGrid } from "./live/LiveWebcamGrid";
import { TransitUpdatePanel } from "./dashboard/TransitUpdatePanel";
import { EnvironmentFeed } from "./live/EnvironmentFeed";
import { RentVehiclePage } from "./rental/RentVehiclePage";
import { InvestPage } from "./investment/InvestPage";
import { ReferralTreeSection } from "./referrals/ReferralTreeSection";

interface UserDashboardProps {
  authToken: string;
  onNavigate: (view: string, params?: any) => void;
  initialTab?: string;
}

const TAB_ICONS: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="w-4 h-4" />,
  tracking: <Map className="w-4 h-4" />,
  showroom: <Grid3X3 className="w-4 h-4" />,
  inspect: <Search className="w-4 h-4" />,
  referrals: <Users className="w-4 h-4" />,
  rewards: <Gift className="w-4 h-4" />,
  donations: <HeartHandshake className="w-4 h-4" />,
  outreach: <Megaphone className="w-4 h-4" />,
  gamification: <Gamepad2 className="w-4 h-4" />,
  drive2earn: <Car className="w-4 h-4" />,
  mysterycar: <Truck className="w-4 h-4" />,
  carbon: <Leaf className="w-4 h-4" />,
  lottery: <Trophy className="w-4 h-4" />,
  kyc: <FileCheck className="w-4 h-4" />,
  insurance: <ShieldCheck className="w-4 h-4" />,
  support: <HeadphonesIcon className="w-4 h-4" />,
  webcams: <Camera className="w-4 h-4" />,
  rent: <Car className="w-4 h-4" />,
  invest: <TrendingUp className="w-4 h-4" />,
  transit: <Navigation className="w-4 h-4" />,
  blog: <Newspaper className="w-4 h-4" />,
  elite: <Crown className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
};

export default function UserDashboard({ authToken, onNavigate, initialTab }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState(initialTab || "dashboard");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) setActiveTab(initialTab);
  }, [initialTab]);
  const [hideBalances, setHideBalances] = useState(() => localStorage.getItem("byd_hide_balances") === "true");
  const [copied, setCopied] = useState("");

  const handleToggleHideBalances = () => {
    setHideBalances(p => { const n = !p; localStorage.setItem("byd_hide_balances", String(n)); return n; });
  };

  const formatBalance = (val: number, isCurrency = true) => {
    if (hideBalances) {
      const str = val.toString();
      let hash = 0;
      for (let i = 0; i < str.length; i++) { hash = (hash << 5) - hash + str.charCodeAt(i); hash &= hash; }
      return `[HASH:${Math.abs(hash).toString(16).substring(0, 6).toUpperCase()}]`;
    }
    return isCurrency ? `$${val.toFixed(2)} USD` : `${val.toLocaleString()} pts`;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  };

  const loadSummaryData = async () => {
    try {
      const res = await fetch("/api/dashboard/summary", { headers: { Authorization: `Bearer ${authToken}` } });
      const json = await res.json();
      if (res.ok) setData(json);
      else { alert(json.error || "Auth failed"); onNavigate("landing"); }
    } catch { console.error("fetch error"); }
    finally { setLoading(false); }
  };

  const fetchWithAuth = async (url: string, method = "GET", body?: any) => {
    const opts: RequestInit = { method, headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    return res;
  };

  const [checkinStatus, setCheckinStatus] = useState<{ checked_in: boolean; streak: number; next_reward: number } | null>(null);

  useEffect(() => {
    loadSummaryData();
    fetch("/api/checkin/status", { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json()).then(j => setCheckinStatus(j)).catch(() => {});
  }, [authToken]);

  useEffect(() => { if (data?.user) {
    setSettingsName(data.user.name || "");
    setSettingsPhone(data.user.phone || "");
    setSettingsCity(data.user.city || "");
    setSettingsCountry(data.user.country || "");
    setSettingsWallet(data.user.crypto_wallet_address || "");
    setSettingsIncognito(!!data.user.is_incognito);
  }}, [data?.user?.id]);

  // rewards
  const [rewardsList, setRewardsList] = useState<RewardItem[]>([]);
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/rewards/items").then(r => r.json()).then(d => setRewardsList(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const handleRedeem = async (itemId: number) => {
    setRedeemMsg(null);
    try {
      const res = await fetchWithAuth("/api/rewards/redeem", "POST", { itemId });
      const json = await res.json();
      if (res.ok) { setRedeemMsg(`${json.message} Ref: ${json.tracking_number}`); loadSummaryData(); }
      else alert(json.error || "Redeem failed");
    } catch { alert("Network error"); }
  };

  // KYC
  const [kycStep, setKycStep] = useState(0);
  const [kycForm, setKycForm] = useState({ name: "", dob: "", nationality: "US", idNumber: "", idFront: "", idBack: "", addressProof: "", selfie: "", sourceOfFunds: "", annualIncome: "", investmentExperience: "" });
  const [kycFiles, setKycFiles] = useState<Record<string, string>>({});
  const [kycLoading, setKycLoading] = useState(false);
  const [kycMsg, setKycMsg] = useState<string | null>(null);
  const [kycError, setKycError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);

  const handleFileChange = (field: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") setKycFiles(p => ({...p, [field]: reader.result})); };
    reader.readAsDataURL(file);
  };

  const startWebcam = async () => {
    try { const stream = await navigator.mediaDevices.getUserMedia({ video: true }); setWebcamStream(stream); setWebcamActive(true); if (videoRef.current) videoRef.current.srcObject = stream; }
    catch { alert("Webcam access denied or unavailable"); }
  };

  const captureSelfie = () => {
    if (videoRef.current && webcamStream) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.drawImage(videoRef.current, 0, 0); setKycFiles(p => ({...p, selfie: canvas.toDataURL("image/jpeg")})); }
      webcamStream.getTracks().forEach(t => t.stop());
      setWebcamStream(null); setWebcamActive(false);
    }
  };

  const handleKycSubmit = async () => {
    setKycLoading(true); setKycMsg(null); setKycError(null);
    try {
      const res = await fetchWithAuth("/api/kyc/submit", "POST", { name: kycForm.name, dob: kycForm.dob, nationality: kycForm.nationality, idNumber: kycForm.idNumber, idFront: kycFiles.idFront || "", idBack: kycFiles.idBack || "", selfie: kycFiles.selfie || "", addressProof: kycFiles.addressProof || "", sourceOfFunds: kycForm.sourceOfFunds, annualIncome: kycForm.annualIncome, investmentExperience: kycForm.investmentExperience });
      const json = await res.json();
      if (res.ok) { setKycMsg("KYC submitted successfully! Pending review."); loadSummaryData(); }
      else setKycError(json.error || "KYC submission failed");
    } catch { setKycError("Connection error"); }
    finally { setKycLoading(false); }
  };

  // Drive to Earn
  const [driveMiles, setDriveMiles] = useState("");
  const [driveCharging, setDriveCharging] = useState("");
  const [driveResult, setDriveResult] = useState<{ points_earned: number; new_points: number } | null>(null);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveLeaderboard, setDriveLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/drive-to-earn/leaderboard", { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json()).then(d => setDriveLeaderboard(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const handleDriveLog = async (e: React.FormEvent) => {
    e.preventDefault(); setDriveLoading(true); setDriveResult(null);
    try {
      const res = await fetchWithAuth("/api/drive-to-earn/log", "POST", { miles_driven: parseFloat(driveMiles), charging_time: parseFloat(driveCharging) });
      const json = await res.json();
      if (res.ok) { setDriveResult(json); loadSummaryData(); }
      else alert(json.error || "Log failed");
    } catch { alert("Network error"); }
    finally { setDriveLoading(false); }
  };

  // Mystery Car
  const [mysterySubLoading, setMysterySubLoading] = useState(false);

  const handleMysterySubscribe = async () => {
    setMysterySubLoading(true);
    try {
      const res = await fetchWithAuth("/api/mystery-car/subscribe", "POST");
      const json = await res.json();
      if (res.ok) { alert(json.message || "Subscribed!"); loadSummaryData(); }
      else alert(json.error || "Failed");
    } catch { alert("Error"); }
    finally { setMysterySubLoading(false); }
  };

  const handleMysteryUnsubscribe = async () => {
    setMysterySubLoading(true);
    try {
      const res = await fetchWithAuth("/api/mystery-car/unsubscribe", "POST");
      const json = await res.json();
      if (res.ok) { alert(json.message || "Unsubscribed!"); loadSummaryData(); }
      else alert(json.error || "Failed");
    } catch { alert("Error"); }
    finally { setMysterySubLoading(false); }
  };

  // Carbon Offset
  const [carbonStats, setCarbonStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/carbon-offset/stats", { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json()).then(d => setCarbonStats(d)).catch(() => {});
  }, []);

  // Lottery
  const [lotteryStatus, setLotteryStatus] = useState<any>(null);

  useEffect(() => {
    fetch("/api/lottery/status", { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json()).then(d => setLotteryStatus(d)).catch(() => {});
  }, []);

  // Insurance
  const [insuranceLoading, setInsuranceLoading] = useState(false);

  const handlePurchaseInsurance = async (planName: string, premium: number, coverage: number) => {
    setInsuranceLoading(true);
    const carModel = data?.activeVehicle?.model || "BYD Seal";
    try {
      const res = await fetchWithAuth("/api/insurance/purchase", "POST", { carModel, planName, premium, coverage_limit: coverage });
      const json = await res.json();
      if (res.ok) { alert(json.message || "Insurance purchased!"); loadSummaryData(); }
      else alert(json.error || "Purchase failed");
    } catch { alert("Error"); }
    finally { setInsuranceLoading(false); }
  };

  // Support
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([{ sender: "agent", text: "Welcome to BYD Horizon Support! How can we help you today?", time: "Just now" }]);
  const [chatInput, setChatInput] = useState("");

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSupportLoading(true);
    try {
      const res = await fetchWithAuth("/api/tickets/create", "POST", { subject: supportSubject, message: supportMessage });
      const json = await res.json();
      if (res.ok) { alert("Ticket created! We'll get back to you soon."); setSupportSubject(""); setSupportMessage(""); }
      else alert(json.error || "Failed");
    } catch { alert("Error"); }
    finally { setSupportLoading(false); }
  };

  // Settings
  const [settingsName, setSettingsName] = useState("");
  const [settingsPhone, setSettingsPhone] = useState("");
  const [settingsCity, setSettingsCity] = useState("");
  const [settingsCountry, setSettingsCountry] = useState("");
  const [settingsWallet, setSettingsWallet] = useState("");
  const [settingsIncognito, setSettingsIncognito] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSettingsLoading(true); setSettingsMsg(null);
    try {
      const res = await fetchWithAuth("/api/user/settings/update", "POST", { name: settingsName, phone: settingsPhone, city: settingsCity, country: settingsCountry, crypto_wallet_address: settingsWallet, is_incognito: settingsIncognito });
      const json = await res.json();
      if (res.ok) { setSettingsMsg("Settings updated!"); loadSummaryData(); }
      else alert(json.error || "Failed");
    } catch { alert("Error"); }
    finally { setSettingsLoading(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setPasswordLoading(true); setPasswordMsg(null);
    try {
      const res = await fetchWithAuth("/api/user/change-password", "POST", { old_password: oldPassword, new_password: newPassword });
      const json = await res.json();
      if (res.ok) { setPasswordMsg("Password changed!"); setOldPassword(""); setNewPassword(""); }
      else setPasswordMsg(json.error || "Failed");
    } catch { setPasswordMsg("Error"); }
    finally { setPasswordLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] bg-[#0a0e1a]">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Loading Horizon Dashboard...</span>
      </div>
    </div>
  );

  if (!data) return null;

  const user = data.user;
  const mc = data.mysteryCar;

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <header className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Welcome, {user.name}</h1>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                <span className={`px-2 py-0.5 rounded-full ${user.membership_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border border-slate-500/20"}`}>
                  {user.membership_tier || "Standard"}
                </span>
                <span>ID: #{user.id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={handleToggleHideBalances} className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition cursor-pointer">
              {hideBalances ? <Eye className="w-4 h-4 text-cyan-400" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
            </button>
            <NotificationBell authToken={authToken} />
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-mono uppercase">Points</span>
              <div className="text-lg font-bold text-cyan-400 font-mono">{formatBalance(user.horizon_points || 0, false)}</div>
            </div>
            <div className="text-right pl-4 border-l border-white/10">
              <span className="text-[10px] text-slate-500 font-mono uppercase">Balance</span>
              <div className="text-lg font-bold text-emerald-400 font-mono">{formatBalance(user.balance || 0)}</div>
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div className="animate-fade-in">

          {/* ==================== DASHBOARD ==================== */}
          {activeTab === "dashboard" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
              {/* User Stats Card */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 col-span-1 lg:col-span-1 row-span-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Account</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${user.kyc_status === "verified" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                      {user.kyc_status === "verified" ? "Verified" : "Unverified"}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono">Points</span>
                      <div className="text-2xl font-bold text-cyan-400 font-mono">{formatBalance(user.horizon_points || 0, false)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono">Wallet Balance</span>
                      <div className="text-xl font-bold text-emerald-400 font-mono">{formatBalance(user.balance || 0)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono">Tier</span>
                      <div className="text-lg font-bold font-mono">{user.membership_tier || "Standard"}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <span className="text-[10px] text-slate-500 font-mono block mb-2">Referral Code</span>
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
                    <code className="flex-1 text-xs font-mono text-cyan-300">{user.referral_code}</code>
                    <button onClick={() => copyToClipboard(user.referral_code, "ref-code")} className="p-1.5 hover:bg-white/10 rounded-lg transition cursor-pointer">
                      {copied === "ref-code" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Vehicle Card */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 col-span-1 lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Active Vehicle</span>
                  <Car className="w-4 h-4 text-cyan-400" />
                </div>
                {data.activeVehicle ? (
                  <div className="space-y-2">
                    <div className="text-lg font-bold">{data.activeVehicle.model}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>Delivery: {data.activeVehicle.expectedDeliveryDate}</span>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 mt-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-cyan-400">{data.tracking ? data.tracking.route_index : 0}%</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${data.tracking ? data.tracking.route_index : 0}%` }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No active vehicle</div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 col-span-1 lg:col-span-1">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono block mb-3">Quick Stats</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <div className="text-lg font-bold font-mono">{data.referralStats.paidCount}</div>
                    <div className="text-[10px] text-slate-500">Referrals</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                    <div className="text-lg font-bold font-mono">{user.daily_streak || 0}</div>
                    <div className="text-[10px] text-slate-500">Day Streak</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center col-span-2">
                    <LeafIcon className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                    <div className="text-lg font-bold font-mono">{user.carbon_lbs_saved || 0}</div>
                    <div className="text-[10px] text-slate-500">Lbs CO₂ Saved</div>
                  </div>
                </div>
              </div>

              {/* Daily Checkin */}
              <div className="col-span-1 lg:col-span-1">
                <DailyCheckin authToken={authToken} points={user.horizon_points || 0} onCheckinSuccess={(np) => setData(p => p ? { ...p, user: { ...p.user, horizon_points: np } } : null)} />
              </div>

              {/* Spin Wheel */}
              <div className="col-span-1 lg:col-span-1">
                <SpinWheel authToken={authToken} onSpinSuccess={(np) => setData(p => p ? { ...p, user: { ...p.user, horizon_points: np } } : null)} />
              </div>

              {/* Quiz */}
              <div className="col-span-1 lg:col-span-1">
                <BYDQuiz authToken={authToken} onQuizSuccess={(np) => setData(p => p ? { ...p, user: { ...p.user, horizon_points: np } } : null)} />
              </div>

              {/* Membership Card */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 col-span-1 lg:col-span-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono block mb-1">Membership</span>
                    <div className="text-lg font-bold">{user.membership_active ? "Active" : "Inactive"}</div>
                    {user.membership_expiry && <div className="text-xs text-slate-400 mt-1">Expires: {new Date(user.membership_expiry).toLocaleDateString()}</div>}
                  </div>
                  <Crown className={`w-8 h-8 ${user.membership_active ? "text-yellow-400" : "text-slate-600"}`} />
                </div>
              </div>
            </div>
          )}

          {/* ==================== TRACKING ==================== */}
          {activeTab === "tracking" && (
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold">Live Shipping Map</h2>
                    <p className="text-xs text-slate-400">Real-time GPS tracking of your vehicle</p>
                  </div>
                  <Map className="w-6 h-6 text-cyan-400" />
                </div>
                {data.tracking ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-[10px] text-slate-500 font-mono">Route Progress</div>
                        <div className="text-lg font-bold text-cyan-400">{data.tracking.route_index}%</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-[10px] text-slate-500 font-mono">Delays</div>
                        <div className="text-lg font-bold text-amber-400">{data.tracking.delays_encountered}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-[10px] text-slate-500 font-mono">Destination</div>
                        <div className="text-lg font-bold truncate">{data.activeVehicle.destination_city || data.user.city || "N/A"}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-[10px] text-slate-500 font-mono">ETA</div>
                        <div className="text-lg font-bold text-emerald-400">~{Math.max(1, 10 - Math.floor(data.tracking.route_index / 10))}d</div>
                      </div>
                    </div>
                    {data.tracking.delays_encountered > 0 && !data.tracking.expedite_paid && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-400" />
                          <span className="text-sm text-amber-300">{data.tracking.delays_encountered} delay(s) detected</span>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetchWithAuth("/api/payments/create", "POST", { method: "expedite", amount: 49 });
                              const json = await res.json();
                              if (res.ok) alert(`Expedite fee: $49 USDT. Send to: ${json.wallet_address}`);
                              else alert(json.error || "Failed");
                            } catch { alert("Error"); }
                          }}
                          className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-300 transition cursor-pointer"
                        >
                          Expedite Shipping ($49)
                        </button>
                      </div>
                    )}
                    <div className="w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden border border-white/10" id="live-tracking-map-container">
                      <LiveTrackingMap
                        authToken={authToken}
                        routeIndex={data.tracking.route_index}
                        totalStops={data.tracking.total_stops}
                        destinationCity={data.user.city || "New York"}
                        onRefresh={loadSummaryData}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No active vehicle tracking available</p>
                    <p className="text-xs mt-1">Purchase a vehicle to start tracking</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== SHOWROOM ==================== */}
          {activeTab === "showroom" && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">Fleet Showroom</h2>
                  <p className="text-xs text-slate-400">Browse the BYD electric vehicle lineup</p>
                </div>
                <button onClick={() => onNavigate("vehicles")} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer">
                  View Full Fleet <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <ShowroomGrid authToken={authToken} onNavigate={onNavigate} />
            </div>
          )}

          {/* ==================== REFERRALS ==================== */}
          {activeTab === "referrals" && (
            <ReferralTreeSection authToken={authToken} referralStats={data.referralStats} leaderboard={data.leaderboard} formatBalance={formatBalance} copied={copied} copyToClipboard={copyToClipboard} onClaim={async () => { try { const res = await fetchWithAuth("/api/referrals/claim", "POST"); const json = await res.json(); if (res.ok) { alert(json.message || "Claimed!"); loadSummaryData(); } else alert(json.error || "Not yet claimable"); } catch { alert("Error"); } }} />
          )}

          {/* ==================== REWARDS ==================== */}
          {activeTab === "rewards" && (
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold">Rewards Store</h2>
                    <p className="text-xs text-slate-400">Redeem your Horizon Points</p>
                  </div>
                  <Gift className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="flex items-center gap-4 mb-6 bg-white/5 rounded-xl p-4">
                  <Coins className="w-6 h-6 text-yellow-400" />
                  <span className="text-sm">Your Balance: <strong className="text-cyan-400 font-mono">{formatBalance(user.horizon_points || 0, false)}</strong></span>
                </div>
                {redeemMsg && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-2 mb-4 text-sm text-emerald-300">
                    <CheckCircle className="w-5 h-5" /> {redeemMsg}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rewardsList.map(item => (
                    <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col">
                      <div className="aspect-video bg-white/5 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                        {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <Gift className="w-8 h-8 text-slate-600" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold">{item.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-1">{item.description}</p>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                        <span className="text-xs font-mono text-yellow-400">{item.points_cost} pts</span>
                        <button
                          onClick={() => handleRedeem(item.id)}
                          disabled={item.status === "Out of Stock" || (user.horizon_points || 0) < item.points_cost}
                          className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-[10px] text-cyan-300 font-bold disabled:opacity-30 cursor-pointer hover:bg-cyan-500/30 transition"
                        >
                          {item.status === "Out of Stock" ? "Sold Out" : "Redeem"}
                        </button>
                      </div>
                    </div>
                  ))}
                  {rewardsList.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-500">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No rewards available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== GAMIFICATION ==================== */}
          {activeTab === "gamification" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DailyCheckin authToken={authToken} points={user.horizon_points || 0} onCheckinSuccess={(np) => setData(p => p ? { ...p, user: { ...p.user, horizon_points: np } } : null)} />
              <div className="space-y-6">
                <SpinWheel authToken={authToken} onSpinSuccess={(np) => setData(p => p ? { ...p, user: { ...p.user, horizon_points: np } } : null)} />
                <BYDQuiz authToken={authToken} onQuizSuccess={(np) => setData(p => p ? { ...p, user: { ...p.user, horizon_points: np } } : null)} />
              </div>
            </div>
          )}

          {/* ==================== DRIVE TO EARN ==================== */}
          {activeTab === "drive2earn" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold">Drive to Earn</h2>
                    <p className="text-xs text-slate-400">Log miles & charging time for points</p>
                  </div>
                  <Car className="w-6 h-6 text-cyan-400" />
                </div>
                <form onSubmit={handleDriveLog} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Miles Driven</label>
                    <input type="number" step="0.1" required value={driveMiles} onChange={e => setDriveMiles(e.target.value)} placeholder="e.g. 42.5" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40 transition" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Charging Time (hours)</label>
                    <input type="number" step="0.5" required value={driveCharging} onChange={e => setDriveCharging(e.target.value)} placeholder="e.g. 2.5" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40 transition" />
                  </div>
                  <button type="submit" disabled={driveLoading} className="w-full py-3 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-sm font-bold text-cyan-300 hover:bg-cyan-500/30 transition disabled:opacity-40 cursor-pointer">
                    {driveLoading ? "Logging..." : "Log Drive"}
                  </button>
                </form>
                {driveResult && (
                  <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                    <Award className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <div className="text-sm text-emerald-300">+{driveResult.points_earned} points earned!</div>
                  </div>
                )}
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Weekly Leaderboard</h2>
                  <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="space-y-2">
                  {driveLeaderboard.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${idx < 3 ? "bg-yellow-500/20 text-yellow-400" : "bg-white/5 text-slate-500"}`}>{idx + 1}</span>
                        <span className="text-sm">{item.name || `Driver #${item.user_id}`}</span>
                      </div>
                      <span className="text-xs text-cyan-400 font-mono">{item.points_earned || 0} pts</span>
                    </div>
                  ))}
                  {driveLeaderboard.length === 0 && <div className="text-center py-8 text-slate-500">No entries this week</div>}
                </div>
              </div>
            </div>
          )}

          {/* ==================== MYSTERY CAR ==================== */}
          {activeTab === "mysterycar" && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">Mystery Car Subscription</h2>
                  <p className="text-xs text-slate-400">Get a new BYD model every month</p>
                </div>
                <Truck className="w-6 h-6 text-cyan-400" />
              </div>
              {mc && mc.active ? (
                <div className="space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                    <Car className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <div className="text-xl font-bold">{mc.current_car}</div>
                    <div className="text-xs text-slate-400 mt-1">Current Mystery Car</div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-[10px] text-slate-500">Next Delivery</div>
                        <div className="text-sm font-bold">{mc.next_delivery ? new Date(mc.next_delivery).toLocaleDateString() : "N/A"}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-[10px] text-slate-500">Monthly Charge</div>
                        <div className="text-sm font-bold text-amber-400">${mc.monthly_charge}/mo</div>
                      </div>
                    </div>
                  </div>
                  <button onClick={handleMysteryUnsubscribe} disabled={mysterySubLoading} className="w-full py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm font-bold text-red-300 hover:bg-red-500/20 transition cursor-pointer disabled:opacity-40">
                    {mysterySubLoading ? "Processing..." : "Unsubscribe"}
                  </button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Gem className="w-16 h-16 mx-auto mb-4 text-cyan-400/50" />
                  <h3 className="text-lg font-bold mb-2">Not Subscribed</h3>
                  <p className="text-sm text-slate-400 mb-6">Subscribe to receive a mystery BYD car every month</p>
                  <button onClick={handleMysterySubscribe} disabled={mysterySubLoading} className="px-8 py-3 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-sm font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer disabled:opacity-40">
                    {mysterySubLoading ? "Processing..." : "Subscribe Now"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ==================== CARBON OFFSET ==================== */}
          {activeTab === "carbon" && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">Carbon Offset</h2>
                  <p className="text-xs text-slate-400">Track your environmental impact</p>
                </div>
                <Leaf className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                  <TreePine className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold font-mono">{carbonStats?.trees_planted || user.carbon_trees_planted || 0}</div>
                  <div className="text-xs text-slate-400 mt-1">Trees Planted</div>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
                  <LeafIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold font-mono">{carbonStats?.lbs_saved || user.carbon_lbs_saved || 0}</div>
                  <div className="text-xs text-slate-400 mt-1">Lbs CO₂ Saved</div>
                </div>
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-6 text-center">
                  <BadgeCheck className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold font-mono">{carbonStats?.certificate_id || "N/A"}</div>
                  <div className="text-xs text-slate-400 mt-1">Certificate ID</div>
                </div>
              </div>
              <div className="text-center">
                <button
                  onClick={() => {
                    const cert = `BYD Carbon Offset Certificate\nTrees: ${carbonStats?.trees_planted || user.carbon_trees_planted || 0}\nCO₂ Saved: ${carbonStats?.lbs_saved || user.carbon_lbs_saved || 0} lbs\nIssued: ${new Date().toISOString().split("T")[0]}`;
                    const blob = new Blob([cert], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = "carbon-certificate.txt"; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-6 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-sm font-bold text-emerald-300 hover:bg-emerald-500/30 transition cursor-pointer"
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  Download Certificate
                </button>
              </div>
            </div>
          )}

          {/* ==================== LOTTERY ==================== */}
          {activeTab === "lottery" && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">Lottery Raffle</h2>
                  <p className="text-xs text-slate-400">Win big with your lottery tickets</p>
                </div>
                <Ticket className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-6 text-center">
                  <Ticket className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold font-mono">{lotteryStatus?.tickets || user.lottery_tickets || 0}</div>
                  <div className="text-xs text-slate-400 mt-1">Your Tickets</div>
                </div>
                <div className="bg-white/5 rounded-xl p-6 text-center">
                  <Banknote className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold font-mono">{lotteryStatus?.total_pool ? `$${lotteryStatus.total_pool.toLocaleString()}` : "$0"}</div>
                  <div className="text-xs text-slate-400 mt-1">Total Pool</div>
                </div>
                <div className="bg-white/5 rounded-xl p-6 text-center">
                  <Users className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold font-mono">{lotteryStatus?.participants || 0}</div>
                  <div className="text-xs text-slate-400 mt-1">Participants</div>
                </div>
              </div>
              {lotteryStatus?.sources && lotteryStatus.sources.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 block">Entry Sources</span>
                  <div className="space-y-2">
                    {lotteryStatus.sources.map((src: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                        <span className="text-sm">{src.source}</span>
                        <span className="text-xs text-cyan-400 font-mono">+{src.tickets} tickets</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== KYC ==================== */}
          {activeTab === "kyc" && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">Identity Verification (KYC)</h2>
                  <p className="text-xs text-slate-400">Complete verification to unlock all features</p>
                </div>
                <FileCheck className="w-6 h-6 text-cyan-400" />
              </div>

              {user.kyc_status === "verified" ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 text-center">
                  <BadgeCheck className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-emerald-300">Verified</h3>
                  <p className="text-sm text-slate-400 mt-2">Your identity has been verified</p>
                </div>
              ) : user.kyc_status === "pending" ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-8 text-center">
                  <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-amber-300">Pending Review</h3>
                  <p className="text-sm text-slate-400 mt-2">Your documents are being reviewed</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Step Indicator */}
                  <div className="flex gap-2 mb-6">
                    {["Identity", "Documents", "Selfie", "Financial"].map((step, i) => (
                      <button
                        key={i}
                        onClick={() => setKycStep(i)}
                        className={`flex-1 py-2 text-center text-[10px] font-mono uppercase rounded-xl border transition cursor-pointer ${
                          kycStep === i
                            ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-300"
                            : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {step}
                      </button>
                    ))}
                  </div>

                  {kycMsg && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-300 flex items-center gap-2"><CheckCircle className="w-5 h-5" />{kycMsg}</div>}
                  {kycError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-300 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />{kycError}</div>}

                  {kycStep === 0 && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Full Legal Name</label>
                        <input type="text" value={kycForm.name} onChange={e => setKycForm(p => ({...p, name: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" placeholder="John Doe" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Date of Birth</label>
                        <input type="date" value={kycForm.dob} onChange={e => setKycForm(p => ({...p, dob: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Nationality</label>
                        <input type="text" value={kycForm.nationality} onChange={e => setKycForm(p => ({...p, nationality: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" placeholder="US" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">ID / Passport Number</label>
                        <input type="text" value={kycForm.idNumber} onChange={e => setKycForm(p => ({...p, idNumber: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" placeholder="AB123456" />
                      </div>
                    </div>
                  )}

                  {kycStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">ID Front</label>
                        <label className="flex flex-col items-center justify-center w-full h-32 bg-white/5 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition">
                          {kycFiles.idFront ? <img src={kycFiles.idFront} alt="ID Front" className="h-full object-contain" /> : <><Upload className="w-6 h-6 text-slate-500 mb-1" /><span className="text-xs text-slate-500">Upload ID Front</span></>}
                          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileChange("idFront", e.target.files[0])} />
                        </label>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">ID Back</label>
                        <label className="flex flex-col items-center justify-center w-full h-32 bg-white/5 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition">
                          {kycFiles.idBack ? <img src={kycFiles.idBack} alt="ID Back" className="h-full object-contain" /> : <><Upload className="w-6 h-6 text-slate-500 mb-1" /><span className="text-xs text-slate-500">Upload ID Back</span></>}
                          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileChange("idBack", e.target.files[0])} />
                        </label>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Proof of Address</label>
                        <label className="flex flex-col items-center justify-center w-full h-32 bg-white/5 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition">
                          {kycFiles.addressProof ? <img src={kycFiles.addressProof} alt="Address Proof" className="h-full object-contain" /> : <><Upload className="w-6 h-6 text-slate-500 mb-1" /><span className="text-xs text-slate-500">Upload Utility Bill</span></>}
                          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileChange("addressProof", e.target.files[0])} />
                        </label>
                      </div>
                    </div>
                  )}

                  {kycStep === 2 && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="relative w-48 h-48 mx-auto bg-black rounded-2xl overflow-hidden border border-white/10">
                          {kycFiles.selfie ? (
                            <img src={kycFiles.selfie} alt="Selfie" className="w-full h-full object-cover" />
                          ) : webcamActive ? (
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                              <Camera className="w-10 h-10 mb-2" />
                              <span className="text-xs">Webcam off</span>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-center gap-3 mt-4">
                          {!webcamActive && !kycFiles.selfie && (
                            <button onClick={startWebcam} className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-300 cursor-pointer hover:bg-cyan-500/30 transition">
                              <Camera className="w-4 h-4 inline mr-1" /> Start Webcam
                            </button>
                          )}
                          {webcamActive && (
                            <button onClick={captureSelfie} className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300 cursor-pointer hover:bg-emerald-500/30 transition">
                              <Camera className="w-4 h-4 inline mr-1" /> Capture
                            </button>
                          )}
                          {kycFiles.selfie && (
                            <button onClick={() => setKycFiles(p => ({...p, selfie: ""}))} className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-xl text-xs font-bold text-red-300 cursor-pointer hover:bg-red-500/30 transition">
                              Retake
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {kycStep === 3 && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Source of Funds</label>
                        <select value={kycForm.sourceOfFunds} onChange={e => setKycForm(p => ({...p, sourceOfFunds: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40">
                          <option value="">Select...</option>
                          <option value="employment">Employment Income</option>
                          <option value="investment">Investment Returns</option>
                          <option value="business">Business Revenue</option>
                          <option value="crypto">Cryptocurrency</option>
                          <option value="inheritance">Inheritance</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Annual Income</label>
                        <select value={kycForm.annualIncome} onChange={e => setKycForm(p => ({...p, annualIncome: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40">
                          <option value="">Select...</option>
                          <option value="0-25000">$0 - $25,000</option>
                          <option value="25000-50000">$25,000 - $50,000</option>
                          <option value="50000-100000">$50,000 - $100,000</option>
                          <option value="100000-250000">$100,000 - $250,000</option>
                          <option value="250000+">$250,000+</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Investment Experience</label>
                        <select value={kycForm.investmentExperience} onChange={e => setKycForm(p => ({...p, investmentExperience: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40">
                          <option value="">Select...</option>
                          <option value="none">No Experience</option>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="professional">Professional</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-4 border-t border-white/10">
                    <button onClick={() => setKycStep(p => Math.max(0, p - 1))} disabled={kycStep === 0} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs disabled:opacity-30 cursor-pointer hover:bg-white/10 transition">
                      Previous
                    </button>
                    {kycStep < 3 ? (
                      <button onClick={() => setKycStep(p => p + 1)} className="px-6 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-300 cursor-pointer hover:bg-cyan-500/30 transition">
                        Next
                      </button>
                    ) : (
                      <button onClick={handleKycSubmit} disabled={kycLoading} className="px-6 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300 cursor-pointer hover:bg-emerald-500/30 transition disabled:opacity-40">
                        {kycLoading ? "Submitting..." : "Submit KYC"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== INSURANCE ==================== */}
          {activeTab === "insurance" && (
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold">Insurance</h2>
                    <p className="text-xs text-slate-400">Protect your BYD vehicle</p>
                  </div>
                  <ShieldCheck className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { name: "Basic Shield", premium: 19, limit: 15000, borderClass: "border-slate-500/20", bgClass: "bg-slate-500/5" },
                    { name: "Standard Executive", premium: 49, limit: 50000, borderClass: "border-cyan-500/20", bgClass: "bg-cyan-500/5" },
                    { name: "BYD Prestige", premium: 89, limit: 120000, borderClass: "border-emerald-500/20", bgClass: "bg-emerald-500/5" },
                  ].map((plan, i) => (
                    <div key={i} className={`${plan.bgClass} ${plan.borderClass} rounded-xl p-5 flex flex-col`}>
                      <div className="flex-1">
                        <h3 className="text-base font-bold">{plan.name}</h3>
                        <div className="mt-2 space-y-1 text-xs text-slate-400">
                          <p>Coverage: <strong className="text-white">${plan.limit.toLocaleString()}</strong></p>
                          <p>Premium: <strong className="text-cyan-400">${plan.premium}/mo</strong></p>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePurchaseInsurance(plan.name, plan.premium, plan.limit)}
                        disabled={insuranceLoading}
                        className="mt-4 w-full py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer disabled:opacity-40"
                      >
                        Purchase
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Policies */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-base font-bold mb-4">Active Policies</h3>
                {data.insurancePolicies && data.insurancePolicies.length > 0 ? (
                  <div className="space-y-3">
                    {data.insurancePolicies.map((p, i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold">{p.plan_name}</div>
                          <div className="text-xs text-slate-400">{p.car_model} • Policy: {p.policy_number}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-emerald-400">{p.status}</div>
                          <div className="text-[10px] text-slate-500">${p.monthly_premium}/mo</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">No active policies</div>
                )}
              </div>
            </div>
          )}

          {/* ==================== ELITE TIER ==================== */}
          {activeTab === "elite" && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border-2 border-yellow-500/30 flex items-center justify-center"><Crown className="w-10 h-10 text-yellow-400" /></div>
                <h2 className="text-3xl font-bold mb-2">Elite Membership</h2>
                <p className="text-sm text-slate-400 max-w-lg mx-auto">Unlock the ultimate BYD Horizon experience. Priority access, exclusive events, and unmatched benefits.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { tier: "Bronze", points: "0 - 4,999", color: "from-orange-600 to-orange-800", borderColor: "border-orange-500/20", perks: ["Basic rewards", "Standard support", "Community access", "$0.05/mile Drive to Earn"] },
                  { tier: "Silver", points: "5,000 - 19,999", color: "from-slate-400 to-slate-500", borderColor: "border-slate-400/20", perks: ["1.5x point multiplier", "Priority support", "Exclusive merch drops", "$0.08/mile Drive to Earn", "Monthly bonus spin"] },
                  { tier: "Gold", points: "20,000 - 49,999", color: "from-yellow-500 to-yellow-600", borderColor: "border-yellow-500/20", perks: ["2x point multiplier", "VIP support line", "Early model access", "$0.10/mile Drive to Earn", "Quarterly mystery car chance", "Exclusive events"] },
                  { tier: "Elite", points: "50,000 - 99,999", color: "from-purple-500 to-purple-600", borderColor: "border-purple-500/20", perks: ["3x point multiplier", "Dedicated concierge", "Free annual service", "$0.15/mile Drive to Earn", "Priority delivery", "Private test drive events", "Annual Elite gala"] },
                  { tier: "President's Club", points: "100,000+", color: "from-cyan-400 to-blue-500", borderColor: "border-cyan-500/30", perks: ["5x point multiplier", "Personal account manager", "Complimentary insurance", "$0.20/mile Drive to Earn", "Factory tour invitation", "Custom vehicle spec", "Lifetime Elite status", "Board advisory access"] },
                ].map((t, i) => {
                  const currentTier = user.membership_tier || "Standard";
                  const tierOrder = ["Standard", "Bronze", "Silver", "Gold", "Elite", "President's Club"];
                  const isCurrentOrAbove = tierOrder.indexOf(currentTier) >= tierOrder.indexOf(t.tier);
                  const isCurrent = currentTier === t.tier;
                  return (
                    <div key={i} className={`bg-white/5 backdrop-blur-xl border ${isCurrent ? "border-yellow-500/50 shadow-lg shadow-yellow-500/10" : t.borderColor} rounded-2xl p-6 relative overflow-hidden`}>
                      {isCurrent && <div className="absolute top-3 right-3 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-[9px] font-bold text-yellow-300 font-mono">CURRENT</div>}
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-4`}>
                        <Crown className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold mb-1">{t.tier}</h3>
                      <p className="text-[10px] text-slate-500 font-mono mb-4">{t.points} points</p>
                      <ul className="space-y-2">
                        {t.perks.map((perk, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-slate-300">
                            <Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                            <span>{perk}</span>
                          </li>
                        ))}
                      </ul>
                      {!isCurrentOrAbove && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <div className="text-[10px] text-slate-500 font-mono mb-2">You need {(t.points === "0 - 4,999" ? "0" : t.points.split(" - ")[0]?.replace(",", "") || "100,000").replace(",", "")} points</div>
                          <div className="w-full bg-white/5 rounded-full h-2">
                            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, ((user.horizon_points || 0) / parseInt((t.points.split(" - ")[1] || "100000").replace(",", ""))) * 100)}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-base font-bold mb-4">Your Progress</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center"><div className="text-2xl font-bold text-cyan-400 font-mono">{(user.horizon_points || 0).toLocaleString()}</div><div className="text-[10px] text-slate-500 font-mono">Total Points</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-emerald-400 font-mono">{user.membership_tier || "Standard"}</div><div className="text-[10px] text-slate-500 font-mono">Current Tier</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-yellow-400 font-mono">{user.referrals_count || 0}</div><div className="text-[10px] text-slate-500 font-mono">Referrals</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-purple-400 font-mono">{user.drives_count || 0}</div><div className="text-[10px] text-slate-500 font-mono">Drives Logged</div></div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SUPPORT / CHAT ==================== */}
          {activeTab === "support" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold">Live Chat</h2>
                      <p className="text-xs text-slate-400">Chat with our support team in real-time</p>
                    </div>
                    <HeadphonesIcon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="bg-[#0a0e1a] rounded-xl border border-white/5 h-80 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : ""}`}>
                          {msg.sender !== "user" && <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0"><HeadphonesIcon className="w-4 h-4 text-cyan-400" /></div>}
                          <div className={`rounded-xl px-4 py-2 max-w-[80%] ${msg.sender === "user" ? "bg-cyan-500/20" : "bg-white/5"}`}>
                            <p className={`text-xs ${msg.sender === "user" ? "text-cyan-200" : "text-slate-300"}`}>{msg.text}</p>
                            <span className={`text-[9px] mt-1 block ${msg.sender === "user" ? "text-cyan-600" : "text-slate-600"}`}>{msg.sender === "user" ? "You" : "Agent"} • {msg.time}</span>
                          </div>
                          {msg.sender === "user" && <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0"><span className="text-xs font-bold text-cyan-400">U</span></div>}
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-white/5 p-3 flex gap-2">
                      <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type your message..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyan-500/40" onKeyDown={e => { if (e.key === "Enter" && chatInput.trim()) { const now = "Just now"; setChatMessages(prev => [...prev, { sender: "user", text: chatInput, time: now }]); setChatInput(""); setTimeout(() => { setChatMessages(prev => [...prev, { sender: "agent", text: "Thank you for your message. A support agent will respond shortly. Your ticket has been created.", time: now }]); }, 1500); } }} />
                      <button onClick={() => { if (chatInput.trim()) { const now = "Just now"; setChatMessages(prev => [...prev, { sender: "user", text: chatInput, time: now }]); setChatInput(""); setTimeout(() => { setChatMessages(prev => [...prev, { sender: "agent", text: "Thank you for your message. A support agent will respond shortly.", time: now }]); }, 1500); } }} className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer"><Send className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold">Submit Ticket</h2>
                      <p className="text-xs text-slate-400">Create a formal support ticket</p>
                    </div>
                    <MessageSquare className="w-6 h-6 text-cyan-400" />
                  </div>
                  <form onSubmit={handleSupportSubmit} className="space-y-4">
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Subject</label>
                      <input type="text" required value={supportSubject} onChange={e => setSupportSubject(e.target.value)} placeholder="Brief description of your issue" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Category</label>
                      <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40 cursor-pointer">
                        <option value="general">General Inquiry</option>
                        <option value="payment">Payment Issue</option>
                        <option value="rental">Rental Question</option>
                        <option value="tracking">Tracking Issue</option>
                        <option value="kyc">KYC Verification</option>
                        <option value="elite">Elite Membership</option>
                        <option value="investment">Investment</option>
                        <option value="bug">Bug Report</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Priority</label>
                      <div className="flex gap-2">
                        {["low", "normal", "high", "urgent"].map(p => (
                          <button key={p} type="button" className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono uppercase hover:bg-white/10 transition cursor-pointer">{p}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Message</label>
                      <textarea required rows={5} value={supportMessage} onChange={e => setSupportMessage(e.target.value)} placeholder="Describe your issue in detail..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40 resize-none" />
                    </div>
                    <button type="submit" disabled={supportLoading} className="w-full py-3 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-sm font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer disabled:opacity-40">
                      {supportLoading ? "Submitting..." : "Submit Ticket"}
                    </button>
                  </form>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Quick Help</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { q: "How do I pay with crypto?", a: "Select crypto at checkout. Send USDT to the displayed wallet address. Paste your transaction hash for confirmation." },
                    { q: "When will my vehicle arrive?", a: "Track your order in the Tracking tab. Admin updates ETA and dispatch status in real-time." },
                    { q: "How do I earn more points?", a: "Daily check-ins, quizzes, referrals, and Drive to Earn all earn Horizon Points. Check the Gamification tab." },
                    { q: "What are Elite benefits?", a: "Elite members get 3x points, priority delivery, VIP support, and exclusive events. Check the Elite Tier tab." },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-4 cursor-pointer hover:bg-white/10 transition">
                      <p className="text-xs font-bold mb-2">{item.q}</p>
                      <p className="text-[10px] text-slate-400">{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== RENT A VEHICLE ==================== */}
          {activeTab === "rent" && (
            <RentVehiclePage authToken={authToken} onNavigate={onNavigate} />
          )}

          {/* ==================== INVEST ==================== */}
          {activeTab === "invest" && (
            <InvestPage authToken={authToken} userBalance={user.balance || 0} onRefresh={() => loadSummaryData()} />
          )}

          {/* ==================== TRANSIT / ENVIRONMENT FEED ==================== */}
          {activeTab === "transit" && (
            <div className="space-y-6">
              {data.tracking ? (
                <TransitUpdatePanel
                  authToken={authToken}
                  routeIndex={data.tracking.route_index}
                  delaysEncountered={data.tracking.delays_encountered}
                  expeditePaid={data.tracking.expedite_paid}
                  destinationCity={data.user.city || "New York"}
                />
              ) : (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center py-12">
                  <Car className="w-12 h-12 mx-auto mb-3 text-slate-500 opacity-50" />
                  <p className="text-sm text-slate-500">No active transit data available</p>
                  <p className="text-xs text-slate-600 mt-1">Complete a purchase or rental to see real-time transit updates</p>
                </div>
              )}
            </div>
          )}

          {/* ==================== BLOG ==================== */}
          {activeTab === "blog" && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">BYD News & Blog</h2>
                  <p className="text-xs text-slate-400">Latest updates from the Horizon Club</p>
                </div>
                <Newspaper className="w-6 h-6 text-cyan-400" />
              </div>
              <BlogPostsSection authToken={authToken} onNavigate={onNavigate} />
            </div>
          )}

          {/* ==================== DONATIONS ==================== */}
          {activeTab === "donations" && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">Charity & Donations</h2>
                  <p className="text-xs text-slate-400">Support global causes with your Horizon Points</p>
                </div>
                <HeartHandshake className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                  <TreePine className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold font-mono text-emerald-400">{user.carbon_trees_planted || 0}</div>
                  <div className="text-xs text-slate-400 mt-1">Trees Planted</div>
                </div>
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-6 text-center">
                  <Coins className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold font-mono text-cyan-400">{formatBalance(user.horizon_points || 0, false)}</div>
                  <div className="text-xs text-slate-400 mt-1">Available Points</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center">
                  <HandCoins className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold font-mono text-amber-400">{user.balance ? `$${user.balance.toFixed(0)}` : "$0"}</div>
                  <div className="text-xs text-slate-400 mt-1">Wallet Balance</div>
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-sm font-bold mb-4">Make a Donation</h3>
                <p className="text-xs text-slate-400 mb-4">Choose a charity to support. Donations are tax-deductible.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 flex flex-col">
                    <TreePine className="w-8 h-8 text-emerald-400 mb-3" />
                    <h4 className="text-sm font-bold">Green Earth Initiative</h4>
                    <p className="text-[10px] text-slate-400 mt-1 flex-1">Global reforestation & carbon capture</p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                      <span className="text-xs font-mono text-cyan-400">500 pts</span>
                      <button onClick={async () => {
                        if ((user.horizon_points || 0) < 500) { alert("Insufficient points!"); return; }
                        try { const res = await fetchWithAuth("/api/charity/donate", "POST", { charity_name: "Green Earth Initiative", points: 500 }); const json = await res.json(); if (res.ok) { alert(json.message || "Donation successful!"); loadSummaryData(); } else alert(json.error || "Donation failed"); } catch { alert("Network error"); }
                      }} className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-[10px] text-cyan-300 font-bold hover:bg-cyan-500/30 transition cursor-pointer">Donate</button>
                    </div>
                  </div>
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 flex flex-col">
                    <Waves className="w-8 h-8 text-blue-400 mb-3" />
                    <h4 className="text-sm font-bold">Ocean Cleanup Project</h4>
                    <p className="text-[10px] text-slate-400 mt-1 flex-1">Remove plastic from our oceans</p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                      <span className="text-xs font-mono text-cyan-400">300 pts</span>
                      <button onClick={async () => {
                        if ((user.horizon_points || 0) < 300) { alert("Insufficient points!"); return; }
                        try { const res = await fetchWithAuth("/api/charity/donate", "POST", { charity_name: "Ocean Cleanup Project", points: 300 }); const json = await res.json(); if (res.ok) { alert(json.message || "Donation successful!"); loadSummaryData(); } else alert(json.error || "Donation failed"); } catch { alert("Network error"); }
                      }} className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-[10px] text-cyan-300 font-bold hover:bg-cyan-500/30 transition cursor-pointer">Donate</button>
                    </div>
                  </div>
                  <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-5 flex flex-col">
                    <BookOpen className="w-8 h-8 text-cyan-400 mb-3" />
                    <h4 className="text-sm font-bold">EV Education Fund</h4>
                    <p className="text-[10px] text-slate-400 mt-1 flex-1">Teach sustainable transport</p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                      <span className="text-xs font-mono text-cyan-400">200 pts</span>
                      <button onClick={async () => {
                        if ((user.horizon_points || 0) < 200) { alert("Insufficient points!"); return; }
                        try { const res = await fetchWithAuth("/api/charity/donate", "POST", { charity_name: "EV Education Fund", points: 200 }); const json = await res.json(); if (res.ok) { alert(json.message || "Donation successful!"); loadSummaryData(); } else alert(json.error || "Donation failed"); } catch { alert("Network error"); }
                      }} className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-[10px] text-cyan-300 font-bold hover:bg-cyan-500/30 transition cursor-pointer">Donate</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== OUTREACH ==================== */}
          {activeTab === "outreach" && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">Outreach Campaigns</h2>
                  <p className="text-xs text-slate-400">Spread the word and earn rewards</p>
                </div>
                <Megaphone className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-cyan-400" /> Email Campaign
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">Invite friends via email and earn $10 per signup</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="friend@email.com"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40"
                      id="outreach-email"
                    />
                    <button
                      onClick={async () => {
                        const email = (document.getElementById("outreach-email") as HTMLInputElement)?.value;
                        if (!email) { alert("Enter an email address"); return; }
                        try {
                          const res = await fetchWithAuth("/api/outreach/invite", "POST", { email, method: "email" });
                          const json = await res.json();
                          if (res.ok) { alert(json.message || "Invitation sent!"); (document.getElementById("outreach-email") as HTMLInputElement).value = ""; }
                          else alert(json.error || "Failed");
                        } catch { alert("Network error"); }
                      }}
                      className="px-4 py-3 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-3 text-xs text-slate-400">
                    <span className="text-cyan-400 font-bold">Reward:</span> $10 per referral + 100 bonus points
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-emerald-400" /> Share Your Link
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">Share your referral link on social media</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`https://bydhorizon.com/ref/${user.referral_code}`}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-cyan-300 focus:outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(`https://bydhorizon.com/ref/${user.referral_code}`, "ref-link")}
                      className="px-4 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition cursor-pointer"
                    >
                      {copied === "ref-link" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-4 bg-white/5 rounded-xl p-3 space-y-2">
                    <button
                      onClick={() => {
                        const text = `Join me on BYD Horizon Club! Use my referral code: ${user.referral_code} - https://bydhorizon.com/ref/${user.referral_code}`;
                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
                      }}
                      className="w-full py-2 bg-sky-500/20 border border-sky-500/30 rounded-xl text-[10px] font-bold text-sky-300 hover:bg-sky-500/30 transition cursor-pointer"
                    >
                      Share on Twitter/X
                    </button>
                    <button
                      onClick={() => {
                        const text = `Join me on BYD Horizon Club! 🚗⚡ Use my referral code: ${user.referral_code}`;
                        window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}&u=https://bydhorizon.com/ref/${user.referral_code}`, "_blank");
                      }}
                      className="w-full py-2 bg-blue-500/20 border border-blue-500/30 rounded-xl text-[10px] font-bold text-blue-300 hover:bg-blue-500/30 transition cursor-pointer"
                    >
                      Share on Facebook
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-6 bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
                <h4 className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Campaign Stats
                </h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold font-mono text-amber-400">{data.referralStats.pendingCount}</div>
                    <div className="text-[10px] text-slate-400">Pending Invites</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold font-mono text-emerald-400">{data.referralStats.paidCount}</div>
                    <div className="text-[10px] text-slate-400">Converted</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold font-mono text-cyan-400">{formatBalance(data.referralStats.estimatedEarnings)}</div>
                    <div className="text-[10px] text-slate-400">Earnings</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== WEBCAMS ==================== */}
          {activeTab === "webcams" && (
            <div>
              <LiveWebcamGrid authToken={authToken} />
            </div>
          )}

          {/* ==================== INSPECT ==================== */}
          {activeTab === "inspect" && (
            <div>
              <CarInspectSection />
            </div>
          )}

          {/* ==================== SETTINGS ==================== */}
          {activeTab === "settings" && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold">Settings</h2>
                    <p className="text-xs text-slate-400">Manage your account</p>
                  </div>
                  <Settings className="w-6 h-6 text-cyan-400" />
                </div>
                <form onSubmit={handleSettingsSubmit} className="space-y-4">
                  {settingsMsg && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-300">{settingsMsg}</div>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Name</label>
                      <input type="text" value={settingsName} onChange={e => setSettingsName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Phone</label>
                      <input type="text" value={settingsPhone} onChange={e => setSettingsPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">City</label>
                      <input type="text" value={settingsCity} onChange={e => setSettingsCity(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Country</label>
                      <input type="text" value={settingsCountry} onChange={e => setSettingsCountry(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Wallet Address</label>
                      <input type="text" value={settingsWallet} onChange={e => setSettingsWallet(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-cyan-500/40" placeholder="0x... or T..." />
                    </div>
                  </div>

                  {/* Incognito Toggle */}
                  <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <EyeOff className="w-5 h-5 text-orange-400" />
                      <div>
                        <div className="text-sm font-bold">Incognito Mode</div>
                        <div className="text-[10px] text-slate-400">Hide your activity from other users</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettingsIncognito(!settingsIncognito)}
                      className={`relative w-11 h-6 rounded-full border-2 border-transparent transition cursor-pointer ${settingsIncognito ? "bg-orange-500" : "bg-white/10"}`}
                    >
                      <span className={`block w-5 h-5 rounded-full bg-white shadow transition ${settingsIncognito ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>

                  <button type="submit" disabled={settingsLoading} className="w-full py-3 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-sm font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer disabled:opacity-40">
                    {settingsLoading ? "Saving..." : "Save Settings"}
                  </button>
                </form>
              </div>

              {/* Change Password */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-base font-bold mb-4">Change Password</h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {passwordMsg && <div className={`rounded-xl p-4 text-sm ${passwordMsg.includes("Error") || passwordMsg.includes("Failed") ? "bg-red-500/10 border border-red-500/20 text-red-300" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"}`}>{passwordMsg}</div>}
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Current Password</label>
                    <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">New Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" />
                  </div>
                  <button type="submit" disabled={passwordLoading} className="w-full py-3 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-sm font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer disabled:opacity-40">
                    {passwordLoading ? "Changing..." : "Change Password"}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function ShowroomGrid({ authToken, onNavigate }: { authToken: string; onNavigate: (view: string, params?: any) => void }) {
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cars")
      .then(r => r.json())
      .then(d => { setCars(Array.isArray(d) ? d.slice(0, 8) : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-slate-500 text-xs">Loading fleet...</div>;

  if (cars.length === 0) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {["BYD Seal", "BYD Atto 3", "BYD Dolphin", "BYD Han"].map((car, i) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition cursor-pointer group">
          <div className="aspect-video bg-white/5 rounded-lg mb-3 flex items-center justify-center">
            <Car className="w-10 h-10 text-slate-500 group-hover:text-cyan-400 transition" />
          </div>
          <div className="text-sm font-bold">{car}</div>
          <div className="text-[10px] text-slate-500 mt-1">Starting at ${[35000, 28000, 22000, 45000][i].toLocaleString()}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cars.map((car: any) => (
        <div key={car.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-cyan-500/30 transition cursor-pointer group">
          <div className="aspect-video bg-white/5 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
            {car.image_url ? <img src={car.image_url} alt={car.model} className="w-full h-full object-cover group-hover:scale-105 transition" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <Car className="w-10 h-10 text-slate-500 group-hover:text-cyan-400 transition" />}
          </div>
          <div className="text-sm font-bold">{car.model}</div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-[10px] text-slate-500">{car.category || "EV"}</div>
            <div className="text-xs font-bold text-cyan-400">${car.price?.toLocaleString() || "N/A"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BlogPostsSection({ authToken, onNavigate }: { authToken: string; onNavigate: (view: string, params?: any) => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/blogs")
      .then(r => r.json())
      .then(d => { setPosts(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-slate-500 text-xs">Loading posts...</div>;

  if (posts.length === 0) return <div className="text-center py-12 text-slate-500"><Newspaper className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No blog posts yet</p></div>;

  return (
    <div className="space-y-4">
      {posts.map((post: any) => (
        <div key={post.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-cyan-500/30 transition">
          {post.image_url && (
            <div className="h-40 overflow-hidden">
              <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}
          <div className="p-5">
            <h3 className="text-sm font-bold text-white mb-2">{post.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{post.content}</p>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
              <span className="text-[10px] text-slate-500 font-mono">{post.published_at ? new Date(post.published_at).toLocaleDateString() : ""}</span>
              <span className="text-[10px] text-cyan-400 font-mono">{post.comments_count || 0} comments</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

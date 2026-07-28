import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Map, Grid3X3, Users, Gift, Gamepad2, Car, FileCheck, ShieldCheck, HeadphonesIcon, Settings, Copy, Check, RefreshCw, X, Eye, EyeOff, Camera, ChevronRight, ExternalLink, Clock, MapPin, Wallet, CreditCard, Sparkles, AlertTriangle, CheckCircle, ArrowUpRight, Search, LogOut, Bell, DollarSign, BarChart3, Navigation, Package, Ship, Gem, HeartHandshake, HandCoins, TreePine, BadgeCheck, BookOpen, MessageSquare, Loader2, UserCheck, Crown, TrendingUp, ArrowRight, Send, Globe, Smartphone, Mail, Phone, QrCode, Upload, Video, Target, Swords, Diamond, Medal, Star, Zap, Flame, PartyPopper, Lock, Unlock, Shield, Coins, Info, HelpCircle, ThumbsUp, Play, Gift as GiftIcon, Award, Ticket, Download, RotateCcw, Minus, Plus, Leaf } from "lucide-react";
import { DashboardData, RewardItem } from "../types";
import { NotificationBell } from "./ui/NotificationBell";
import { DailyCheckin } from "./gamification/DailyCheckin";
import { SpinWheel } from "./gamification/SpinWheel";
import { BYDQuiz } from "./gamification/BYDQuiz";
import { LiveTrackingMap } from "./map/LiveTrackingMap";
import { LiveWebcamGrid } from "./live/LiveWebcamGrid";
import { TransitUpdatePanel } from "./dashboard/TransitUpdatePanel";
import { RentVehiclePage } from "./rental/RentVehiclePage";
import { InvestPage } from "./investment/InvestPage";
import { ReferralTreeSection } from "./referrals/ReferralTreeSection";
import CameraKYC from "./CameraKYC";

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
  finance: <TrendingUp className="w-4 h-4" />,
  games: <Gamepad2 className="w-4 h-4" />,
  help: <HeadphonesIcon className="w-4 h-4" />,
  kyc: <FileCheck className="w-4 h-4" />,
  rent: <Car className="w-4 h-4" />,
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

  const [loadError, setLoadError] = useState("");

  const loadSummaryData = async () => {
    setLoadError("");
    try {
      const res = await fetch("/api/dashboard/summary", { headers: { Authorization: `Bearer ${authToken}` } });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("byd_horizon_token");
          localStorage.removeItem("byd_horizon_user");
          window.location.href = "/";
          return;
        }
        setLoadError(json.error || "Failed to load dashboard. Please refresh.");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setLoadError("Connection error. Please check your connection and try again.");
    } finally { setLoading(false); }
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
  const [showMysteryReveal, setShowMysteryReveal] = useState(false);

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

  if (!data && !loadError) return null;

  if (loadError && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#0a0e1a]">
        <div className="flex flex-col items-center space-y-4 text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-amber-400" />
          <p className="text-sm text-white/80">{loadError}</p>
          <button onClick={() => { setLoading(true); loadSummaryData(); }}
            className="px-6 py-2.5 bg-[#00E5FF] text-[#0a0e1a] font-bold rounded-xl text-xs hover:bg-[#00E5FF]/90 transition cursor-pointer flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <button onClick={() => onNavigate("landing")}
            className="text-xs text-white/40 hover:text-white/60 transition cursor-pointer">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

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
            <div className="flex gap-2">
              <button onClick={() => setActiveTab("finance")} className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/30 transition cursor-pointer whitespace-nowrap flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Add Money
              </button>
              <button onClick={() => setActiveTab("finance")} className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-lg text-[10px] font-bold text-amber-300 hover:bg-amber-500/30 transition cursor-pointer whitespace-nowrap flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> Withdraw
              </button>
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div className="animate-fade-in">

          {/* ==================== DASHBOARD (KYC-FIRST) ==================== */}
          {activeTab === "dashboard" && (
            <>
            {/* KYC Banner - first thing user sees */}
            {user.kyc_status !== "verified" ? (
              <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <UserCheck className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-amber-300">
                      {user.kyc_status === "pending" ? "KYC Under Review" : "Identity Verification Required"}
                    </h3>
                    <p className="text-sm text-amber-200/70 mt-1">
                      {user.kyc_status === "pending"
                        ? "Your documents are being reviewed. You'll be notified once verified."
                        : "Complete KYC verification to unlock deposits, purchases, rentals, investments and all platform features."}
                    </p>
                    {user.kyc_status !== "pending" && (
                      <button onClick={() => setActiveTab("kyc")} className="mt-4 px-6 py-2.5 bg-amber-500/30 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-300 hover:bg-amber-500/40 transition cursor-pointer flex items-center gap-2">
                        <UserCheck className="w-4 h-4" /> Complete KYC Now
                      </button>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono ${user.kyc_status === "pending" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                    {user.kyc_status === "pending" ? "PENDING" : "UNVERIFIED"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-2xl p-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <BadgeCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-emerald-300">Identity Verified ✓</h3>
                    <p className="text-sm text-emerald-200/70 mt-1">You have full access to all platform features. Welcome to BYD Horizon Club!</p>
                    <div className="flex gap-3 mt-4">
                      <button onClick={() => setActiveTab("rent")} className="px-4 py-2 bg-cyan-500/30 border border-cyan-500/40 rounded-xl text-xs font-bold text-cyan-300 hover:bg-cyan-500/40 transition cursor-pointer flex items-center gap-2">
                        <Car className="w-4 h-4" /> Rent a Vehicle
                      </button>
                      <button onClick={() => handleNavigate("vehicles")} className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white/80 hover:bg-white/15 transition cursor-pointer flex items-center gap-2">
                        <Grid3X3 className="w-4 h-4" /> Browse Showroom
                      </button>
                      <button onClick={() => setActiveTab("finance")} className="px-4 py-2 bg-emerald-500/30 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-300 hover:bg-emerald-500/40 transition cursor-pointer flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> Make a Deposit
                      </button>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono">VERIFIED</span>
                </div>
              </div>
            )}

            {/* Dashboard Grid */}
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
                    <Leaf className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
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
            </>
          )}

          {/* ==================== TRACKING & TRANSIT ==================== */}
          {activeTab === "tracking" && (
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold">Tracking & Transit</h2>
                    <p className="text-xs text-slate-400">Live GPS tracking, shipping locations, and delivery timeline</p>
                  </div>
                  <Map className="w-6 h-6 text-cyan-400" />
                </div>

                {data.tracking ? (
                  <div className="space-y-4">
                    {/* Progress Stats */}
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
                        <div className="text-lg font-bold truncate">{data.user.city || "New York"}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-[10px] text-slate-500 font-mono">ETA</div>
                        <div className="text-lg font-bold text-emerald-400">~{Math.max(1, 10 - Math.floor(data.tracking.route_index / 10))}d</div>
                      </div>
                    </div>

                    {/* Journey Timeline */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3">Journey Timeline</h3>
                      <div className="flex items-center gap-1">
                        {["Ordered", "Processing", "Shipped", "In Transit", "Customs", "Delivered"].map((stage, i) => (
                          <div key={i} className="flex-1 text-center">
                            <div className={`w-full h-1.5 rounded-full mb-1 ${data.tracking.route_index >= (i * 20) ? "bg-emerald-500" : "bg-white/10"}`} />
                            <span className={`text-[8px] font-mono ${data.tracking.route_index >= (i * 20) ? "text-emerald-400" : "text-slate-600"}`}>{stage}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {data.tracking.delays_encountered > 0 && !data.tracking.expedite_paid && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-400" />
                          <span className="text-sm text-amber-300">{data.tracking.delays_encountered} delay(s) detected</span>
                        </div>
                        <button onClick={async () => { try { const res = await fetchWithAuth("/api/payments/create", "POST", { method: "expedite", amount: 49 }); const json = await res.json(); if (res.ok) alert(`Expedite fee: $49 USDT. Send to: ${json.wallet_address}`); else alert(json.error || "Failed"); } catch { alert("Error"); } }} className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-300 transition cursor-pointer">Expedite Shipping ($49)</button>
                      </div>
                    )}

                    {/* Live Map */}
                    <div className="w-full h-[350px] md:h-[450px] rounded-2xl overflow-hidden border border-white/10" id="live-tracking-map-container">
                      <LiveTrackingMap authToken={authToken} routeIndex={data.tracking.route_index} totalStops={data.tracking.total_stops} destinationCity={data.user.city || "New York"} onRefresh={loadSummaryData} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center py-8 text-slate-500">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No active vehicle tracking</p>
                      <p className="text-xs mt-1">Rent or purchase a vehicle to start tracking</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Shipping Location Selector */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold">Shipping Calculator</h2>
                    <p className="text-xs text-slate-400">Select your delivery location for price estimation</p>
                  </div>
                  <Globe className="w-6 h-6 text-cyan-400" />
                </div>
                <ShippingLocationSelector />
              </div>

              {/* Email Notification */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold">Shipment Notifications</h2>
                    <p className="text-xs text-slate-400">Get email updates on your delivery progress</p>
                  </div>
                  <Mail className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="flex gap-3">
                  <input type="email" placeholder="your@email.com" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" />
                  <button className="px-4 py-3 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer">Save</button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Admin sends progress updates to this email</p>
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

          {/* ==================== GAMES ==================== */}
          {activeTab === "games" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DailyCheckin authToken={authToken} points={user.horizon_points || 0} onCheckinSuccess={(np) => setData(p => p ? { ...p, user: { ...p.user, horizon_points: np } } : null)} />
              <div className="space-y-6">
                <SpinWheel authToken={authToken} onSpinSuccess={(np) => setData(p => p ? { ...p, user: { ...p.user, horizon_points: np } } : null)} />
                <BYDQuiz authToken={authToken} onQuizSuccess={(np) => setData(p => p ? { ...p, user: { ...p.user, horizon_points: np } } : null)} />
              </div>
            </div>
          )}

          {/* ==================== FINANCIAL HUB ==================== */}
          {activeTab === "finance" && (
            <FinancialHubSection
              user={user}
              data={data}
              authToken={authToken}
              fetchWithAuth={fetchWithAuth}
              onRefresh={loadSummaryData}
              onNavigate={onNavigate}
              onKycRequired={() => setActiveTab("kyc")}
            />
          )}

          {/* ==================== HELP CENTER ==================== */}
          {activeTab === "help" && (
            <HelpCenterSection
              authToken={authToken}
              chatMessages={chatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              supportSubject={supportSubject}
              setSupportSubject={setSupportSubject}
              supportMessage={supportMessage}
              setSupportMessage={setSupportMessage}
              supportLoading={supportLoading}
              handleSupportSubmit={handleSupportSubmit}
              onNavigate={onNavigate}
            />
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

          {/* ==================== KYC ==================== */}
          {activeTab === "kyc" && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-w-3xl mx-auto">
              <CameraKYC token={token} currentStatus={data?.user?.kyc_status} onComplete={() => refresh()} />
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

          {/* ==================== RENT A VEHICLE ==================== */}
          {activeTab === "rent" && (
            <RentVehiclePage authToken={authToken} onNavigate={onNavigate} />
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

// ==================== SHIPPING LOCATION SELECTOR ====================
function ShippingLocationSelector() {
  const [location, setLocation] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [showingDetails, setShowingDetails] = useState(false);

  const predefinedCities = [
    { name: "New York, USA", region: "North America", distance: 0, cost: 199 },
    { name: "Los Angeles, USA", region: "North America", distance: 2500, cost: 399 },
    { name: "London, UK", region: "Europe", distance: 3500, cost: 699 },
    { name: "Paris, France", region: "Europe", distance: 3600, cost: 699 },
    { name: "Berlin, Germany", region: "Europe", distance: 3700, cost: 699 },
    { name: "Dubai, UAE", region: "Middle East", distance: 7000, cost: 1199 },
    { name: "Tokyo, Japan", region: "Asia", distance: 6700, cost: 1199 },
    { name: "Sydney, Australia", region: "Oceania", distance: 9000, cost: 1699 },
    { name: "São Paulo, Brazil", region: "South America", distance: 5000, cost: 999 },
    { name: "Singapore", region: "Asia", distance: 9500, cost: 1699 },
    { name: "Mumbai, India", region: "Asia", distance: 8000, cost: 1499 },
    { name: "Cape Town, South Africa", region: "Africa", distance: 8500, cost: 1499 },
  ];

  const calcCustomCost = (loc: string) => {
    const len = loc.length;
    if (len < 5) return { cost: 199, zone: "Local" };
    if (len < 10) return { cost: 399, zone: "Regional" };
    if (len < 15) return { cost: 699, zone: "National" };
    return { cost: 1199, zone: "International" };
  };

  const handleCitySelect = (city: typeof predefinedCities[0]) => {
    setLocation(city.name);
    setShippingCost(city.cost);
    setShowingDetails(true);
  };

  const handleCustomSubmit = () => {
    if (!customLocation.trim()) return;
    const result = calcCustomCost(customLocation);
    setLocation(customLocation);
    setShippingCost(result.cost);
    setShowingDetails(true);
  };

  return (
    <div>
      <div className="mb-4">
        <p className="text-[10px] text-slate-500 font-mono uppercase mb-2">Select a City</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {predefinedCities.map((city, i) => (
            <button key={i} onClick={() => handleCitySelect(city)} className={`text-left px-3 py-2 rounded-xl border text-xs transition cursor-pointer ${location === city.name ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-300" : "bg-white/5 border-white/10 text-slate-400 hover:border-white/30"}`}>
              <span className="block font-bold">{city.name.split(",")[0]}</span>
              <span className="block text-[9px] text-slate-500">{city.region}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 pt-4">
        <p className="text-[10px] text-slate-500 font-mono uppercase mb-2">Or Enter Custom Location</p>
        <div className="flex gap-2">
          <input type="text" value={customLocation} onChange={e => setCustomLocation(e.target.value)} placeholder="City, Country..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-cyan-500/40" />
          <button onClick={handleCustomSubmit} className="px-4 py-2.5 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer">Calculate</button>
        </div>
      </div>
      {showingDetails && shippingCost && (
        <div className="mt-4 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-mono uppercase">Shipping to</span>
              <p className="text-sm font-bold">{location}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-mono uppercase">Estimated Cost</span>
              <p className="text-xl font-bold text-emerald-400 font-mono">${shippingCost}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-[10px]">
            <div><span className="text-slate-500">Transit Time:</span> <span className="text-white">5-14 business days</span></div>
            <div><span className="text-slate-500">Insurance:</span> <span className="text-white">Included</span></div>
            <div><span className="text-slate-500">Tracking:</span> <span className="text-emerald-400">Live GPS ✓</span></div>
            <div><span className="text-slate-500">Elite Discount:</span> <span className="text-yellow-400">15% OFF</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== INSURANCE SECTION ====================
function InsuranceSection({ user, userBalance, data, fetchWithAuth, onRefresh }: any) {
  const [insuranceLoading, setInsuranceLoading] = useState(false);

  const handlePurchaseInsurance = async (planName: string, premium: number, coverage: number) => {
    if (user.kyc_status !== "verified") { alert("KYC verification required."); return; }
    if ((userBalance || 0) < premium) { alert(`Insufficient balance. Need $${premium}.`); return; }
    setInsuranceLoading(true);
    const carModel = data?.activeVehicle?.model || "BYD Seal";
    try {
      const res = await fetchWithAuth("/api/insurance/purchase", "POST", { carModel, planName, premium, coverage_limit: coverage });
      const json = await res.json();
      if (res.ok) { alert(json.message || "Insurance purchased!"); onRefresh(); }
      else alert(json.error || "Purchase failed");
    } catch { alert("Error"); }
    finally { setInsuranceLoading(false); }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">Insurance</h2>
          <p className="text-xs text-slate-400">Protect your BYD vehicle</p>
        </div>
        <ShieldCheck className="w-6 h-6 text-cyan-400" />
      </div>
      {user.kyc_status !== "verified" ? (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
          <UserCheck className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-sm text-amber-300 font-bold">KYC Required</p>
          <p className="text-xs text-slate-400 mt-1">Complete identity verification to purchase insurance</p>
        </div>
      ) : (
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
              <button onClick={() => handlePurchaseInsurance(plan.name, plan.premium, plan.limit)} disabled={insuranceLoading} className="mt-4 w-full py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer disabled:opacity-40">Purchase</button>
            </div>
          ))}
        </div>
      )}
      {data.insurancePolicies && data.insurancePolicies.length > 0 && (
        <div className="border-t border-white/10 pt-4">
          <h3 className="text-sm font-bold mb-3">Active Policies</h3>
          <div className="space-y-2">
            {data.insurancePolicies.map((p: any, i: number) => (
              <div key={i} className="bg-white/5 rounded-xl p-3 flex items-center justify-between">
                <div><div className="text-sm font-bold">{p.plan_name}</div><div className="text-[10px] text-slate-400">{p.car_model} • {p.policy_number}</div></div>
                <div className="text-right"><div className="text-xs font-bold text-emerald-400">{p.status}</div><div className="text-[10px] text-slate-500">${p.monthly_premium}/mo</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== WITHDRAW SECTION ====================
function WithdrawSection({ authToken, balance, onRefresh }: { authToken: string; balance: number; onRefresh: () => void }) {
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawSource, setWithdrawSource] = useState<"balance" | "investment">("balance");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState("");
  const [withdrawHistory, setWithdrawHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/payments/withdrawals", { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json()).then(d => setWithdrawHistory(Array.isArray(d) ? d : [])).catch(() => {});
  }, [authToken]);

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) < 50) { setWithdrawMsg("Minimum withdrawal: $50"); return; }
    if (!withdrawAddress) { setWithdrawMsg("Enter your crypto wallet address"); return; }
    if (parseFloat(withdrawAmount) > balance) { setWithdrawMsg("Insufficient balance"); return; }
    setWithdrawLoading(true);
    try {
      const res = await fetch("/api/payments/withdraw", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ amount: parseFloat(withdrawAmount), walletAddress: withdrawAddress, source: withdrawSource }) });
      const json = await res.json();
      if (res.ok) { setWithdrawMsg(json.message || "Withdrawal submitted for admin approval!"); setWithdrawAmount(""); onRefresh(); }
      else setWithdrawMsg(json.error || "Failed");
    } catch { setWithdrawMsg("Network error"); }
    finally { setWithdrawLoading(false); }
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
          <span className="text-xs text-slate-400">Available Balance</span>
          <span className="text-lg font-bold text-emerald-400 font-mono">${balance.toFixed(2)}</span>
        </div>
        <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
          <span className="text-xs text-slate-400">Minimum</span>
          <span className="text-lg font-bold text-slate-400 font-mono">$50</span>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Source</label>
          <div className="flex gap-2">
            {["balance", "investment"].map(src => (
              <button key={src} onClick={() => setWithdrawSource(src as any)} className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${withdrawSource === src ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"}`}>
                {src === "balance" ? "Wallet Balance" : "Investment Returns"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Amount (USD)</label>
          <input type="number" min="50" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="Enter amount" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/40" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Crypto Wallet Address (USDT TRC20)</label>
          <input type="text" value={withdrawAddress} onChange={e => setWithdrawAddress(e.target.value)} placeholder="TR7... or 0x..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500/40" />
        </div>
        {withdrawMsg && <div className={`text-xs rounded-xl p-3 ${withdrawMsg.includes("submitted") || withdrawMsg.includes("success") ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{withdrawMsg}</div>}
        <button onClick={handleWithdraw} disabled={withdrawLoading} className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-xl hover:opacity-90 transition cursor-pointer disabled:opacity-40">
          {withdrawLoading ? "Processing..." : "Submit Withdrawal"}
        </button>
      </div>
      {withdrawHistory.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <h4 className="text-[10px] text-slate-500 font-mono uppercase mb-2">Withdrawal History</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {withdrawHistory.map((w: any, i: number) => (
              <div key={i} className="flex justify-between bg-white/5 rounded-lg px-3 py-2 text-[10px]">
                <span className="text-slate-400">${w.amount} {w.source}</span>
                <span className={`${w.status === "confirmed" ? "text-emerald-400" : w.status === "rejected" ? "text-red-400" : "text-amber-400"}`}>{w.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== MYSTERY CAR REVEAL ====================
function MysteryCarReveal({ authToken, onClose, onComplete }: { authToken: string; onClose: () => void; onComplete: () => void }) {
  const [revealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [prize, setPrize] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);
  const [shippingLoc, setShippingLoc] = useState("");
  const [notifEmail, setNotifEmail] = useState("");
  const [msg, setMsg] = useState("");

  const prizes = [
    { type: "car", model: "BYD Dolphin", value: 29900, chance: 25, image: "Dolphin", desc: "Agile urban hatchback" },
    { type: "car", model: "BYD Atto 3", value: 38900, chance: 15, image: "Atto3", desc: "Bold electric SUV" },
    { type: "car", model: "BYD Seal", value: 45900, chance: 8, image: "Seal", desc: "High-performance sedan" },
    { type: "car", model: "BYD Han", value: 52500, chance: 5, image: "Han", desc: "Executive luxury sedan" },
    { type: "car", model: "BYD Super 9", value: 85000, chance: 1, image: "Super9", desc: "Limited edition hypercar" },
    { type: "points", label: "500 Horizon Points", value: 500, chance: 20 },
    { type: "discount", label: "15% off next rental", value: 15, chance: 15 },
    { type: "balance", label: "$50 Balance Credit", value: 50, chance: 10 },
    { type: "insurance", label: "Free 1-Month Insurance", value: 89, chance: 5 },
  ];

  const handleReveal = () => {
    setRevealing(true);
    setTimeout(() => {
      const rand = Math.random() * 100;
      let cumulative = 0;
      let selected = prizes[prizes.length - 1];
      for (const p of prizes) {
        cumulative += p.chance;
        if (rand < cumulative) { selected = p; break; }
      }
      setPrize(selected);
      setRevealed(true);
      setRevealing(false);
    }, 2500);
  };

  const handleClaim = async () => {
    if (prize?.type === "car" && !shippingLoc) { setMsg("Please enter your shipping location"); return; }
    setClaiming(true);
    try {
      const res = await fetch("/api/elite/mystery-claim", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ prize: prize, shippingLocation: shippingLoc, notificationEmail: notifEmail }) });
      const json = await res.json();
      if (res.ok) { setMsg(json.message || "Prize claimed!"); setTimeout(onComplete, 2000); }
      else setMsg(json.error || "Claim failed");
    } catch { setMsg("Network error"); }
    finally { setClaiming(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        {!revealed ? (
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/30 flex items-center justify-center">
              {revealing ? (
                <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
              ) : (
                <Gem className="w-10 h-10 text-purple-400" />
              )}
            </div>
            <h3 className="text-xl font-bold mb-2">Mystery Car Reveal</h3>
            <p className="text-sm text-slate-400 mb-6">As an Elite member, you have a chance to win a BYD vehicle or other prizes!</p>
            {!revealing ? (
              <button onClick={handleReveal} className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:opacity-90 transition cursor-pointer">Reveal Your Prize</button>
            ) : (
              <div className="space-y-3">
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" style={{ width: "60%" }} /></div>
                <p className="text-xs text-slate-500">Unlocking your prize...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-500/20 to-emerald-500/20 border-2 border-yellow-500/30 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-yellow-300 mb-1">Congratulations!</h3>
            <p className="text-sm text-slate-400 mb-4">You won:</p>
            <div className="bg-gradient-to-r from-yellow-500/10 to-emerald-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
              {prize?.type === "car" ? (
                <>
                  <Car className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                  <h4 className="text-lg font-bold text-emerald-300">{prize.model}</h4>
                  <p className="text-xs text-slate-400">${prize.value?.toLocaleString()} value • {prize.desc}</p>
                  <p className="text-[10px] text-emerald-400 mt-2">Pay only shipping costs!</p>
                </>
              ) : (
                <>
                  <GiftIcon className="w-12 h-12 text-purple-400 mx-auto mb-2" />
                  <h4 className="text-lg font-bold text-purple-300">{prize?.label}</h4>
                </>
              )}
            </div>
            {prize?.type === "car" && (
              <div className="space-y-3 text-left">
                <input type="text" value={shippingLoc} onChange={e => setShippingLoc(e.target.value)} placeholder="Shipping city/country" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-cyan-500/40" />
                <input type="email" value={notifEmail} onChange={e => setNotifEmail(e.target.value)} placeholder="Email for tracking updates" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-cyan-500/40" />
              </div>
            )}
            {msg && <div className="text-xs text-emerald-400 mt-2">{msg}</div>}
            <div className="flex gap-2 mt-4">
              <button onClick={onClose} className="flex-1 py-2.5 bg-white/10 text-xs font-bold rounded-xl hover:bg-white/15 transition cursor-pointer">Close</button>
              <button onClick={handleClaim} disabled={claiming} className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-bold rounded-xl hover:opacity-90 transition cursor-pointer disabled:opacity-40">
                {claiming ? "Claiming..." : prize?.type === "car" ? "Claim & Setup Shipping" : "Claim Prize"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== FINANCIAL HUB SECTION ====================
function FinancialHubSection({ user, data, authToken, fetchWithAuth, onRefresh, onNavigate, onKycRequired }: any) {
  const [showMysteryReveal, setShowMysteryReveal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Elite Membership */}
      <div className="bg-white/5 backdrop-blur-xl border border-yellow-500/20 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">Elite Membership</h2>
            <p className="text-xs text-slate-400">Unlock premium benefits — $200/month</p>
          </div>
          <Crown className="w-6 h-6 text-yellow-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {user.membership_active ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                <BadgeCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-emerald-400">Elite Active ✓</p>
                {user.membership_expiry && <p className="text-[10px] text-slate-400 mt-1">Expires: {new Date(user.membership_expiry).toLocaleDateString()}</p>}
              </div>
            ) : (
              <>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-yellow-300 mb-1">$200 / month</h3>
                  <p className="text-[10px] text-slate-400">Cancel anytime</p>
                </div>
                <ul className="space-y-1 text-xs text-slate-300">
                  {["Access to all investments", "Mystery Car reveal game (win a BYD!)", "15% discount on all rentals", "Priority support & dedicated concierge", "Exclusive events & early access"].map((b, i) => (
                    <li key={i} className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-400" /><span>{b}</span></li>
                  ))}
                </ul>
                <button onClick={async () => {
                  if (!user.kyc_status || user.kyc_status !== "verified") { alert("KYC verification required first."); onKycRequired(); return; }
                  if ((user.balance || 0) < 200) { alert("Insufficient balance. Please add funds first."); return; }
                  try { const res = await fetchWithAuth("/api/elite/subscribe", "POST", { planId: "elite", transactionHash: "ELITE-" + Date.now() }); const json = await res.json(); if (res.ok) { alert(json.message || "Elite subscription submitted!"); onRefresh(); } else alert(json.error || "Failed"); } catch { alert("Error"); }
                }} className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-[#0a0e1a] font-bold text-sm rounded-xl hover:opacity-90 transition cursor-pointer">
                  Activate Elite — $200
                </button>
              </>
            )}
            {user.membership_active && (
              <button onClick={() => setShowMysteryReveal(true)} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm rounded-xl hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2">
                <Gem className="w-4 h-4" /> Reveal Your Mystery Car
              </button>
            )}
          </div>
          <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 rounded-xl p-4">
            <h3 className="text-sm font-bold mb-3">Elite Benefits</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs"><span className="text-slate-400">Investment Access</span><span className="text-emerald-400 font-bold">✓</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">Rental Discount</span><span className="text-emerald-400 font-bold">15% OFF</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">Mystery Car Draw</span><span className="text-purple-400 font-bold">✓</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">Priority Support</span><span className="text-emerald-400 font-bold">✓</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Mystery Car Reveal Modal */}
      {showMysteryReveal && (
        <MysteryCarReveal authToken={authToken} onClose={() => setShowMysteryReveal(false)} onComplete={() => { setShowMysteryReveal(false); onRefresh(); }} />
      )}

      {/* Investments */}
      <div className="bg-white/5 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">Investments</h2>
            <p className="text-xs text-slate-400">Elite members only — Maturity-based returns (APY)</p>
          </div>
          <TrendingUp className="w-6 h-6 text-emerald-400" />
        </div>
        {user.membership_active ? (
          <InvestPage authToken={authToken} userBalance={user.balance || 0} onRefresh={onRefresh} />
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
            <Crown className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm text-amber-300 font-bold">Elite Membership Required</p>
            <p className="text-xs text-slate-400 mt-1">Subscribe to Elite ($200/mo) to unlock investments</p>
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="mt-3 px-4 py-2 bg-amber-500/30 rounded-xl text-xs font-bold text-amber-300 cursor-pointer">Activate Elite</button>
          </div>
        )}
      </div>

      {/* Insurance */}
      <InsuranceSection user={user} userBalance={user.balance || 0} data={data} fetchWithAuth={fetchWithAuth} onRefresh={onRefresh} />

      {/* Charitable Donations */}
      <DonationsSection user={user} data={data} fetchWithAuth={fetchWithAuth} onRefresh={onRefresh} onKycRequired={onKycRequired} />

      {/* Withdraw */}
      <WithdrawSection authToken={authToken} balance={user.balance || 0} onRefresh={onRefresh} />
    </div>
  );
}

// ==================== DONATIONS SECTION ====================
function DonationsSection({ user, data, fetchWithAuth, onRefresh, onKycRequired }: any) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold">Charity & Donations</h2>
          <p className="text-xs text-slate-400">Support global causes with your Horizon Points or balance</p>
        </div>
        <HeartHandshake className="w-6 h-6 text-cyan-400" />
      </div>
      {user.kyc_status !== "verified" ? (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
          <UserCheck className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-sm text-amber-300 font-bold">KYC Required</p>
          <p className="text-xs text-slate-400 mt-1">Complete identity verification to make donations</p>
          <button onClick={onKycRequired} className="mt-3 px-4 py-2 bg-amber-500/30 rounded-xl text-xs font-bold text-amber-300 cursor-pointer">Complete KYC</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
              <TreePine className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <div className="text-3xl font-bold font-mono text-emerald-400">{user.carbon_trees_planted || 0}</div>
              <div className="text-xs text-slate-400 mt-1">Trees Planted</div>
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-6 text-center">
              <Coins className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <div className="text-3xl font-bold font-mono text-cyan-400">{(user.horizon_points || 0).toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-1">Available Points</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center">
              <DollarSign className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <div className="text-3xl font-bold font-mono text-amber-400">${(user.balance || 0).toFixed(0)}</div>
              <div className="text-xs text-slate-400 mt-1">Wallet Balance</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Green Earth Initiative", icon: TreePine, color: "emerald", points: 500 },
              { name: "Ocean Cleanup Project", icon: Ship, color: "blue", points: 300 },
              { name: "EV Education Fund", icon: BookOpen, color: "cyan", points: 200 },
            ].map((c, i) => (
              <div key={i} className={`bg-${c.color}-500/5 border border-${c.color}-500/20 rounded-xl p-5 flex flex-col`}>
                <c.icon className={`w-8 h-8 text-${c.color}-400 mb-3`} />
                <h4 className="text-sm font-bold">{c.name}</h4>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                  <span className="text-xs font-mono text-cyan-400">{c.points} pts</span>
                  <button onClick={async () => {
                    if ((user.horizon_points || 0) < c.points) { alert("Insufficient points!"); return; }
                    try { const res = await fetchWithAuth("/api/charity/donate", "POST", { charity_name: c.name, points: c.points }); const json = await res.json(); if (res.ok) { alert(json.message || "Donation successful!"); onRefresh(); } else alert(json.error || "Donation failed"); } catch { alert("Network error"); }
                  }} className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-[10px] text-cyan-300 font-bold hover:bg-cyan-500/30 transition cursor-pointer">Donate</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ==================== HELP CENTER SECTION ====================
function HelpCenterSection({ authToken, chatMessages, chatInput, setChatInput, supportSubject, setSupportSubject, supportMessage, setSupportMessage, supportLoading, handleSupportSubmit, onNavigate }: any) {
  const [localChatInput, setLocalChatInput] = useState("");
  const [localMessages, setLocalMessages] = useState<any[]>(chatMessages || []);

  const handleSend = () => {
    if (!localChatInput.trim()) return;
    setLocalMessages((p: any[]) => [...p, { sender: "user", text: localChatInput, time: "now" }]);
    setLocalChatInput("");
    setTimeout(() => setLocalMessages((p: any[]) => [...p, { sender: "agent", text: "Thank you. A support agent will respond shortly.", time: "now" }]), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Support Chat */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">Live Support</h2>
            <p className="text-xs text-slate-400">Chat with our team or submit a ticket</p>
          </div>
          <HeadphonesIcon className="w-6 h-6 text-cyan-400" />
        </div>
        <div className="bg-[#0a0e1a] rounded-xl border border-white/5 h-56 flex flex-col mb-4">
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {localMessages.length === 0 && <p className="text-xs text-slate-500 text-center py-8">Start a conversation</p>}
            {localMessages.map((msg: any, i: number) => (
              <div key={i} className={`flex gap-2 ${msg.sender === "user" ? "justify-end" : ""}`}>
                {msg.sender !== "user" && <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0"><HeadphonesIcon className="w-3 h-3 text-cyan-400" /></div>}
                <div className={`rounded-xl px-3 py-2 max-w-[80%] ${msg.sender === "user" ? "bg-cyan-500/20" : "bg-white/5"}`}><p className="text-xs">{msg.text}</p></div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 p-2 flex gap-2">
            <input type="text" value={localChatInput} onChange={e => setLocalChatInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500/40" onKeyDown={e => { if (e.key === "Enter") handleSend(); }} />
            <button onClick={handleSend} className="px-3 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg cursor-pointer"><Send className="w-3 h-3 text-cyan-300" /></button>
          </div>
        </div>
        <form onSubmit={handleSupportSubmit} className="space-y-3">
          <input type="text" required value={supportSubject} onChange={e => setSupportSubject(e.target.value)} placeholder="Issue subject" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-cyan-500/40" />
          <textarea required rows={3} value={supportMessage} onChange={e => setSupportMessage(e.target.value)} placeholder="Describe your issue..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-cyan-500/40 resize-none" />
          <button type="submit" disabled={supportLoading} className="w-full py-2.5 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer disabled:opacity-40">{supportLoading ? "Submitting..." : "Submit Ticket"}</button>
        </form>
      </div>

      {/* Telegram + Blog */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#0088cc]/20 flex items-center justify-center shrink-0">
            <Send className="w-7 h-7 text-[#0088cc]" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold">Telegram Help Desk</h3>
            <p className="text-[10px] text-slate-400">Get instant support from our team</p>
          </div>
          <a href="https://t.me/byd_horizon_support" target="_blank" rel="noreferrer" className="px-5 py-2.5 bg-[#0088cc] text-white text-xs font-bold rounded-xl hover:bg-[#0088cc]/90 transition cursor-pointer flex items-center gap-2 whitespace-nowrap">
            <Send className="w-3.5 h-3.5" /> Message Us
          </a>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">BYD News & Blog</h3>
            <BookOpen className="w-4 h-4 text-cyan-400" />
          </div>
          <BlogPostsSection authToken={authToken} onNavigate={onNavigate} />
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-bold mb-3">Quick Help</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { q: "How do I pay with crypto?", a: "Send USDT (TRC20) to your deposit address. Paste the transaction hash for confirmation." },
            { q: "When will my vehicle arrive?", a: "Track live in Tracking & Transit. Admin updates ETA and dispatch status." },
            { q: "How do I earn more points?", a: "Daily check-ins, quizzes, referrals, and Spin Wheel all earn Horizon Points." },
            { q: "What does Elite include?", a: "$200/mo for investments, mystery car game, 15% off rentals, priority support." },
            { q: "How do withdrawals work?", a: "Submit withdrawal request in Financial Hub. Admin confirms and sends crypto." },
            { q: "What is the minimum deposit?", a: "Minimum crypto deposit is $150 USDT (TRC20). Admin confirms all deposits." },
          ].map((item, i) => (
            <div key={i} className="bg-white/5 rounded-xl p-3 cursor-pointer hover:bg-white/10 transition">
              <p className="text-xs font-bold mb-1">{item.q}</p>
              <p className="text-[10px] text-slate-400">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
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

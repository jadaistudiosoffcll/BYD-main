import React, { useState, useEffect } from "react";
import {
  Shield, Users, CreditCard, Car, MapPin, Gift, BookOpen, Gamepad2, Settings,
  Search, Trash2, CheckCircle, X, Ban, RefreshCw, Download, Upload, Award, Send,
  Eye, EyeOff, Plus, Edit, DollarSign, BarChart3, Activity, Bell, Mail,
  MessageSquare, Sparkles, Terminal, KeyRound, ShieldAlert, Lock, UserPlus,
  Coins, Sliders, AlertTriangle, Phone, Megaphone, Filter, ChevronDown,
  ChevronUp, Clock, Globe, Camera, Image, Star, Flag, ToggleLeft,
  ToggleRight, QrCode, HelpCircle, Zap, Leaf, Truck, TrendingUp,
  ArrowUpRight, Crown, Puzzle
} from "lucide-react";

interface AdminPanelProps {
  onNavigate: (view: "landing" | "payment" | "dashboard" | "admin" | "help", params?: any) => void;
  initialToken?: string;
  initialIsAdmin?: boolean;
}

type TabId = "dashboard" | "users" | "payments" | "vehicles" | "tracking" | "rentals" | "investments" | "promos" | "referrals" | "content" | "gamification" | "settings" | "insurance" | "wallets" | "master" | "withdrawals" | "elite" | "mystery";

const TABS: { id: TabId; label: string; icon: React.ComponentType<any> }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "withdrawals", label: "Withdrawals", icon: ArrowUpRight },
  { id: "vehicles", label: "Vehicles", icon: Car },
  { id: "tracking", label: "Tracking", icon: MapPin },
  { id: "rentals", label: "Rentals", icon: Truck },
  { id: "investments", label: "Investments", icon: TrendingUp },
  { id: "elite", label: "Elite", icon: Crown },
  { id: "mystery", label: "Mystery Car", icon: Puzzle },
  { id: "promos", label: "Promos", icon: Gift },
  { id: "referrals", label: "Referrals", icon: Users },
  { id: "content", label: "Content", icon: BookOpen },
  { id: "gamification", label: "Gamification", icon: Gamepad2 },
  { id: "insurance", label: "Insurance", icon: Shield },
  { id: "wallets", label: "Wallets", icon: KeyRound },
  { id: "master", label: "AI Master", icon: Zap },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AdminPanel({ onNavigate, initialToken, initialIsAdmin }: AdminPanelProps) {
  const [isAdmin, setIsAdmin] = useState(!!initialIsAdmin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [adminToken, setAdminToken] = useState(initialToken || "");
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dashboard data
  const [metrics, setMetrics] = useState<any>({});

  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userFilterKyc, setUserFilterKyc] = useState("");
  const [userFilterCountry, setUserFilterCountry] = useState("");
  const [userFilterTier, setUserFilterTier] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", phone: "", password: "", city: "", country: "", tier: "standard" });
  const [createUserMsg, setCreateUserMsg] = useState("");
  const [createUserErr, setCreateUserErr] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUserForm, setEditUserForm] = useState<any>({});
  const [editUserMsg, setEditUserMsg] = useState("");
  const [editUserErr, setEditUserErr] = useState("");

  // Payments
  const [payments, setPayments] = useState<any[]>([]);
  const [payFilterMethod, setPayFilterMethod] = useState("");
  const [payFilterStatus, setPayFilterStatus] = useState("");
  const [payMethods, setPayMethods] = useState<any[]>([]);
  const [payMsg, setPayMsg] = useState("");
  const [payErr, setPayErr] = useState("");
  const [editingPayMethod, setEditingPayMethod] = useState<any>(null);
  const [payMethodForm, setPayMethodForm] = useState({ name: "", enabled: true, fee: "", address: "" });

  // Vehicles
  const [cars, setCars] = useState<any[]>([]);
  const [showCarForm, setShowCarForm] = useState(false);
  const [carForm, setCarForm] = useState({ name: "", model: "", year: "", image: "", status: "Available", rental_price: "", description: "", type: "", range_km: "", seats: 5 });
  const [editingCar, setEditingCar] = useState<any>(null);
  const [carMsg, setCarMsg] = useState("");
  const [carErr, setCarErr] = useState("");

  // Tracking
  const [tracking, setTracking] = useState<any[]>([]);
  const [delays, setDelays] = useState<any[]>([]);
  const [trackingMsg, setTrackingMsg] = useState("");
  const [delayForm, setDelayForm] = useState({ reason: "", duration_minutes: 60, affected_user_id: "" });
  const [editingDelay, setEditingDelay] = useState<any>(null);
  const [showDelayForm, setShowDelayForm] = useState(false);

  // Referrals
  const [referrals, setReferrals] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [refMsg, setRefMsg] = useState("");
  const [awardForm, setAwardForm] = useState({ user_id: "", points: 100, reason: "" });

  // Content
  const [blogs, setBlogs] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [carousel, setCarousel] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [webcams, setWebcams] = useState<any[]>([]);
  const [contentMsg, setContentMsg] = useState("");
  const [blogForm, setBlogForm] = useState({ title: "", content: "", image: "", published: true });
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState({ name: "", text: "", rating: 5, avatar: "" });
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [carouselForm, setCarouselForm] = useState({ title: "", image: "", link: "", active: true });
  const [showCarouselForm, setShowCarouselForm] = useState(false);
  const [webcamForm, setWebcamForm] = useState({ name: "", stream_url: "", location: "", active: true });
  const [showWebcamForm, setShowWebcamForm] = useState(false);

  // Gamification
  const [gamification, setGamification] = useState<any>({});
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [gamMsg, setGamMsg] = useState("");
  const [quizForm, setQuizForm] = useState({ question: "", options: ["", "", "", ""], correct: 0 });
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);

  // Settings
  const [settings, setSettings] = useState<any>({});
  const [changePassForm, setChangePassForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsErr, setSettingsErr] = useState("");

  // Insurance Tiers
  const [insuranceTiers, setInsuranceTiers] = useState<any[]>([]);
  const [insurancePolicies, setInsurancePolicies] = useState<any[]>([]);
  const [insuranceForm, setInsuranceForm] = useState({ name: "", daily_rate: "", coverage_limit: "", deductible: "", description: "" });
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<any>(null);
  const [insuranceMsg, setInsuranceMsg] = useState("");

  // Wallets
  const [wallets, setWallets] = useState<any>({ methods: [], global_wallet: "" });
  const [globalWalletForm, setGlobalWalletForm] = useState("");
  const [walletMsg, setWalletMsg] = useState("");
  const [userWalletSearch, setUserWalletSearch] = useState("");
  const [userWalletResults, setUserWalletResults] = useState<any[]>([]);
  const [editingUserWallet, setEditingUserWallet] = useState<any>(null);
  const [userWalletAddr, setUserWalletAddr] = useState("");

  // Master AI
  const [masterStatus, setMasterStatus] = useState<any>({ status: "disconnected" });
  const [masterWebhook, setMasterWebhook] = useState("");
  const [masterMsg, setMasterMsg] = useState("");

  // Withdrawals
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [wdMsg, setWdMsg] = useState("");

  // Elite members
  const [eliteRequests, setEliteRequests] = useState<any[]>([]);
  const [eliteMsg, setEliteMsg] = useState("");

  // Mystery car prizes
  const [mysteryPrizes, setMysteryPrizes] = useState<any[]>([]);
  const [mysteryMsg, setMysteryMsg] = useState("");

  // Revenue & Fraud
  const [revenue, setRevenue] = useState<any>({});
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);

  const headers = () => ({ "Authorization": `Bearer ${adminToken}`, "Content-Type": "application/json" });
  const headersNoCT = () => ({ "Authorization": `Bearer ${adminToken}` });

  const showMsg = (setter: any, msg: string) => { setter(msg); setTimeout(() => setter(""), 3000); };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/metrics", { headers: headersNoCT() });
      if (res.ok) setMetrics(await res.json());
      loadRevenue();
      loadFraudAlerts();
    } catch {} finally { setLoading(false); }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", { headers: headersNoCT() });
      if (res.ok) setUsers(await res.json());
    } catch {}
  };

  const loadPayments = async () => {
    try {
      const [res, resM] = await Promise.all([
        fetch("/api/admin/payments", { headers: headersNoCT() }),
        fetch("/api/admin/payment-methods", { headers: headersNoCT() })
      ]);
      if (res.ok) setPayments(await res.json());
      if (resM.ok) setPayMethods(await resM.json());
    } catch {}
  };

  const loadCars = async () => {
    try {
      const res = await fetch("/api/admin/cars", { headers: headersNoCT() });
      if (res.ok) setCars(await res.json());
    } catch {}
  };

  const loadTracking = async () => {
    try {
      const [resT, resD] = await Promise.all([
        fetch("/api/admin/tracking", { headers: headersNoCT() }),
        fetch("/api/admin/delays", { headers: headersNoCT() })
      ]);
      if (resT.ok) setTracking(await resT.json());
      if (resD.ok) setDelays(await resD.json());
    } catch {}
  };

  const loadReferrals = async () => {
    try {
      const res = await fetch("/api/admin/referrals", { headers: headersNoCT() });
      if (res.ok) setReferrals(await res.json());
    } catch {}
  };

  const loadContent = async () => {
    try {
      const [resB, resC, resCa, resT, resW] = await Promise.all([
        fetch("/api/admin/blogs", { headers: headersNoCT() }),
        fetch("/api/admin/comments", { headers: headersNoCT() }),
        fetch("/api/admin/carousel", { headers: headersNoCT() }),
        fetch("/api/admin/testimonials", { headers: headersNoCT() }),
        fetch("/api/admin/webcams", { headers: headersNoCT() })
      ]);
      if (resB.ok) setBlogs(await resB.json());
      if (resC.ok) setComments(await resC.json());
      if (resCa.ok) setCarousel(await resCa.json());
      if (resT.ok) setTestimonials(await resT.json());
      if (resW.ok) setWebcams(await resW.json());
    } catch {}
  };

  const loadGamification = async () => {
    try {
      const [resG, resQ] = await Promise.all([
        fetch("/api/admin/gamification", { headers: headersNoCT() }),
        fetch("/api/admin/quiz-questions", { headers: headersNoCT() })
      ]);
      if (resG.ok) setGamification(await resG.json());
      if (resQ.ok) setQuizQuestions(await resQ.json());
    } catch {}
  };

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings", { headers: headersNoCT() });
      if (res.ok) setSettings(await res.json());
    } catch {}
  };

  // Rentals state
  const [rentals, setRentals] = useState<any[]>([]);
  // Investments state
  const [investments, setInvestments] = useState<any[]>([]);
  const [investmentOptions, setInvestmentOptions] = useState<any[]>([]);
  // Promos state
  const [promos, setPromos] = useState<any[]>([]);
  const [promoForm, setPromoForm] = useState({ name: "", type: "bonus", discount_percent: 0, bonus_points: 0, start_date: "", end_date: "", description: "" });

  const loadRentals = async () => {
    try { const res = await fetch("/api/admin/rentals", { headers: headersNoCT() }); const data = await res.json(); setRentals(data); } catch {}
  };
  const loadInvestments = async () => {
    try { const [invRes, optRes] = await Promise.all([fetch("/api/admin/investments", { headers: headersNoCT() }), fetch("/api/investments/options")]); setInvestments(await invRes.json()); setInvestmentOptions(await optRes.json()); } catch {}
  };
  const loadPromos = async () => {
    try { const res = await fetch("/api/admin/promos", { headers: headersNoCT() }); setPromos(await res.json()); } catch {}
  };

  const loadInsuranceTiers = async () => {
    try { const res = await fetch("/api/admin/insurance-tiers", { headers: headersNoCT() }); setInsuranceTiers(await res.json()); } catch {}
    try { const res = await fetch("/api/admin/insurance-policies", { headers: headersNoCT() }); if (res.ok) setInsurancePolicies(await res.json()); } catch {}
  };
  const loadWallets = async () => {
    try { const res = await fetch("/api/admin/wallets", { headers: headersNoCT() }); const data = await res.json(); setWallets(data); setGlobalWalletForm(data.global_wallet || ""); } catch {}
  };
  const loadMaster = async () => {
    try { const res = await fetch("/api/admin/master-status", { headers: headersNoCT() }); setMasterStatus(await res.json()); } catch {}
  };
  const searchUsersForWallet = async () => {
    if (!userWalletSearch.trim()) return;
    try { const res = await fetch(`/api/admin/users?search=${encodeURIComponent(userWalletSearch)}`, { headers: headersNoCT() }); if (res.ok) setUserWalletResults(await res.json()); } catch {}
  };
  const loadRevenue = async () => {
    try { const res = await fetch("/api/admin/revenue", { headers: headersNoCT() }); if (res.ok) setRevenue(await res.json()); } catch {}
  };
  const loadFraudAlerts = async () => {
    try { const res = await fetch("/api/admin/fraud-alerts", { headers: headersNoCT() }); if (res.ok) { const data = await res.json(); setFraudAlerts(data.alerts || []); } } catch {}
  };

  const loadWithdrawals = async () => {
    try { const res = await fetch("/api/admin/withdrawals", { headers: headersNoCT() }); if (res.ok) setWithdrawals(await res.json()); } catch {}
  };
  const loadEliteRequests = async () => {
    try { const res = await fetch("/api/admin/elite-requests", { headers: headersNoCT() }); if (res.ok) setEliteRequests(await res.json()); } catch {}
  };
  const loadMysteryPrizes = async () => {
    try { const res = await fetch("/api/admin/mystery-prizes", { headers: headersNoCT() }); if (res.ok) setMysteryPrizes(await res.json()); } catch {}
  };

  useEffect(() => {
    if (!isAdmin || !adminToken) return;
    switch (activeTab) {
      case "dashboard": loadDashboard(); break;
      case "users": loadUsers(); break;
      case "payments": loadPayments(); break;
      case "withdrawals": loadWithdrawals(); break;
      case "vehicles": loadCars(); break;
      case "tracking": loadTracking(); break;
      case "rentals": loadRentals(); break;
      case "investments": loadInvestments(); break;
      case "elite": loadEliteRequests(); break;
      case "mystery": loadMysteryPrizes(); break;
      case "promos": loadPromos(); break;
      case "referrals": loadReferrals(); break;
      case "content": loadContent(); break;
      case "gamification": loadGamification(); break;
      case "insurance": loadInsuranceTiers(); break;
      case "wallets": loadWallets(); break;
      case "master": loadMaster(); break;
      case "settings": loadSettings(); break;
    }
  }, [activeTab, isAdmin, adminToken]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLogin("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) { setAdminToken(data.token); setIsAdmin(true); }
      else setErrorLogin(data.error || "Access denied.");
    } catch { setErrorLogin("Connection failure."); }
  };

  // ── Users ──
  const handleDeleteUser = async (id: number) => {
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE", headers: headersNoCT() });
      if (res.ok) loadUsers();
      else { const d = await res.json(); alert(d.error || "Delete failed."); }
    } catch { alert("Network error."); }
  };

  const handleToggleUserStatus = async (id: number, current: string) => {
    const next = current === "blocked" ? "active" : "blocked";
    try {
      await fetch(`/api/admin/users/${id}/status`, { method: "POST", headers: headers(), body: JSON.stringify({ status: next }) });
      loadUsers();
    } catch { alert("Failed to change status."); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserErr(""); setCreateUserMsg("");
    try {
      const res = await fetch("/api/admin/users", { method: "POST", headers: headers(), body: JSON.stringify(newUser) });
      const d = await res.json();
      if (res.ok) {
        showMsg(setCreateUserMsg, `User ${newUser.name} created.`);
        setNewUser({ name: "", email: "", phone: "", password: "", city: "", country: "", tier: "standard" });
        setShowCreateUser(false);
        loadUsers();
      } else setCreateUserErr(d.error || "Create failed.");
    } catch { setCreateUserErr("Network error."); }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditUserErr(""); setEditUserMsg("");
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}/edit`, { method: "POST", headers: headers(), body: JSON.stringify(editUserForm) });
      const d = await res.json();
      if (res.ok) {
        showMsg(setEditUserMsg, "User updated.");
        setEditingUser(null);
        loadUsers();
      } else setEditUserErr(d.error || "Update failed.");
    } catch { setEditUserErr("Network error."); }
  };

  const handleResetPassword = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, { method: "POST", headers: headers() });
      const d = await res.json();
      if (res.ok) alert(`Password reset. New password: ${d.new_password || "check logs"}`);
      else alert(d.error || "Reset failed.");
    } catch { alert("Network error."); }
  };

  // ── Payments ──
  const handleConfirmPayment = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/payments/${id}/confirm`, { method: "POST", headers: headers() });
      if (res.ok) { showMsg(setPayMsg, "Payment confirmed."); loadPayments(); }
      else { const d = await res.json(); setPayErr(d.error || "Confirm failed."); }
    } catch { setPayErr("Network error."); }
  };

  const handleRefundPayment = async (id: number) => {
    if (!window.confirm("Refund this payment?")) return;
    try {
      const res = await fetch(`/api/admin/payments/${id}/refund`, { method: "POST", headers: headers() });
      if (res.ok) { showMsg(setPayMsg, "Payment refunded."); loadPayments(); }
      else { const d = await res.json(); setPayErr(d.error || "Refund failed."); }
    } catch { setPayErr("Network error."); }
  };

  const handleSavePayMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = { ...payMethodForm, id: editingPayMethod?.id };
      const res = await fetch(`/api/admin/payment-methods/${editingPayMethod?.id || ""}`, {
        method: "POST", headers: headers(), body: JSON.stringify(body)
      });
      if (res.ok) { showMsg(setPayMsg, editingPayMethod ? "Payment method updated." : "Payment method created."); setEditingPayMethod(null); loadPayments(); }
      else { const d = await res.json(); setPayErr(d.error || "Save failed."); }
    } catch { setPayErr("Network error."); }
  };

  // ── Vehicles ──
  const handleSaveCar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarErr(""); setCarMsg("");
    try {
      const url = editingCar ? `/api/admin/cars/${editingCar.id}` : "/api/admin/cars";
      const body = { ...carForm, rental_price_per_day: carForm.rental_price || 0 };
      const res = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(body) });
      const d = await res.json();
      if (res.ok) {
        showMsg(setCarMsg, editingCar ? "Car updated." : "Car added.");
        setShowCarForm(false); setEditingCar(null);
        setCarForm({ name: "", model: "", year: "", image: "", status: "Available", rental_price: "", description: "", type: "", range_km: "", seats: 5 });
        loadCars();
      } else setCarErr(d.error || "Save failed.");
    } catch { setCarErr("Network error."); }
  };

  const handleDeleteCar = async (id: number) => {
    if (!window.confirm("Delete this car?")) return;
    try {
      const res = await fetch(`/api/admin/cars/${id}`, { method: "DELETE", headers: headersNoCT() });
      if (res.ok) loadCars();
      else alert("Delete failed.");
    } catch { alert("Network error."); }
  };

  const handleUploadCarImage = async (carId: number, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(`/api/admin/cars/${carId}/image`, { method: "POST", headers: { "Authorization": `Bearer ${adminToken}` }, body: formData });
      if (res.ok) { showMsg(setCarMsg, "Image uploaded."); loadCars(); }
      else alert("Upload failed.");
    } catch { alert("Network error."); }
  };

  // ── Tracking ──
  const handleUpdateRoute = async (userId: number, routeIndex: number) => {
    try {
      const res = await fetch(`/api/admin/tracking/${userId}`, { method: "POST", headers: headers(), body: JSON.stringify({ route_index: routeIndex }) });
      if (res.ok) { showMsg(setTrackingMsg, "Route updated."); loadTracking(); }
      else { const d = await res.json(); alert(d.error || "Update failed."); }
    } catch { alert("Network error."); }
  };

  const handleDispatch = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/tracking/${userId}/dispatch`, { method: "POST", headers: headers() });
      if (res.ok) { showMsg(setTrackingMsg, "Dispatch notification sent."); }
      else { const d = await res.json(); alert(d.error || "Dispatch failed."); }
    } catch { alert("Network error."); }
  };

  const handleSaveDelay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = editingDelay ? { ...delayForm, id: editingDelay.id } : delayForm;
      const url = editingDelay ? `/api/admin/delays/${editingDelay.id}/update` : "/api/admin/delays";
      const res = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(body) });
      if (res.ok) {
        showMsg(setTrackingMsg, editingDelay ? "Delay updated." : "Delay created.");
        setShowDelayForm(false); setEditingDelay(null);
        setDelayForm({ reason: "", duration_minutes: 60, affected_user_id: "" });
        loadTracking();
      } else { const d = await res.json(); alert(d.error || "Save failed."); }
    } catch { alert("Network error."); }
  };

  const handleDeleteDelay = async (id: number) => {
    if (!window.confirm("Delete this delay event?")) return;
    try {
      await fetch(`/api/admin/delays/${id}`, { method: "DELETE", headers: headersNoCT() });
      loadTracking();
    } catch { alert("Network error."); }
  };

  // ── Referrals ──
  const handleInjectLeaderboard = async () => {
    const name = window.prompt("Enter sample leaderboard name:");
    if (!name) return;
    const points = window.prompt("Enter points:");
    if (!points) return;
    try {
      await fetch("/api/admin/leaderboard", { method: "POST", headers: headers(), body: JSON.stringify({ name, points: parseInt(points) }) });
      showMsg(setRefMsg, "Leaderboard entry injected.");
    } catch { alert("Network error."); }
  };

  const handleInjectReferral = async () => {
    const referrer = window.prompt("Referrer name:");
    if (!referrer) return;
    const referee = window.prompt("Referee name:");
    if (!referee) return;
    try {
      await fetch("/api/admin/referrals/inject", { method: "POST", headers: headers(), body: JSON.stringify({ referrer, referee }) });
      showMsg(setRefMsg, "Referral injected.");
      loadReferrals();
    } catch { alert("Network error."); }
  };

  const handleAwardPoints = async () => {
    if (!awardForm.user_id || !awardForm.points) return;
    try {
      await fetch("/api/admin/award-points", { method: "POST", headers: headers(), body: JSON.stringify(awardForm) });
      showMsg(setRefMsg, `Awarded ${awardForm.points} points.`);
      setAwardForm({ user_id: "", points: 100, reason: "" });
    } catch { alert("Network error."); }
  };

  // ── Content ──
  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingBlog ? `/api/admin/blogs/${editingBlog.id}` : "/api/admin/blogs";
      const res = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(blogForm) });
      if (res.ok) {
        showMsg(setContentMsg, editingBlog ? "Blog updated." : "Blog created.");
        setShowBlogForm(false); setEditingBlog(null);
        setBlogForm({ title: "", content: "", image: "", published: true });
        loadContent();
      } else alert("Save failed.");
    } catch { alert("Network error."); }
  };

  const handleDeleteBlog = async (id: number) => {
    if (!window.confirm("Delete this blog post?")) return;
    try {
      await fetch(`/api/admin/blogs/${id}`, { method: "DELETE", headers: headersNoCT() });
      loadContent();
    } catch { alert("Network error."); }
  };

  const handleApproveComment = async (id: number) => {
    try {
      await fetch(`/api/admin/comments/${id}/approve`, { method: "POST", headers: headers() });
      showMsg(setContentMsg, "Comment approved.");
      loadContent();
    } catch { alert("Network error."); }
  };

  const handleDeleteComment = async (id: number) => {
    try {
      await fetch(`/api/admin/comments/${id}/delete`, { method: "POST", headers: headers() });
      showMsg(setContentMsg, "Comment deleted.");
      loadContent();
    } catch { alert("Network error."); }
  };

  const handleSaveCarousel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/admin/carousel", { method: "POST", headers: headers(), body: JSON.stringify(carouselForm) });
      showMsg(setContentMsg, "Carousel slide saved.");
      setShowCarouselForm(false);
      setCarouselForm({ title: "", image: "", link: "", active: true });
      loadContent();
    } catch { alert("Network error."); }
  };

  const handleDeleteCarousel = async (id: number) => {
    try {
      await fetch(`/api/admin/carousel/${id}`, { method: "DELETE", headers: headersNoCT() });
      loadContent();
    } catch { alert("Network error."); }
  };

  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/admin/testimonials", { method: "POST", headers: headers(), body: JSON.stringify(testimonialForm) });
      showMsg(setContentMsg, "Testimonial saved.");
      setShowTestimonialForm(false);
      setTestimonialForm({ name: "", text: "", rating: 5, avatar: "" });
      loadContent();
    } catch { alert("Network error."); }
  };

  const handleDeleteTestimonial = async (id: number) => {
    try {
      await fetch(`/api/admin/testimonials/${id}`, { method: "DELETE", headers: headersNoCT() });
      loadContent();
    } catch { alert("Network error."); }
  };

  const handleSaveWebcam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/admin/webcams", { method: "POST", headers: headers(), body: JSON.stringify(webcamForm) });
      showMsg(setContentMsg, "Webcam saved.");
      setShowWebcamForm(false);
      setWebcamForm({ name: "", stream_url: "", location: "", active: true });
      loadContent();
    } catch { alert("Network error."); }
  };

  const handleDeleteWebcam = async (id: number) => {
    try {
      await fetch(`/api/admin/webcams/${id}`, { method: "DELETE", headers: headersNoCT() });
      loadContent();
    } catch { alert("Network error."); }
  };

  // ── Gamification ──
  const handleToggleFeature = async (key: string, value: boolean) => {
    try {
      await fetch(`/api/admin/gamification/${key}`, { method: "POST", headers: headers(), body: JSON.stringify({ enabled: value }) });
      showMsg(setGamMsg, `${key} ${value ? "enabled" : "disabled"}.`);
      loadGamification();
    } catch { alert("Network error."); }
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingQuiz ? `/api/admin/quiz-questions/${editingQuiz.id}` : "/api/admin/quiz-questions";
      const res = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(quizForm) });
      if (res.ok) {
        showMsg(setGamMsg, editingQuiz ? "Quiz question updated." : "Quiz question created.");
        setShowQuizForm(false); setEditingQuiz(null);
        setQuizForm({ question: "", options: ["", "", "", ""], correct: 0 });
        loadGamification();
      } else alert("Save failed.");
    } catch { alert("Network error."); }
  };

  const handleDeleteQuiz = async (id: number) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await fetch(`/api/admin/quiz-questions/${id}`, { method: "DELETE", headers: headersNoCT() });
      loadGamification();
    } catch { alert("Network error."); }
  };

  // ── Settings ──
  const handleSaveSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings", { method: "POST", headers: headers(), body: JSON.stringify(settings) });
      if (res.ok) showMsg(setSettingsMsg, "Settings saved.");
      else { const d = await res.json(); setSettingsErr(d.error || "Save failed."); }
    } catch { setSettingsErr("Network error."); }
  };

  const handleMaintenanceToggle = async () => {
    try {
      await fetch("/api/admin/maintenance", { method: "POST", headers: headers(), body: JSON.stringify({ enabled: !settings.maintenance_mode }) });
      setSettings({ ...settings, maintenance_mode: !settings.maintenance_mode });
      showMsg(setSettingsMsg, `Maintenance ${settings.maintenance_mode ? "disabled" : "enabled"}.`);
    } catch { alert("Network error."); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changePassForm.new_password !== changePassForm.confirm_password) { setSettingsErr("Passwords don't match."); return; }
    try {
      const res = await fetch("/api/admin/change-password", { method: "POST", headers: headers(), body: JSON.stringify({ current_password: changePassForm.current_password, new_password: changePassForm.new_password }) });
      if (res.ok) { showMsg(setSettingsMsg, "Password changed."); setChangePassForm({ current_password: "", new_password: "", confirm_password: "" }); }
      else { const d = await res.json(); setSettingsErr(d.error || "Change failed."); }
    } catch { setSettingsErr("Network error."); }
  };

  const handleSetup2FA = async () => {
    try {
      const res = await fetch("/api/admin/setup-2fa", { method: "POST", headers: headers() });
      const d = await res.json();
      if (res.ok) alert(`2FA setup: ${d.secret || d.qr_code_url || "Check authenticator app."}`);
      else alert(d.error || "2FA setup failed.");
    } catch { alert("Network error."); }
  };

  const filteredUsers = users.filter((u: any) => {
    const q = userSearch.toLowerCase().trim();
    if (q && !(u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q))) return false;
    if (userFilterKyc && u.kyc_status !== userFilterKyc) return false;
    if (userFilterCountry && u.country !== userFilterCountry) return false;
    if (userFilterTier && u.membership_tier !== userFilterTier) return false;
    return true;
  });

  const filteredPayments = payments.filter((p: any) => {
    if (payFilterMethod && p.method !== payFilterMethod) return false;
    if (payFilterStatus && p.status !== payFilterStatus) return false;
    return true;
  });

  // ── Login Screen ──
  if (!isAdmin) {
    return (
      <div className="w-full max-w-md mx-auto my-12 bg-[#0d1117] border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center space-y-3 mb-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#00E5FF]" />
          </div>
          <h2 className="text-xl font-bold text-white">BYD Horizon Club Admin</h2>
          <p className="text-xs text-white/40 font-mono uppercase tracking-wider">God Mode Console</p>
        </div>
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/60 font-mono">Username</label>
            <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Admin username"
              className="w-full bg-[#0a0e1a] border border-white/10 p-3 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#00E5FF]/50 focus:ring-1 focus:ring-[#00E5FF]/20" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/60 font-mono">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full bg-[#0a0e1a] border border-white/10 p-3 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#00E5FF]/50 focus:ring-1 focus:ring-[#00E5FF]/20" />
          </div>
          {errorLogin && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[11px] font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorLogin}</span>
            </div>
          )}
          <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#00E5FF] to-blue-600 hover:from-[#00E5FF]/90 hover:to-blue-500 text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition shadow-lg cursor-pointer shadow-[#00E5FF]/10 hover:shadow-[#00E5FF]/20">
            Authenticate
          </button>
        </form>
        <div className="mt-6 border-t border-white/5 pt-4 text-center">
          <button onClick={() => onNavigate("landing")} className="text-[10px] text-white/40 font-mono hover:text-white/80 transition cursor-pointer">
            ← Return to homepage
          </button>
        </div>
      </div>
    );
  }

  const TabIcon = TABS.find(t => t.id === activeTab)?.icon || Shield;

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-[#0a0e1a]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-1.5 hover:bg-white/5 rounded-lg transition">
              <ChevronDown className={`w-4 h-4 transition-transform ${sidebarOpen ? "rotate-180" : ""}`} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-[#00E5FF] to-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#0a0e1a]" />
              </div>
              <span className="text-sm font-bold hidden sm:inline">Admin Console</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { const l = { dashboard: loadDashboard, users: loadUsers, payments: loadPayments, vehicles: loadCars, tracking: loadTracking, referrals: loadReferrals, content: loadContent, gamification: loadGamification, settings: loadSettings, rentals: loadRentals, investments: loadInvestments, promos: loadPromos, insurance: loadInsuranceTiers, wallets: loadWallets, master: loadMaster }[activeTab]; if (l) l(); }} disabled={loading}
              className="p-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] uppercase font-bold tracking-wider text-white/70 flex items-center gap-1.5 cursor-pointer transition disabled:opacity-40">
              <RefreshCw className={`w-3.5 h-3.5 text-[#00E5FF] ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={() => { setIsAdmin(false); setAdminToken(""); }} className="p-2 px-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl text-[10px] uppercase font-bold text-red-400 cursor-pointer transition">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? "block" : "hidden"} lg:block w-56 shrink-0 border-r border-white/5 min-h-[calc(100vh-57px)] bg-[#0a0e1a]/50`}>
          <nav className="p-3 space-y-1 sticky top-[57px]">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20"
                      : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-hidden">
          {/* Tab Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
            <TabIcon className="w-5 h-5 text-[#00E5FF]" />
            <h2 className="text-lg font-bold">{TABS.find(t => t.id === activeTab)?.label || activeTab}</h2>
          </div>

          {/* ═══ DASHBOARD ═══ */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Users", value: metrics.total_users || 0, icon: Users, color: "text-blue-400" },
                  { label: "Total Revenue", value: metrics.total_revenue ? `$${Number(metrics.total_revenue).toLocaleString()}` : "$0", icon: DollarSign, color: "text-emerald-400" },
                  { label: "Pending KYC", value: metrics.pending_kyc || 0, icon: AlertTriangle, color: "text-amber-400" },
                  { label: "Active Rentals", value: metrics.active_rentals || 0, icon: Car, color: "text-cyan-400" },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 bg-white/5 rounded-xl ${s.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-white/40 font-mono">{s.label}</p>
                          <p className="text-xl font-bold mt-0.5">{s.value}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#00E5FF]" /> Recent Activity
                  </h3>
                  {metrics.recent_activity?.length > 0 ? metrics.recent_activity.slice(0, 8).map((a: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                      <span className="text-white/70">{a.action || a.description}</span>
                      <span className="text-white/40 font-mono">{a.created_at ? new Date(a.created_at).toLocaleDateString() : ""}</span>
                    </div>
                  )) : <p className="text-xs text-white/40">No recent activity.</p>}
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#00E5FF]" /> Revenue Chart
                  </h3>
                  {metrics.revenue_chart?.length > 0 ? metrics.revenue_chart.map((d: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 text-xs">
                      <span className="w-20 text-white/50 font-mono">{d.label || d.date}</span>
                      <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#00E5FF] to-blue-500 rounded-full" style={{ width: `${Math.min(100, (d.value / (metrics.revenue_chart?.[0]?.value || 1)) * 100)}%` }} />
                      </div>
                      <span className="text-white/70 font-mono w-16 text-right">${(d.value ?? 0).toLocaleString()}</span>
                    </div>
                  )) : <p className="text-xs text-white/40">No chart data.</p>}
                </div>
              </div>

              {/* Revenue Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Deposits Confirmed", value: `$${(revenue.total_deposits || 0).toLocaleString()}`, color: "text-emerald-400" },
                  { label: "Transaction Fees (1%)", value: `$${(revenue.transaction_fees || 0).toLocaleString()}`, color: "text-cyan-400" },
                  { label: "Elite Revenue", value: `$${(revenue.elite_revenue || 0).toLocaleString()}`, color: "text-purple-400" },
                  { label: "Insurance Revenue", value: `$${(revenue.insurance_revenue || 0).toLocaleString()}`, color: "text-amber-400" },
                ].map((s, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 font-mono">{s.label}</p>
                    <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Fraud Alerts */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" /> Fraud Detection Alerts
                  {fraudAlerts.length > 0 && <span className="ml-auto text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded-full">{fraudAlerts.length} alerts</span>}
                </h3>
                {fraudAlerts.length > 0 ? fraudAlerts.map((a, i) => (
                  <div key={i} className={`flex items-center justify-between py-2.5 border-b border-white/5 text-xs ${a.severity === 'critical' ? 'text-red-400' : a.severity === 'high' ? 'text-amber-400' : 'text-white/70'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${a.severity === 'critical' ? 'bg-red-400 animate-pulse' : a.severity === 'high' ? 'bg-amber-400' : 'bg-white/30'}`}></span>
                      <span className="font-mono text-[10px] uppercase">{(a.type || '').replace(/_/g, ' ')}</span>
                      <span>{a.message}</span>
                    </div>
                    <div className="flex gap-1">
                      {a.user_id && <button onClick={async () => { await fetch("/api/admin/fraud-action", { method: "POST", headers: headers(), body: JSON.stringify({ userId: a.user_id, action: 'block', reason: a.message }) }); loadFraudAlerts(); }}
                        className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[10px] hover:bg-red-500/20 cursor-pointer">Block</button>}
                    </div>
                  </div>
                )) : <p className="text-xs text-white/40">No fraud alerts detected.</p>}
              </div>
            </div>
          )}

          {/* ═══ USERS ═══ */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 items-center bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                  <input type="text" placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)}
                    className="w-full bg-[#0a0e1a] border border-white/10 pl-9 pr-4 py-2 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#00E5FF]/50" />
                </div>
                <select value={userFilterKyc} onChange={e => setUserFilterKyc(e.target.value)} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs text-white font-mono outline-none focus:border-[#00E5FF]/50 cursor-pointer">
                  <option value="">All KYC</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="not_submitted">Not Submitted</option>
                </select>
                <select value={userFilterTier} onChange={e => setUserFilterTier(e.target.value)} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs text-white font-mono outline-none focus:border-[#00E5FF]/50 cursor-pointer">
                  <option value="">All Tiers</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="vip">VIP</option>
                </select>
                <button onClick={() => setShowCreateUser(!showCreateUser)}
                  className="px-4 py-2 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-[#00E5FF]/20 transition cursor-pointer flex items-center gap-2">
                  <UserPlus className="w-3.5 h-3.5" /> {showCreateUser ? "Cancel" : "Create User"}
                </button>
                <a href="/api/admin/users/csv" className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-emerald-500/20 transition cursor-pointer flex items-center gap-2">
                  <Download className="w-3.5 h-3.5" /> Export
                </a>
              </div>

              {/* Create User Form */}
              {showCreateUser && (
                <form onSubmit={handleCreateUser} className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl space-y-3">
                  <h3 className="text-sm font-bold flex items-center gap-2"><UserPlus className="w-4 h-4 text-[#00E5FF]" /> Create New User</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" placeholder="Full Name" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                      className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="email" placeholder="Email" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                      className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="text" placeholder="Phone" required value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                      className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="text" placeholder="Password" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                      className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="text" placeholder="City" value={newUser.city} onChange={e => setNewUser({ ...newUser, city: e.target.value })}
                      className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="text" placeholder="Country" value={newUser.country} onChange={e => setNewUser({ ...newUser, country: e.target.value })}
                      className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]/50" />
                  </div>
                  {createUserErr && <p className="text-xs text-red-400">{createUserErr}</p>}
                  {createUserMsg && <p className="text-xs text-emerald-400">{createUserMsg}</p>}
                  <button type="submit" className="px-5 py-2 bg-[#00E5FF] text-[#0a0e1a] font-bold uppercase text-[10px] tracking-wider rounded-xl hover:bg-[#00E5FF]/90 transition cursor-pointer">
                    Create User
                  </button>
                </form>
              )}

              {/* Users Table */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-white/5 border-b border-white/10 text-white/40 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3 text-left font-mono">Name</th>
                        <th className="p-3 text-left font-mono">Email</th>
                        <th className="p-3 text-left font-mono">KYC</th>
                        <th className="p-3 text-left font-mono">Tier</th>
                        <th className="p-3 text-left font-mono">Points</th>
                        <th className="p-3 text-left font-mono">Status</th>
                        <th className="p-3 text-center font-mono">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-white/30">No users found.</td></tr>
                      ) : filteredUsers.map((u: any) => (
                        <tr key={u.id} className="hover:bg-white/5 transition">
                          <td className="p-3"><span className="font-semibold">{u.name}</span><span className="block text-[10px] text-white/40">{u.phone}</span></td>
                          <td className="p-3 text-white/70">{u.email}</td>
                          <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.kyc_status === "verified" ? "bg-emerald-500/10 text-emerald-400" : u.kyc_status === "pending" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>{u.kyc_status || "N/A"}</span></td>
                          <td className="p-3 text-white/70">{u.membership_tier || "standard"}</td>
                          <td className="p-3 text-yellow-400 font-bold">{(u.horizon_points || 0).toLocaleString()}</td>
                          <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.status === "blocked" ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>{u.status || "active"}</span></td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => { setEditingUser(u); setEditUserForm({ name: u.name, email: u.email, phone: u.phone, city: u.city, country: u.country, kyc_status: u.kyc_status, is_incognito: !!u.is_incognito, membership_tier: u.membership_tier, horizon_points: u.horizon_points || 0, status: u.status }); }}
                                className="p-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition cursor-pointer" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleResetPassword(u.id)} className="p-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition cursor-pointer" title="Reset Password"><KeyRound className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleToggleUserStatus(u.id, u.status)} className={`p-1.5 rounded-lg border transition cursor-pointer ${u.status === "blocked" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"}`} title={u.status === "blocked" ? "Unblock" : "Block"}>
                                {u.status === "blocked" ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                              </button>
                              <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition cursor-pointer" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ PAYMENTS ═══ */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 items-center bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl">
                <select value={payFilterMethod} onChange={e => setPayFilterMethod(e.target.value)} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs text-white font-mono outline-none focus:border-[#00E5FF]/50 cursor-pointer">
                  <option value="">All Methods</option>
                  <option value="card">Card</option>
                  <option value="crypto">Crypto</option>
                  <option value="bank">Bank</option>
                </select>
                <select value={payFilterStatus} onChange={e => setPayFilterStatus(e.target.value)} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs text-white font-mono outline-none focus:border-[#00E5FF]/50 cursor-pointer">
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="refunded">Refunded</option>
                  <option value="failed">Failed</option>
                </select>
                <a href="/api/admin/payments/csv" className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-emerald-500/20 transition cursor-pointer flex items-center gap-2">
                  <Download className="w-3.5 h-3.5" /> Export
                </a>
              </div>
              {payMsg && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">{payMsg}</p>}
              {payErr && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">{payErr}</p>}

              {/* Payment Methods Config */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-[#00E5FF]" /> Payment Methods</h3>
                <div className="space-y-2">
                  {payMethods.map((pm: any) => (
                    <div key={pm.id} className="flex items-center justify-between bg-[#0a0e1a] border border-white/10 px-4 py-2.5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{pm.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${pm.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{pm.enabled ? "Active" : "Disabled"}</span>
                        {pm.fee && <span className="text-[10px] text-white/40">Fee: {pm.fee}%</span>}
                      </div>
                      <button onClick={() => { setEditingPayMethod(pm); setPayMethodForm({ name: pm.name, enabled: pm.enabled, fee: pm.fee || "", address: pm.address || "" }); }}
                        className="p-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
                {editingPayMethod && (
                  <form onSubmit={handleSavePayMethod} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" placeholder="Method Name" value={payMethodForm.name} onChange={e => setPayMethodForm({ ...payMethodForm, name: e.target.value })}
                      className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="number" step="0.01" placeholder="Fee %" value={payMethodForm.fee} onChange={e => setPayMethodForm({ ...payMethodForm, fee: e.target.value })}
                      className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="text" placeholder="Wallet Address" value={payMethodForm.address} onChange={e => setPayMethodForm({ ...payMethodForm, address: e.target.value })}
                      className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#00E5FF]/50" />
                    <div className="flex items-center gap-2 col-span-full">
                      <label className="flex items-center gap-2 text-xs text-white/70">
                        <input type="checkbox" checked={payMethodForm.enabled} onChange={e => setPayMethodForm({ ...payMethodForm, enabled: e.target.checked })} className="accent-[#00E5FF]" />
                        Enabled
                      </label>
                      <button type="submit" className="px-4 py-2 bg-[#00E5FF] text-[#0a0e1a] font-bold uppercase text-[10px] tracking-wider rounded-xl hover:bg-[#00E5FF]/90 transition cursor-pointer">Save</button>
                      <button type="button" onClick={() => setEditingPayMethod(null)} className="px-4 py-2 bg-white/5 text-white/70 border border-white/10 rounded-xl text-[10px] hover:bg-white/10 transition cursor-pointer">Cancel</button>
                    </div>
                  </form>
                )}
              </div>

              {/* Payments Table */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-white/5 border-b border-white/10 text-white/40 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3 text-left font-mono">ID</th>
                        <th className="p-3 text-left font-mono">User</th>
                        <th className="p-3 text-left font-mono">Amount</th>
                        <th className="p-3 text-left font-mono">Method</th>
                        <th className="p-3 text-left font-mono">Status</th>
                        <th className="p-3 text-left font-mono">Date</th>
                        <th className="p-3 text-center font-mono">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredPayments.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-white/30">No payments found.</td></tr>
                      ) : filteredPayments.map((p: any) => (
                        <tr key={p.id} className="hover:bg-white/5 transition">
                          <td className="p-3 text-white/40 font-mono">#{p.id}</td>
                          <td className="p-3">{p.user_name || p.user_email}</td>
                          <td className="p-3 text-emerald-400 font-bold">${Number(p.amount).toLocaleString()}</td>
                          <td className="p-3 text-white/70">{p.method}</td>
                          <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" : p.status === "pending" ? "bg-amber-500/10 text-amber-400" : p.status === "refunded" ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"}`}>{p.status}</span></td>
                          <td className="p-3 text-white/40 font-mono">{p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {p.status === "pending" && (
                                <>
                                  <button onClick={() => handleConfirmPayment(p.id)} className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition cursor-pointer" title="Confirm"><CheckCircle className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleRefundPayment(p.id)} className="p-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition cursor-pointer" title="Refund"><DollarSign className="w-3.5 h-3.5" /></button>
                                </>
                              )}
                              {p.status === "confirmed" && <button onClick={() => handleRefundPayment(p.id)} className="p-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition cursor-pointer" title="Refund"><DollarSign className="w-3.5 h-3.5" /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ VEHICLES ═══ */}
          {activeTab === "vehicles" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl">
                <span className="text-xs text-white/40 font-mono">{cars.length} vehicles</span>
                <button onClick={() => { setShowCarForm(!showCarForm); setEditingCar(null); setCarForm({ name: "", model: "", year: "", image: "", status: "Available", rental_price: "", description: "", type: "", range_km: "", seats: 5 }); }}
                  className="px-4 py-2 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-[#00E5FF]/20 transition cursor-pointer flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" /> {showCarForm ? "Cancel" : "Add Vehicle"}
                </button>
              </div>
              {carMsg && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">{carMsg}</p>}
              {carErr && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">{carErr}</p>}

              {showCarForm && (
                <form onSubmit={handleSaveCar} className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl space-y-3">
                  <h3 className="text-sm font-bold flex items-center gap-2"><Car className="w-4 h-4 text-[#00E5FF]" /> {editingCar ? "Edit" : "Add"} Vehicle</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" placeholder="Name" required value={carForm.name} onChange={e => setCarForm({ ...carForm, name: e.target.value })} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="text" placeholder="Model" value={carForm.model} onChange={e => setCarForm({ ...carForm, model: e.target.value })} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="text" placeholder="Year" value={carForm.year} onChange={e => setCarForm({ ...carForm, year: e.target.value })} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="text" placeholder="Image URL" value={carForm.image} onChange={e => setCarForm({ ...carForm, image: e.target.value })} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="text" placeholder="Type (Sedan, SUV...)" value={carForm.type} onChange={e => setCarForm({ ...carForm, type: e.target.value })} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="number" placeholder="Range (km)" value={carForm.range_km} onChange={e => setCarForm({ ...carForm, range_km: e.target.value })} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    <select value={carForm.status} onChange={e => setCarForm({ ...carForm, status: e.target.value })} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50 cursor-pointer">
                      <option value="Available">Available</option>
                      <option value="Coming Soon">Coming Soon</option>
                      <option value="Pre-Order">Pre-Order</option>
                      <option value="Club Exclusive">Club Exclusive</option>
                    </select>
                    <input type="number" step="0.01" min="150" placeholder="Rental Price ($150 min)" value={carForm.rental_price} onChange={e => setCarForm({ ...carForm, rental_price: e.target.value })} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="number" placeholder="Seats" value={carForm.seats} onChange={e => setCarForm({ ...carForm, seats: Number(e.target.value) })} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  </div>
                  <textarea placeholder="Description" rows={3} value={carForm.description} onChange={e => setCarForm({ ...carForm, description: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  <button type="submit" className="px-5 py-2 bg-[#00E5FF] text-[#0a0e1a] font-bold uppercase text-[10px] tracking-wider rounded-xl hover:bg-[#00E5FF]/90 transition cursor-pointer">
                    {editingCar ? "Update" : "Add"} Vehicle
                  </button>
                </form>
              )}

              {/* Cars Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cars.map((c: any) => (
                  <div key={c.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden group">
                    {(c.image || c.image_url) && <div className="h-40 bg-[#0a0e1a] flex items-center justify-center overflow-hidden"><img src={c.image || c.image_url} alt={c.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /></div>}
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm">{c.name}</h4>
                          <p className="text-[11px] text-white/50">{c.model} {c.year}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                          c.status === "Available" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          c.status === "Coming Soon" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          c.status === "Pre-Order" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        }`}>{c.status}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-white/50">
                        {c.type && <span>{c.type}</span>}
                        {c.range_km && <span>{c.range_km} km</span>}
                        {c.seats && <span>{c.seats} seats</span>}
                      </div>
                      {c.rental_price_per_day ? <p className="text-[#00E5FF] font-bold">${Number(c.rental_price_per_day).toLocaleString()}/day</p> : c.rental_price ? <p className="text-[#00E5FF] font-bold">${Number(c.rental_price).toLocaleString()}/day</p> : null}
                      <div className="flex gap-1.5 pt-2 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => { setEditingCar(c); setShowCarForm(true); setCarForm({ name: c.name, model: c.model || "", year: c.year || "", image: c.image || c.image_url || "", status: c.status, rental_price: c.rental_price_per_day || c.rental_price || "", description: c.description || "", type: c.category || c.type || "", range_km: c.range_miles || c.range_km || "", seats: c.seats || 5 }); }}
                          className="p-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { const f = document.createElement("input"); f.type = "file"; f.accept = "image/*"; f.onchange = () => { if (f.files?.[0]) handleUploadCarImage(c.id, f.files[0]); }; f.click(); }}
                          className="p-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition cursor-pointer"><Upload className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteCar(c.id)} className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ TRACKING ═══ */}
          {activeTab === "tracking" && (
            <div className="space-y-4">
              {trackingMsg && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">{trackingMsg}</p>}

              <div className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl">
                <span className="text-xs text-white/40 font-mono">{tracking.length} active deliveries</span>
                <button onClick={() => { setShowDelayForm(!showDelayForm); setEditingDelay(null); setDelayForm({ reason: "", duration_minutes: 60, affected_user_id: "" }); }}
                  className="px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-amber-500/20 transition cursor-pointer flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> {showDelayForm ? "Cancel" : "Add Delay Event"}
                </button>
              </div>

              {showDelayForm && (
                <form onSubmit={handleSaveDelay} className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl space-y-3">
                  <h3 className="text-sm font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" /> {editingDelay ? "Edit" : "Add"} Delay Event</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" placeholder="Reason" required value={delayForm.reason} onChange={e => setDelayForm({ ...delayForm, reason: e.target.value })} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="number" placeholder="Duration (min)" value={delayForm.duration_minutes} onChange={e => setDelayForm({ ...delayForm, duration_minutes: Number(e.target.value) })} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="number" placeholder="Affected User ID" value={delayForm.affected_user_id} onChange={e => setDelayForm({ ...delayForm, affected_user_id: e.target.value })} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  </div>
                  <button type="submit" className="px-5 py-2 bg-amber-500 text-black font-bold uppercase text-[10px] tracking-wider rounded-xl hover:bg-amber-400 transition cursor-pointer">Save Delay</button>
                </form>
              )}

              {/* Delays */}
              {delays.length > 0 && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Delay Events</h3>
                  <div className="space-y-2">
                    {delays.map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between bg-[#0a0e1a] border border-white/10 px-4 py-2.5 rounded-xl">
                        <div className="flex-1">
                          <p className="text-xs font-medium">{d.reason}</p>
                          <p className="text-[10px] text-white/40">{d.duration_minutes} min • User #{d.affected_user_id}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => { setEditingDelay(d); setShowDelayForm(true); setDelayForm({ reason: d.reason, duration_minutes: d.duration_minutes, affected_user_id: d.affected_user_id }); }}
                            className="p-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteDelay(d.id)} className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracking Table */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-white/5 border-b border-white/10 text-white/40 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3 text-left font-mono">User</th>
                        <th className="p-3 text-left font-mono">Vehicle</th>
                        <th className="p-3 text-left font-mono">Route</th>
                        <th className="p-3 text-left font-mono">Status</th>
                        <th className="p-3 text-left font-mono">ETA</th>
                        <th className="p-3 text-center font-mono">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {tracking.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-white/30">No active deliveries.</td></tr>
                      ) : tracking.map((t: any) => (
                        <tr key={t.id} className="hover:bg-white/5 transition">
                          <td className="p-3">{t.user_name || `User #${t.user_id}`}</td>
                          <td className="p-3 text-white/70">{t.car_name || "-"}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden w-24">
                                <div className="h-full bg-[#00E5FF] rounded-full" style={{ width: `${t.route_index || 0}%` }} />
                              </div>
                              <span className="text-[10px] text-white/50 font-mono">{t.route_index || 0}%</span>
                            </div>
                          </td>
                          <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.status === "delivered" ? "bg-emerald-500/10 text-emerald-400" : t.status === "in_transit" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"}`}>{t.status || "pending"}</span></td>
                          <td className="p-3 text-white/40 font-mono text-[10px]">{t.eta ? new Date(t.eta).toLocaleString() : "-"}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <input type="number" min="0" max="100" placeholder="%" className="w-14 bg-[#0a0e1a] border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-white focus:outline-none focus:border-[#00E5FF]/50"
                                onKeyDown={e => { if (e.key === "Enter") handleUpdateRoute(t.user_id, parseInt((e.target as HTMLInputElement).value)); }} />
                              <button onClick={() => handleDispatch(t.user_id)} className="p-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition cursor-pointer" title="Dispatch Notification"><Send className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Shipment Notification */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2"><Mail className="w-4 h-4 text-[#00E5FF]" /> Send Shipment Email</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="number" placeholder="User ID" id="shipUserId" className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  <input type="text" placeholder="Subject" id="shipSubject" className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  <input type="text" placeholder="Message" id="shipMessage" className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                </div>
                <button onClick={async () => {
                  const userId = (document.getElementById('shipUserId') as HTMLInputElement)?.value;
                  const subject = (document.getElementById('shipSubject') as HTMLInputElement)?.value;
                  const message = (document.getElementById('shipMessage') as HTMLInputElement)?.value;
                  if (!userId || !subject || !message) { alert("All fields required."); return; }
                  const res = await fetch(`/api/admin/shipment/notify/${userId}`, { method: "POST", headers: headers(), body: JSON.stringify({ subject, message }) });
                  const data = await res.json();
                  if (data.success) { showMsg(setTrackingMsg, "Shipment email sent."); } else { alert(data.error || "Failed."); }
                }} className="px-5 py-2 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 font-bold uppercase text-[10px] tracking-wider rounded-xl hover:bg-[#00E5FF]/20 transition cursor-pointer w-fit flex items-center gap-2">
                  <Send className="w-3.5 h-3.5" /> Send Email
                </button>
              </div>

              {/* Urgent Tracking Update */}
              <div className="bg-white/5 backdrop-blur-xl border border-red-500/20 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-red-300"><AlertTriangle className="w-4 h-4 text-red-400" /> Send Urgent Tracking Update</h3>
                <p className="text-[10px] text-white/40">This sends a prominent alert to the user's tracking page and their notification panel.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="number" placeholder="User ID" id="urgentUserId" className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  <input type="text" placeholder="Urgent message (e.g., Customs delay at checkpoint)" id="urgentMessage" className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                </div>
                <button onClick={async () => {
                  const userId = (document.getElementById('urgentUserId') as HTMLInputElement)?.value;
                  const message = (document.getElementById('urgentMessage') as HTMLInputElement)?.value;
                  if (!userId || !message) { alert("Both fields required."); return; }
                  const res = await fetch("/api/admin/tracking/urgent", { method: "POST", headers: headers(), body: JSON.stringify({ user_id: parseInt(userId), message }) });
                  const data = await res.json();
                  if (data.success) { showMsg(setTrackingMsg, "Urgent update sent."); (document.getElementById('urgentMessage') as HTMLInputElement).value = ""; } else { alert(data.error || "Failed."); }
                }} className="px-5 py-2 bg-red-500/10 text-red-400 border border-red-500/20 font-bold uppercase text-[10px] tracking-wider rounded-xl hover:bg-red-500/20 transition cursor-pointer w-fit flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> Send Urgent Update
                </button>
              </div>
            </div>
          )}

          {/* ═══ RENTALS ═══ */}
          {activeTab === "rentals" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Rental Orders</h2>
              {rentals.length === 0 ? <p className="text-xs text-white/30 text-center py-4">No rental orders yet.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-white/10"><th className="p-3 text-left font-mono">Order</th><th className="p-3 text-left font-mono">User</th><th className="p-3 text-left font-mono">Vehicle</th><th className="p-3 text-left font-mono">Dates</th><th className="p-3 text-left font-mono">Total</th><th className="p-3 text-left font-mono">Status</th><th className="p-3 text-left font-mono">Actions</th></tr></thead>
                    <tbody>{rentals.map((r: any) => (
                      <tr key={r.id} className="border-b border-white/5 hover:bg-white/5"><td className="p-3 font-mono text-[10px]">{r.order_number}</td><td className="p-3">{r.user_name} ({r.user_email})</td><td className="p-3">{r.model}</td><td className="p-3 text-[10px]">{r.start_date} → {r.end_date}</td><td className="p-3 font-mono">${r.subtotal}</td><td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' : r.status === 'confirmed' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>{r.status}</span></td>
                      <td className="p-3"><select value={r.status} onChange={async (e) => { await fetch(`/api/admin/rentals/${r.id}/status`, { method: "POST", headers: { "Content-Type": "application/json", ...headersNoCT() }, body: JSON.stringify({ status: e.target.value }) }); loadRentals(); }} className="bg-[#0a0e1a] border border-white/10 px-2 py-1 rounded text-[10px] cursor-pointer"><option value="pending_payment">Pending Payment</option><option value="confirmed">Confirmed</option><option value="dispatched">Dispatched</option><option value="in_transit">In Transit</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ INVESTMENTS ═══ */}
          {activeTab === "investments" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Investments</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="bg-white/5 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-emerald-400 font-mono">${investments.reduce((s: number, i: any) => s + (i.amount || 0), 0).toLocaleString()}</div><div className="text-[10px] text-white/40">Total Invested</div></div>
                <div className="bg-white/5 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-cyan-400 font-mono">${investments.reduce((s: number, i: any) => s + (i.current_return || 0), 0).toFixed(2)}</div><div className="text-[10px] text-white/40">Total Returns</div></div>
                <div className="bg-white/5 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-yellow-400 font-mono">{investments.length}</div><div className="text-[10px] text-white/40">Active Investments</div></div>
              </div>
              {investments.length === 0 ? <p className="text-xs text-white/30 text-center py-4">No investments yet.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-white/10"><th className="p-3 text-left font-mono">Number</th><th className="p-3 text-left font-mono">User</th><th className="p-3 text-left font-mono">Option</th><th className="p-3 text-left font-mono">Amount</th><th className="p-3 text-left font-mono">APY</th><th className="p-3 text-left font-mono">Return</th><th className="p-3 text-left font-mono">Update</th></tr></thead>
                    <tbody>{investments.map((inv: any) => (
                      <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5"><td className="p-3 font-mono text-[10px]">{inv.investment_number}</td><td className="p-3">{inv.user_name}</td><td className="p-3">{inv.option_name}</td><td className="p-3 font-mono">${inv.amount}</td><td className="p-3 font-mono text-emerald-400">{inv.projected_apy}%</td><td className="p-3 font-mono">${inv.current_return}</td>
                        <td className="p-3"><input type="number" defaultValue={inv.current_return} onBlur={async (e) => { await fetch(`/api/admin/investments/${inv.id}/update-return`, { method: "POST", headers: { "Content-Type": "application/json", ...headersNoCT() }, body: JSON.stringify({ returnAmount: parseFloat(e.target.value) }) }); loadInvestments(); }} className="w-20 bg-[#0a0e1a] border border-white/10 px-2 py-1 rounded text-[10px] font-mono" /></td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ PROMOS ═══ */}
          {activeTab === "promos" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Promos & Giveaways</h2>
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-sm font-bold mb-3">Create Promo</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input type="text" placeholder="Promo name" value={promoForm.name} onChange={e => setPromoForm(p => ({ ...p, name: e.target.value }))} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs" />
                  <select value={promoForm.type} onChange={e => setPromoForm(p => ({ ...p, type: e.target.value }))} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs cursor-pointer"><option value="bonus">Bonus Points</option><option value="discount">Discount</option><option value="giveaway">Giveaway</option></select>
                  <input type="number" placeholder="Discount %" value={promoForm.discount_percent || ""} onChange={e => setPromoForm(p => ({ ...p, discount_percent: parseInt(e.target.value) || 0 }))} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs" />
                  <input type="number" placeholder="Bonus points" value={promoForm.bonus_points || ""} onChange={e => setPromoForm(p => ({ ...p, bonus_points: parseInt(e.target.value) || 0 }))} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs" />
                  <input type="date" value={promoForm.start_date} onChange={e => setPromoForm(p => ({ ...p, start_date: e.target.value }))} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs" />
                  <input type="date" value={promoForm.end_date} onChange={e => setPromoForm(p => ({ ...p, end_date: e.target.value }))} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs" />
                </div>
                <input type="text" placeholder="Description" value={promoForm.description} onChange={e => setPromoForm(p => ({ ...p, description: e.target.value }))} className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs mb-3" />
                <button onClick={async () => { if (!promoForm.name) return; await fetch("/api/admin/promos", { method: "POST", headers: { "Content-Type": "application/json", ...headersNoCT() }, body: JSON.stringify(promoForm) }); setPromoForm({ name: "", type: "bonus", discount_percent: 0, bonus_points: 0, start_date: "", end_date: "", description: "" }); loadPromos(); }} className="px-4 py-2 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 rounded-xl text-xs font-bold">Create Promo</button>
              </div>
              <div className="space-y-2">
                {promos.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-xl p-4">
                    <div><div className="text-sm font-bold">{p.name}</div><div className="text-[10px] text-white/40">{p.type} • {p.description}</div><div className="text-[10px] text-white/30 mt-1">{p.discount_percent ? `${p.discount_percent}% off` : ""} {p.bonus_points ? `+${p.bonus_points} pts` : ""} {p.start_date ? `${p.start_date} → ${p.end_date || "ongoing"}` : "Always active"}</div></div>
                    <button onClick={async () => { await fetch(`/api/admin/promos/${p.id}`, { method: "DELETE", headers: headersNoCT() }); loadPromos(); }} className="p-2 hover:bg-red-500/10 rounded-lg transition cursor-pointer"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                ))}
                {promos.length === 0 && <p className="text-xs text-white/30 text-center py-4">No promos yet.</p>}
              </div>
            </div>
          )}

          {/* ═══ REFERRALS ═══ */}
          {activeTab === "referrals" && (
            <div className="space-y-4">
              {refMsg && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">{refMsg}</p>}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button onClick={handleInjectLeaderboard} className="p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/10 transition cursor-pointer text-left">
                  <Award className="w-5 h-5 text-amber-400 mb-2" />
                  <p className="text-xs font-bold">Inject Leaderboard Entry</p>
                  <p className="text-[10px] text-white/40 mt-1">Add sample entry to leaderboard</p>
                </button>
                <button onClick={handleInjectReferral} className="p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/10 transition cursor-pointer text-left">
                  <Gift className="w-5 h-5 text-pink-400 mb-2" />
                  <p className="text-xs font-bold">Inject Sample Referral</p>
                  <p className="text-[10px] text-white/40 mt-1">Create a sample referral record</p>
                </button>
                <div className="p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                  <p className="text-xs font-bold mb-2 flex items-center gap-2"><Award className="w-4 h-4 text-yellow-400" /> Award Points</p>
                  <div className="flex gap-2">
                    <input type="number" placeholder="User ID" value={awardForm.user_id} onChange={e => setAwardForm({ ...awardForm, user_id: e.target.value })} className="flex-1 bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded-xl text-[10px] focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="number" placeholder="Points" value={awardForm.points} onChange={e => setAwardForm({ ...awardForm, points: Number(e.target.value) })} className="w-20 bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded-xl text-[10px] focus:outline-none focus:border-[#00E5FF]/50" />
                    <button onClick={handleAwardPoints} className="px-3 py-1.5 bg-[#00E5FF] text-[#0a0e1a] font-bold text-[10px] rounded-xl hover:bg-[#00E5FF]/90 transition cursor-pointer">Go</button>
                  </div>
                </div>
              </div>

              {/* Referrals Table */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5 flex justify-between items-center">
                  <h3 className="text-sm font-bold">Referral History</h3>
                  <span className="text-[10px] text-white/40 font-mono">{referrals.length} referrals</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-white/5 border-b border-white/10 text-white/40 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3 text-left font-mono">Referrer</th>
                        <th className="p-3 text-left font-mono">Referee</th>
                        <th className="p-3 text-left font-mono">Reward</th>
                        <th className="p-3 text-left font-mono">Status</th>
                        <th className="p-3 text-left font-mono">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {referrals.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-white/30">No referrals.</td></tr>
                      ) : referrals.map((r: any) => (
                        <tr key={r.id} className="hover:bg-white/5 transition">
                          <td className="p-3 font-medium">{r.referrer_name || `User #${r.referrer_id}`}</td>
                          <td className="p-3">{r.referee_name || `User #${r.referee_id}`}</td>
                          <td className="p-3 text-yellow-400">{r.reward ? `${r.reward} pts` : "-"}</td>
                          <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : r.status === "pending" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>{r.status || "pending"}</span></td>
                          <td className="p-3 text-white/40 font-mono text-[10px]">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ CONTENT ═══ */}
          {activeTab === "content" && (
            <div className="space-y-6">
              {contentMsg && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">{contentMsg}</p>}

              {/* Blog Posts */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#00E5FF]" /> Blog Posts</h3>
                  <button onClick={() => { setShowBlogForm(!showBlogForm); setEditingBlog(null); setBlogForm({ title: "", content: "", image: "", published: true }); }}
                    className="px-3 py-1.5 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-[#00E5FF]/20 transition cursor-pointer flex items-center gap-2">
                    <Plus className="w-3 h-3" /> {showBlogForm ? "Cancel" : "Add Post"}
                  </button>
                </div>
                {showBlogForm && (
                  <form onSubmit={handleSaveBlog} className="space-y-3 mb-4 p-4 bg-[#0a0e1a] border border-white/10 rounded-xl">
                    <input type="text" placeholder="Title" required value={blogForm.title} onChange={e => setBlogForm({ ...blogForm, title: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="text" placeholder="Image URL" value={blogForm.image} onChange={e => setBlogForm({ ...blogForm, image: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    <textarea placeholder="Content" required rows={4} value={blogForm.content} onChange={e => setBlogForm({ ...blogForm, content: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    <label className="flex items-center gap-2 text-xs text-white/70"><input type="checkbox" checked={blogForm.published} onChange={e => setBlogForm({ ...blogForm, published: e.target.checked })} className="accent-[#00E5FF]" /> Published</label>
                    <button type="submit" className="px-4 py-2 bg-[#00E5FF] text-[#0a0e1a] font-bold uppercase text-[10px] tracking-wider rounded-xl hover:bg-[#00E5FF]/90 transition cursor-pointer">{editingBlog ? "Update" : "Create"}</button>
                  </form>
                )}
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {blogs.length === 0 ? <p className="text-xs text-white/30 text-center py-4">No blog posts.</p> : blogs.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between bg-[#0a0e1a] border border-white/10 px-4 py-2.5 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{b.title}</p>
                        <p className="text-[10px] text-white/40">{b.published ? "Published" : "Draft"} • {new Date(b.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => { setEditingBlog(b); setShowBlogForm(true); setBlogForm({ title: b.title, content: b.content, image: b.image || "", published: b.published }); }}
                          className="p-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition cursor-pointer"><Edit className="w-3 h-3" /></button>
                        <button onClick={() => handleDeleteBlog(b.id)} className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-[#00E5FF]" /> Comments ({comments.length})</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {comments.length === 0 ? <p className="text-xs text-white/30 text-center py-4">No comments.</p> : comments.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between bg-[#0a0e1a] border border-white/10 px-4 py-2.5 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{c.text || c.content}</p>
                        <p className="text-[10px] text-white/40">{c.user_name || c.email} • {new Date(c.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {!c.approved && <button onClick={() => handleApproveComment(c.id)} className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition cursor-pointer"><CheckCircle className="w-3 h-3" /></button>}
                        <button onClick={() => handleDeleteComment(c.id)} className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Carousel, Testimonials, Webcams */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Carousel */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold flex items-center gap-2"><Image className="w-4 h-4 text-blue-400" /> Carousel</h3>
                    <button onClick={() => setShowCarouselForm(!showCarouselForm)} className="text-[10px] text-[#00E5FF] hover:underline cursor-pointer">{showCarouselForm ? "Cancel" : "Add"}</button>
                  </div>
                  {showCarouselForm && (
                    <form onSubmit={handleSaveCarousel} className="space-y-2 mb-3 p-3 bg-[#0a0e1a] border border-white/10 rounded-xl">
                      <input type="text" placeholder="Title" value={carouselForm.title} onChange={e => setCarouselForm({ ...carouselForm, title: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded text-[10px] focus:outline-none focus:border-[#00E5FF]/50" />
                      <input type="text" placeholder="Image URL" value={carouselForm.image} onChange={e => setCarouselForm({ ...carouselForm, image: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded text-[10px] focus:outline-none focus:border-[#00E5FF]/50" />
                      <input type="text" placeholder="Link" value={carouselForm.link} onChange={e => setCarouselForm({ ...carouselForm, link: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded text-[10px] focus:outline-none focus:border-[#00E5FF]/50" />
                      <label className="flex items-center gap-2 text-[10px] text-white/70"><input type="checkbox" checked={carouselForm.active} onChange={e => setCarouselForm({ ...carouselForm, active: e.target.checked })} className="accent-[#00E5FF]" /> Active</label>
                      <button type="submit" className="px-3 py-1.5 bg-blue-500 text-white text-[10px] rounded-xl hover:bg-blue-400 transition cursor-pointer">Save</button>
                    </form>
                  )}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {carousel.length === 0 ? <p className="text-[10px] text-white/30 text-center py-2">No slides.</p> : carousel.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between bg-[#0a0e1a] border border-white/10 px-3 py-1.5 rounded-lg">
                        <span className="text-[10px] truncate">{s.title || s.image?.slice(0, 30)}</span>
                        <button onClick={() => handleDeleteCarousel(s.id)} className="p-1 text-red-400 hover:bg-red-500/10 rounded cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Testimonials */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" /> Testimonials</h3>
                    <button onClick={() => setShowTestimonialForm(!showTestimonialForm)} className="text-[10px] text-[#00E5FF] hover:underline cursor-pointer">{showTestimonialForm ? "Cancel" : "Add"}</button>
                  </div>
                  {showTestimonialForm && (
                    <form onSubmit={handleSaveTestimonial} className="space-y-2 mb-3 p-3 bg-[#0a0e1a] border border-white/10 rounded-xl">
                      <input type="text" placeholder="Name" required value={testimonialForm.name} onChange={e => setTestimonialForm({ ...testimonialForm, name: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded text-[10px] focus:outline-none focus:border-[#00E5FF]/50" />
                      <textarea placeholder="Text" required rows={2} value={testimonialForm.text} onChange={e => setTestimonialForm({ ...testimonialForm, text: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded text-[10px] focus:outline-none focus:border-[#00E5FF]/50" />
                      <div className="flex gap-2">
                        <input type="number" min="1" max="5" placeholder="Rating" value={testimonialForm.rating} onChange={e => setTestimonialForm({ ...testimonialForm, rating: Number(e.target.value) })} className="w-16 bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded text-[10px] focus:outline-none focus:border-[#00E5FF]/50" />
                        <input type="text" placeholder="Avatar URL" value={testimonialForm.avatar} onChange={e => setTestimonialForm({ ...testimonialForm, avatar: e.target.value })} className="flex-1 bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded text-[10px] focus:outline-none focus:border-[#00E5FF]/50" />
                      </div>
                      <button type="submit" className="px-3 py-1.5 bg-amber-500 text-black text-[10px] rounded-xl hover:bg-amber-400 transition cursor-pointer">Save</button>
                    </form>
                  )}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {testimonials.length === 0 ? <p className="text-[10px] text-white/30 text-center py-2">No testimonials.</p> : testimonials.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between bg-[#0a0e1a] border border-white/10 px-3 py-1.5 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium truncate">{t.name}</p>
                          <p className="text-[9px] text-white/40 truncate">{t.text?.slice(0, 50)}</p>
                        </div>
                        <button onClick={() => handleDeleteTestimonial(t.id)} className="p-1 text-red-400 hover:bg-red-500/10 rounded cursor-pointer shrink-0"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Webcams */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold flex items-center gap-2"><Camera className="w-4 h-4 text-cyan-400" /> Webcams</h3>
                    <button onClick={() => setShowWebcamForm(!showWebcamForm)} className="text-[10px] text-[#00E5FF] hover:underline cursor-pointer">{showWebcamForm ? "Cancel" : "Add"}</button>
                  </div>
                  {showWebcamForm && (
                    <form onSubmit={handleSaveWebcam} className="space-y-2 mb-3 p-3 bg-[#0a0e1a] border border-white/10 rounded-xl">
                      <input type="text" placeholder="Name" required value={webcamForm.name} onChange={e => setWebcamForm({ ...webcamForm, name: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded text-[10px] focus:outline-none focus:border-[#00E5FF]/50" />
                      <input type="text" placeholder="Stream URL" required value={webcamForm.stream_url} onChange={e => setWebcamForm({ ...webcamForm, stream_url: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded text-[10px] focus:outline-none focus:border-[#00E5FF]/50" />
                      <input type="text" placeholder="Location" value={webcamForm.location} onChange={e => setWebcamForm({ ...webcamForm, location: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded text-[10px] focus:outline-none focus:border-[#00E5FF]/50" />
                      <label className="flex items-center gap-2 text-[10px] text-white/70"><input type="checkbox" checked={webcamForm.active} onChange={e => setWebcamForm({ ...webcamForm, active: e.target.checked })} className="accent-[#00E5FF]" /> Active</label>
                      <button type="submit" className="px-3 py-1.5 bg-cyan-500 text-black text-[10px] rounded-xl hover:bg-cyan-400 transition cursor-pointer">Save</button>
                    </form>
                  )}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {webcams.length === 0 ? <p className="text-[10px] text-white/30 text-center py-2">No webcams.</p> : webcams.map((w: any) => (
                      <div key={w.id} className="flex items-center justify-between bg-[#0a0e1a] border border-white/10 px-3 py-1.5 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium truncate">{w.name}</p>
                          <p className="text-[9px] text-white/40 truncate">{w.location || w.stream_url?.slice(0, 40)}</p>
                        </div>
                        <button onClick={() => handleDeleteWebcam(w.id)} className="p-1 text-red-400 hover:bg-red-500/10 rounded cursor-pointer shrink-0"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ GAMIFICATION ═══ */}
          {activeTab === "gamification" && (
            <div className="space-y-4">
              {gamMsg && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">{gamMsg}</p>}

              {/* Feature Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { key: "daily_checkin", label: "Daily Check-in", icon: CheckCircle },
                  { key: "spin_wheel", label: "Spin Wheel", icon: Sparkles },
                  { key: "quiz", label: "Quiz", icon: HelpCircle },
                  { key: "drive_to_earn", label: "Drive to Earn", icon: Car },
                  { key: "mystery_car", label: "Mystery Car", icon: Car },
                  { key: "president_club", label: "President Club", icon: Award },
                  { key: "carbon_offset", label: "Carbon Offset", icon: Leaf },
                  { key: "lottery", label: "Lottery", icon: Gift },
                ].map((f) => {
                  const Icon = f.icon;
                  const enabled = gamification[f.key]?.enabled ?? true;
                  return (
                    <div key={f.key} className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${enabled ? "text-emerald-400" : "text-white/30"}`} />
                        <span className="text-xs font-medium">{f.label}</span>
                      </div>
                      <button onClick={() => handleToggleFeature(f.key, !enabled)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${enabled ? "bg-emerald-500" : "bg-white/20"}`}>
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${enabled ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Streak Milestones */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4"><Zap className="w-4 h-4 text-[#00E5FF]" /> Streak Milestones & Rewards</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[{ key: 'streak_day_3', label: 'Day 3 Streak' }, { key: 'streak_day_7', label: 'Day 7 Streak' }, { key: 'streak_day_14', label: 'Day 14 Streak' }, { key: 'streak_day_30', label: 'Day 30 Streak' }].map(s => (
                    <div key={s.key} className="bg-[#0a0e1a] border border-white/10 rounded-xl p-3 space-y-1">
                      <label className="text-[10px] text-white/40 font-mono">{s.label}</label>
                      <input type="number" value={settings[s.key] || ''} placeholder="Points" onChange={e => { setSettings({ ...settings, [s.key]: e.target.value }); }}
                        className="w-full bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <div className="bg-[#0a0e1a] border border-white/10 rounded-xl p-3 space-y-1">
                    <label className="text-[10px] text-white/40 font-mono">Daily Check-in Base Points</label>
                    <input type="number" value={settings.daily_checkin_points || '100'} onChange={e => setSettings({ ...settings, daily_checkin_points: e.target.value })}
                      className="w-full bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  </div>
                  <div className="bg-[#0a0e1a] border border-white/10 rounded-xl p-3 space-y-1">
                    <label className="text-[10px] text-white/40 font-mono">Spin Wheel Range (min-max)</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={settings.spin_wheel_min || '10'} onChange={e => setSettings({ ...settings, spin_wheel_min: e.target.value })}
                        className="w-full bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                      <span className="text-white/30">-</span>
                      <input type="number" value={settings.spin_wheel_max || '500'} onChange={e => setSettings({ ...settings, spin_wheel_max: e.target.value })}
                        className="w-full bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quiz Management */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold flex items-center gap-2"><HelpCircle className="w-4 h-4 text-[#00E5FF]" /> Quiz Questions</h3>
                  <button onClick={() => { setShowQuizForm(!showQuizForm); setEditingQuiz(null); setQuizForm({ question: "", options: ["", "", "", ""], correct: 0 }); }}
                    className="px-3 py-1.5 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-[#00E5FF]/20 transition cursor-pointer flex items-center gap-2">
                    <Plus className="w-3 h-3" /> {showQuizForm ? "Cancel" : "Add Question"}
                  </button>
                </div>
                {showQuizForm && (
                  <form onSubmit={handleSaveQuiz} className="space-y-3 mb-4 p-4 bg-[#0a0e1a] border border-white/10 rounded-xl">
                    <input type="text" placeholder="Question" required value={quizForm.question} onChange={e => setQuizForm({ ...quizForm, question: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    {quizForm.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="radio" name="correct" checked={quizForm.correct === i} onChange={() => setQuizForm({ ...quizForm, correct: i })} className="accent-[#00E5FF]" />
                        <input type="text" placeholder={`Option ${i + 1}`} required value={opt} onChange={e => { const opts = [...quizForm.options]; opts[i] = e.target.value; setQuizForm({ ...quizForm, options: opts }); }}
                          className="flex-1 bg-[#0a0e1a] border border-white/10 px-2 py-1.5 rounded text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                      </div>
                    ))}
                    <button type="submit" className="px-4 py-2 bg-[#00E5FF] text-[#0a0e1a] font-bold uppercase text-[10px] tracking-wider rounded-xl hover:bg-[#00E5FF]/90 transition cursor-pointer">{editingQuiz ? "Update" : "Add"}</button>
                  </form>
                )}
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {quizQuestions.length === 0 ? <p className="text-xs text-white/30 text-center py-4">No questions.</p> : quizQuestions.map((q: any) => (
                    <div key={q.id} className="flex items-center justify-between bg-[#0a0e1a] border border-white/10 px-4 py-2.5 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{q.question}</p>
                        <p className="text-[10px] text-white/40">{q.options?.length || 0} options • Correct: #{q.correct}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => { setEditingQuiz(q); setShowQuizForm(true); setQuizForm({ question: q.question, options: q.options || ["", "", "", ""], correct: q.correct || 0 }); }}
                          className="p-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition cursor-pointer"><Edit className="w-3 h-3" /></button>
                        <button onClick={() => handleDeleteQuiz(q.id)} className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ INSURANCE TIERS ═══ */}
          {activeTab === "insurance" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl">
                <span className="text-xs text-white/40 font-mono">{insuranceTiers.length} tiers</span>
                <button onClick={() => { setShowInsuranceForm(!showInsuranceForm); setEditingInsurance(null); setInsuranceForm({ name: "", daily_rate: "", coverage_limit: "", deductible: "", description: "" }); }}
                  className="px-4 py-2 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-[#00E5FF]/20 transition cursor-pointer flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" /> {showInsuranceForm ? "Cancel" : "Add Tier"}
                </button>
              </div>
              {insuranceMsg && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">{insuranceMsg}</p>}

              {showInsuranceForm && (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const url = editingInsurance ? `/api/admin/insurance-tiers/${editingInsurance.id}` : "/api/admin/insurance-tiers";
                  const res = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify({ ...insuranceForm, daily_rate: parseFloat(insuranceForm.daily_rate), coverage_limit: parseFloat(insuranceForm.coverage_limit), deductible: parseFloat(insuranceForm.deductible || "0") }) });
                  if (res.ok) { showMsg(setInsuranceMsg, editingInsurance ? "Tier updated." : "Tier added."); setShowInsuranceForm(false); setEditingInsurance(null); loadInsuranceTiers(); }
                }} className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl space-y-3">
                  <h3 className="text-sm font-bold flex items-center gap-2"><Shield className="w-4 h-4 text-[#00E5FF]" /> {editingInsurance ? "Edit" : "Add"} Insurance Tier</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" placeholder="Tier Name" required value={insuranceForm.name} onChange={e => setInsuranceForm({ ...insuranceForm, name: e.target.value })} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="number" step="0.01" min="15" placeholder="Daily Rate ($15 min)" required value={insuranceForm.daily_rate} onChange={e => setInsuranceForm({ ...insuranceForm, daily_rate: e.target.value })} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="number" placeholder="Coverage Limit ($)" required value={insuranceForm.coverage_limit} onChange={e => setInsuranceForm({ ...insuranceForm, coverage_limit: e.target.value })} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    <input type="number" placeholder="Deductible ($)" value={insuranceForm.deductible} onChange={e => setInsuranceForm({ ...insuranceForm, deductible: e.target.value })} className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  </div>
                  <textarea placeholder="Description" rows={2} value={insuranceForm.description} onChange={e => setInsuranceForm({ ...insuranceForm, description: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  <button type="submit" className="px-5 py-2 bg-[#00E5FF] text-[#0a0e1a] font-bold uppercase text-[10px] tracking-wider rounded-xl hover:bg-[#00E5FF]/90 transition cursor-pointer">
                    {editingInsurance ? "Update" : "Add"} Tier
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {insuranceTiers.map((t: any) => (
                  <div key={t.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm">{t.name}</h4>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${t.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                        {t.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-[#00E5FF] font-bold text-lg">${t.daily_rate}/day</p>
                    <p className="text-[11px] text-white/50">Coverage: ${t.coverage_limit?.toLocaleString()}</p>
                    <p className="text-[11px] text-white/50">Deductible: ${t.deductible?.toLocaleString()}</p>
                    {t.description && <p className="text-[11px] text-white/40">{t.description}</p>}
                    <div className="flex gap-1.5 pt-2">
                      <button onClick={() => { setEditingInsurance(t); setShowInsuranceForm(true); setInsuranceForm({ name: t.name, daily_rate: t.daily_rate, coverage_limit: t.coverage_limit, deductible: t.deductible || "", description: t.description || "" }); }}
                        className="p-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={async () => { if (!confirm("Delete this tier?")) return; await fetch(`/api/admin/insurance-tiers/${t.id}`, { method: "DELETE", headers: headersNoCT() }); loadInsuranceTiers(); }}
                        className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      <button onClick={async () => { await fetch(`/api/admin/insurance-tiers/${t.id}`, { method: "POST", headers: headers(), body: JSON.stringify({ ...t, is_active: t.is_active ? 0 : 1 }) }); loadInsuranceTiers(); }}
                        className="p-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition cursor-pointer">
                        {t.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* User Insurance Policies */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2"><Shield className="w-4 h-4 text-[#00E5FF]" /> User Insurance Policies</h3>
                {insurancePolicies.length === 0 ? (
                  <p className="text-xs text-white/40">No insurance policies found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-white/40 border-b border-white/5">
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">Policy #</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">User</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">Car</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">Plan</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">Premium</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">Coverage</th>
                          <th className="text-left py-2 font-mono uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insurancePolicies.map((p: any) => (
                          <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-2 pr-2 text-white/60 font-mono text-[10px]">{p.policy_number}</td>
                            <td className="py-2 pr-2">{p.user_name}<br /><span className="text-white/30">{p.user_email}</span></td>
                            <td className="py-2 pr-2">{p.car_model}</td>
                            <td className="py-2 pr-2">{p.plan_name}</td>
                            <td className="py-2 pr-2 font-mono">${p.monthly_premium}/mo</td>
                            <td className="py-2 pr-2 font-mono text-[10px]">${(p.coverage_limit || 0).toLocaleString()}</td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-mono ${p.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{p.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ WALLET CONFIGURATION ═══ */}
          {activeTab === "wallets" && (
            <div className="space-y-4">
              {walletMsg && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">{walletMsg}</p>}

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2"><KeyRound className="w-4 h-4 text-[#00E5FF]" /> Global Crypto Wallet Address</h3>
                <div className="flex gap-3">
                  <input type="text" placeholder="0x..." value={globalWalletForm} onChange={e => setGlobalWalletForm(e.target.value)} className="flex-1 bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-[#00E5FF]/50" />
                  <button onClick={async () => { await fetch("/api/admin/wallets/global", { method: "POST", headers: headers(), body: JSON.stringify({ wallet_address: globalWalletForm }) }); showMsg(setWalletMsg, "Global wallet updated."); loadWallets(); }}
                    className="px-4 py-2 bg-[#00E5FF] text-[#0a0e1a] font-bold uppercase text-[10px] tracking-wider rounded-xl hover:bg-[#00E5FF]/90 transition cursor-pointer">Save</button>
                </div>
                <p className="text-[11px] text-white/40">This wallet receives all crypto deposits unless a user has a custom wallet set.</p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2"><CreditCard className="w-4 h-4 text-[#00E5FF]" /> Payment Methods</h3>
                <div className="space-y-2">
                  {wallets.methods?.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 bg-[#0a0e1a] border border-white/10 p-3 rounded-xl">
                      <span className="text-xs font-bold uppercase w-24">{m.method}</span>
                      <span className="text-[11px] text-white/50 flex-1 font-mono truncate">{m.wallet_address || "N/A"}</span>
                      <span className="text-[11px] text-white/40">Gas: ${m.gas_fee}</span>
                      <span className="text-[11px] text-[#00E5FF]">Bonus: {m.crypto_bonus_percent}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2"><Users className="w-4 h-4 text-[#00E5FF]" /> Per-User Wallet Editor</h3>
                <div className="flex gap-2">
                  <input type="text" placeholder="Search user by name or email..." value={userWalletSearch} onChange={e => setUserWalletSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchUsersForWallet()}
                    className="flex-1 bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  <button onClick={searchUsersForWallet}
                    className="px-4 py-2 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-[#00E5FF]/20 transition cursor-pointer">Search</button>
                </div>
                {userWalletResults.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {userWalletResults.map((u: any) => (
                      <div key={u.id} className="flex items-center gap-3 bg-[#0a0e1a] border border-white/10 p-3 rounded-xl">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{u.name}</p>
                          <p className="text-[10px] text-white/40 truncate">{u.email}</p>
                        </div>
                        {editingUserWallet === u.id ? (
                          <div className="flex gap-2 items-center">
                            <input type="text" value={userWalletAddr} onChange={e => setUserWalletAddr(e.target.value)} placeholder="New wallet address"
                              className="bg-[#0a0e1a] border border-white/10 px-2 py-1 rounded-lg text-[10px] font-mono w-48 focus:outline-none focus:border-[#00E5FF]/50" />
                            <button onClick={async () => { await fetch(`/api/admin/users/${u.id}/wallet`, { method: "POST", headers: headers(), body: JSON.stringify({ wallet_address: userWalletAddr }) }); showMsg(setWalletMsg, `Wallet updated for ${u.name}`); setEditingUserWallet(null); }}
                              className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 cursor-pointer"><CheckCircle className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingUserWallet(null)} className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] font-mono text-white/50 truncate max-w-[180px]">{u.wallet_address || "No wallet set"}</span>
                            <button onClick={() => { setEditingUserWallet(u.id); setUserWalletAddr(u.wallet_address || ""); }}
                              className="p-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-white/40">Set custom deposit wallet addresses per user. Users will see this address when making deposits.</p>
              </div>
            </div>
          )}

          {/* ═══ MASTER AI ADMIN ═══ */}
          {activeTab === "master" && (
            <div className="space-y-4">
              {masterMsg && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">{masterMsg}</p>}

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2"><Zap className="w-4 h-4 text-[#00E5FF]" /> Master AI Admin Connector</h3>
                <div className={`flex items-center gap-2 text-xs ${masterStatus.status === 'connected' ? 'text-emerald-400' : 'text-white/40'}`}>
                  <span className={`w-2 h-2 rounded-full ${masterStatus.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`}></span>
                  Status: {masterStatus.status === 'connected' ? 'Connected' : 'Disconnected'}
                  {masterStatus.instance_id && <span className="font-mono text-[10px] text-white/30 ml-2">Instance: {masterStatus.instance_id}</span>}
                </div>

                {masterStatus.status !== 'connected' ? (
                  <div className="space-y-3">
                    <input type="text" placeholder="Webhook URL (optional)" value={masterWebhook} onChange={e => setMasterWebhook(e.target.value)} className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    <button onClick={async () => { const res = await fetch("/api/admin/master-connect", { method: "POST", headers: headers(), body: JSON.stringify({ webhook_url: masterWebhook }) }); const data = await res.json(); if (data.success) { showMsg(setMasterMsg, `Connected! Instance: ${data.instance_id}`); loadMaster(); } }} className="px-5 py-2 bg-[#00E5FF] text-[#0a0e1a] font-bold uppercase text-[10px] tracking-wider rounded-xl hover:bg-[#00E5FF]/90 transition cursor-pointer flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5" /> Connect to Master AI Admin
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-[#0a0e1a] border border-white/10 p-3 rounded-xl space-y-1">
                      <p className="text-[11px] text-white/40">API Key:</p>
                      <p className="text-xs font-mono text-[#00E5FF] break-all">{masterStatus.api_key}</p>
                    </div>
                    <button onClick={async () => { await fetch("/api/admin/master-disconnect", { method: "POST", headers: headers() }); showMsg(setMasterMsg, "Disconnected from Master AI."); loadMaster(); }}
                      className="px-5 py-2 bg-red-500/10 text-red-400 border border-red-500/20 font-bold uppercase text-[10px] tracking-wider rounded-xl hover:bg-red-500/20 transition cursor-pointer">Disconnect</button>
                  </div>
                )}

                <div className="text-[11px] text-white/30 space-y-1 mt-4">
                  <p>The Master AI Admin connector allows centralized monitoring across all Horizon Club instances.</p>
                  <p>Capabilities: aggregate analytics, push global config, mass notifications, health checks.</p>
                </div>
              </div>
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {/* ═══ WITHDRAWALS ═══ */}
          {activeTab === "withdrawals" && (
            <div className="space-y-4">
              {wdMsg && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">{wdMsg}</p>}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-[#00E5FF]" /> Withdrawal Requests</h3>
                {withdrawals.length === 0 ? (
                  <p className="text-xs text-white/40">No withdrawal requests.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-white/40 border-b border-white/5">
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">ID</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">User</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">Amount</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">Wallet</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">Status</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">Date</th>
                          <th className="text-left py-2 font-mono uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawals.map((wd: any) => (
                          <tr key={wd.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-2 pr-2 text-white/60 font-mono">#{wd.id}</td>
                            <td className="py-2 pr-2">{wd.user_name}<br /><span className="text-white/30">{wd.user_email}</span></td>
                            <td className="py-2 pr-2 text-emerald-400 font-mono">${wd.amount}</td>
                            <td className="py-2 pr-2 font-mono text-[10px] text-white/60 max-w-[120px] truncate">{wd.wallet_address}</td>
                            <td className="py-2 pr-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-mono ${
                                wd.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' :
                                wd.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                                'bg-amber-500/10 text-amber-400'
                              }`}>{wd.status}</span>
                            </td>
                            <td className="py-2 pr-2 text-white/40 text-[10px]">{wd.created_at?.split('T')[0]}</td>
                            <td className="py-2">
                              {wd.status === 'pending' && (
                                <div className="flex gap-1">
                                  <button onClick={async () => { await fetch(`/api/admin/withdrawals/${wd.id}/confirm`, { method: "POST", headers: headers() }); showMsg(setWdMsg, "Withdrawal confirmed."); loadWithdrawals(); }}
                                    className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition cursor-pointer" title="Confirm">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={async () => { const reason = prompt("Rejection reason:"); await fetch(`/api/admin/withdrawals/${wd.id}/reject`, { method: "POST", headers: headers(), body: JSON.stringify({ reason: reason || '' }) }); showMsg(setWdMsg, "Withdrawal rejected."); loadWithdrawals(); }}
                                    className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition cursor-pointer" title="Reject">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ ELITE MEMBERS ═══ */}
          {activeTab === "elite" && (
            <div className="space-y-4">
              {eliteMsg && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">{eliteMsg}</p>}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2"><Crown className="w-4 h-4 text-[#00E5FF]" /> Elite Subscriptions</h3>
                {eliteRequests.length === 0 ? (
                  <p className="text-xs text-white/40">No elite subscription requests.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-white/40 border-b border-white/5">
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">ID</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">User</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">Amount</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">Status</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">Date</th>
                          <th className="text-left py-2 font-mono uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eliteRequests.map((er: any) => (
                          <tr key={er.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-2 pr-2 text-white/60 font-mono">#{er.id}</td>
                            <td className="py-2 pr-2">{er.user_name}<br /><span className="text-white/30">{er.user_email}</span></td>
                            <td className="py-2 pr-2 text-purple-400 font-mono">${er.amount}</td>
                            <td className="py-2 pr-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-mono ${
                                er.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                              }`}>{er.status}</span>
                            </td>
                            <td className="py-2 pr-2 text-white/40 text-[10px]">{er.created_at?.split('T')[0]}</td>
                            <td className="py-2">
                              {er.status === 'pending' && (
                                <button onClick={async () => { await fetch(`/api/admin/elite/${er.id}/confirm`, { method: "POST", headers: headers() }); showMsg(setEliteMsg, "Elite subscription confirmed."); loadEliteRequests(); }}
                                  className="p-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition cursor-pointer" title="Confirm">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ MYSTERY CAR PRIZES ═══ */}
          {activeTab === "mystery" && (
            <div className="space-y-4">
              {mysteryMsg && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">{mysteryMsg}</p>}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2"><Puzzle className="w-4 h-4 text-[#00E5FF]" /> Mystery Car Prizes</h3>
                {mysteryPrizes.length === 0 ? (
                  <p className="text-xs text-white/40">No mystery car prizes claimed yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-white/40 border-b border-white/5">
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">ID</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">User</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">Prize</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">Type</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">Value</th>
                          <th className="text-left py-2 pr-2 font-mono uppercase tracking-wider">Claimed</th>
                          <th className="text-left py-2 font-mono uppercase tracking-wider">Shipping</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mysteryPrizes.map((mp: any) => (
                          <tr key={mp.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-2 pr-2 text-white/60 font-mono">#{mp.id}</td>
                            <td className="py-2 pr-2">{mp.user_name}<br /><span className="text-white/30">{mp.user_email}</span></td>
                            <td className="py-2 pr-2 text-cyan-400">{mp.prize_name}</td>
                            <td className="py-2 pr-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-mono ${
                                mp.prize_type === 'car' ? 'bg-emerald-500/10 text-emerald-400' :
                                mp.prize_type === 'credit' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-blue-500/10 text-blue-400'
                              }`}>{mp.prize_type}</span>
                            </td>
                            <td className="py-2 pr-2 font-mono">${mp.prize_value}</td>
                            <td className="py-2 pr-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] ${mp.claimed ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/30 bg-white/5'}`}>
                                {mp.claimed ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td className="py-2 text-[10px] text-white/60">{mp.shipping_city || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-4">
              {settingsMsg && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">{settingsMsg}</p>}
              {settingsErr && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">{settingsErr}</p>}

              {/* General Settings */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2"><Settings className="w-4 h-4 text-[#00E5FF]" /> General Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Site Name</label>
                    <input type="text" value={settings.site_name || ""} onChange={e => setSettings({ ...settings, site_name: e.target.value })}
                      className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Tagline</label>
                    <input type="text" value={settings.tagline || ""} onChange={e => setSettings({ ...settings, tagline: e.target.value })}
                      className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Contact Email</label>
                    <input type="email" value={settings.contact_email || ""} onChange={e => setSettings({ ...settings, contact_email: e.target.value })}
                      className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Currency Display</label>
                    <select value={settings.currency || "USD"} onChange={e => setSettings({ ...settings, currency: e.target.value })}
                      className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50">
                      <option value="USD">USD ($)</option>
                      <option value="NGN">NGN (₦)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Referral Bonus ($)</label>
                    <input type="number" value={settings.referral_bonus || "50"} onChange={e => setSettings({ ...settings, referral_bonus: e.target.value })}
                      className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Min Withdrawal ($)</label>
                    <input type="number" value={settings.min_withdrawal || "200"} onChange={e => setSettings({ ...settings, min_withdrawal: e.target.value })}
                      className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2"><Sliders className="w-4 h-4 text-[#00E5FF]" /> Brand Customization</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 font-mono">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={settings.primary_color || "#0a0e1a"} onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                      <input type="text" value={settings.primary_color || "#0a0e1a"} onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                        className="flex-1 bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-[#00E5FF]/50" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 font-mono">Secondary (Cyan)</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={settings.secondary_color || "#00e5ff"} onChange={e => setSettings({ ...settings, secondary_color: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                      <input type="text" value={settings.secondary_color || "#00e5ff"} onChange={e => setSettings({ ...settings, secondary_color: e.target.value })}
                        className="flex-1 bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-[#00E5FF]/50" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 font-mono">Accent (Emerald)</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={settings.accent_color || "#10b981"} onChange={e => setSettings({ ...settings, accent_color: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                      <input type="text" value={settings.accent_color || "#10b981"} onChange={e => setSettings({ ...settings, accent_color: e.target.value })}
                        className="flex-1 bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-[#00E5FF]/50" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Logo URL</label>
                    <input type="text" value={settings.logo_url || ""} placeholder="https://..." onChange={e => setSettings({ ...settings, logo_url: e.target.value })}
                      className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  </div>
                </div>
                <div className="border-t border-white/5 pt-4">
                  <h4 className="text-[10px] text-white/40 font-mono uppercase tracking-wider mb-3">Social Links</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 font-mono">WhatsApp</label>
                      <input type="text" value={settings.whatsapp_link || ""} placeholder="https://wa.me/..." onChange={e => setSettings({ ...settings, whatsapp_link: e.target.value })}
                        className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 font-mono">Telegram</label>
                      <input type="text" value={settings.telegram_link || ""} placeholder="https://t.me/..." onChange={e => setSettings({ ...settings, telegram_link: e.target.value })}
                        className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 font-mono">Twitter / X</label>
                      <input type="text" value={settings.twitter_link || ""} placeholder="https://twitter.com/..." onChange={e => setSettings({ ...settings, twitter_link: e.target.value })}
                        className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 font-mono">Instagram</label>
                      <input type="text" value={settings.instagram_link || ""} placeholder="https://instagram.com/..." onChange={e => setSettings({ ...settings, instagram_link: e.target.value })}
                        className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-[#0a0e1a] border border-white/10 px-4 py-3 rounded-xl">
                  <div>
                    <p className="text-xs font-medium">Maintenance Mode</p>
                    <p className="text-[10px] text-white/40">{settings.maintenance_mode ? "Site is offline for users" : "Site is live"}</p>
                  </div>
                  <button onClick={handleMaintenanceToggle}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${settings.maintenance_mode ? "bg-red-500" : "bg-white/20"}`}>
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${settings.maintenance_mode ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
                <button onClick={handleSaveSettings} className="px-5 py-2 bg-[#00E5FF] text-[#0a0e1a] font-bold uppercase text-[10px] tracking-wider rounded-xl hover:bg-[#00E5FF]/90 transition cursor-pointer">
                  Save Settings
                </button>
              </div>

              {/* Change Password */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2"><Lock className="w-4 h-4 text-[#00E5FF]" /> Change Admin Password</h3>
                <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="password" placeholder="Current Password" required value={changePassForm.current_password} onChange={e => setChangePassForm({ ...changePassForm, current_password: e.target.value })}
                    className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  <input type="password" placeholder="New Password" required value={changePassForm.new_password} onChange={e => setChangePassForm({ ...changePassForm, new_password: e.target.value })}
                    className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  <input type="password" placeholder="Confirm Password" required value={changePassForm.confirm_password} onChange={e => setChangePassForm({ ...changePassForm, confirm_password: e.target.value })}
                    className="bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  <button type="submit" className="px-4 py-2 bg-[#00E5FF] text-[#0a0e1a] font-bold uppercase text-[10px] tracking-wider rounded-xl hover:bg-[#00E5FF]/90 transition cursor-pointer sm:col-start-2">
                    Change Password
                  </button>
                </form>
              </div>

              {/* 2FA */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2"><QrCode className="w-4 h-4 text-[#00E5FF]" /> Two-Factor Authentication</h3>
                    <p className="text-xs text-white/40">Set up 2FA for additional security</p>
                  </div>
                  <button onClick={handleSetup2FA} className="px-4 py-2 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-[#00E5FF]/20 transition cursor-pointer">
                    Setup 2FA
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* User Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="max-w-lg w-full bg-[#0d1117] border border-white/10 p-6 rounded-3xl shadow-2xl relative space-y-4">
            <button onClick={() => setEditingUser(null)} className="absolute top-4 right-4 text-white/40 hover:text-white transition cursor-pointer"><X className="w-5 h-5" /></button>
            <h3 className="text-base font-bold flex items-center gap-2"><Edit className="w-4 h-4 text-[#00E5FF]" /> Edit User: {editingUser.email}</h3>
            {editUserMsg && <p className="text-xs text-emerald-400">{editUserMsg}</p>}
            {editUserErr && <p className="text-xs text-red-400">{editUserErr}</p>}
            <form onSubmit={handleEditUser} className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-[10px] text-white/40 font-mono">Name</label>
                <input type="text" required value={editUserForm.name} onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl focus:outline-none focus:border-[#00E5FF]/50" />
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-[10px] text-white/40 font-mono">Email</label>
                <input type="email" required value={editUserForm.email} onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl focus:outline-none focus:border-[#00E5FF]/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/40 font-mono">Phone</label>
                <input type="text" value={editUserForm.phone || ""} onChange={e => setEditUserForm({ ...editUserForm, phone: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl focus:outline-none focus:border-[#00E5FF]/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/40 font-mono">City</label>
                <input type="text" value={editUserForm.city || ""} onChange={e => setEditUserForm({ ...editUserForm, city: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl focus:outline-none focus:border-[#00E5FF]/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/40 font-mono">KYC Status</label>
                <select value={editUserForm.kyc_status || ""} onChange={e => setEditUserForm({ ...editUserForm, kyc_status: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl focus:outline-none focus:border-[#00E5FF]/50 cursor-pointer">
                  <option value="not_submitted">Not Submitted</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/40 font-mono">Tier</label>
                <select value={editUserForm.membership_tier || "standard"} onChange={e => setEditUserForm({ ...editUserForm, membership_tier: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl focus:outline-none focus:border-[#00E5FF]/50 cursor-pointer">
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/40 font-mono">Points</label>
                <input type="number" value={editUserForm.horizon_points || 0} onChange={e => setEditUserForm({ ...editUserForm, horizon_points: Number(e.target.value) })} className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl focus:outline-none focus:border-[#00E5FF]/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/40 font-mono">Status</label>
                <select value={editUserForm.status || "active"} onChange={e => setEditUserForm({ ...editUserForm, status: e.target.value })} className="w-full bg-[#0a0e1a] border border-white/10 px-3 py-2 rounded-xl focus:outline-none focus:border-[#00E5FF]/50 cursor-pointer">
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
              <div className="col-span-2 flex items-center gap-2 bg-[#0a0e1a] border border-white/10 px-4 py-2.5 rounded-xl">
                <input type="checkbox" id="incognito" checked={!!editUserForm.is_incognito} onChange={e => setEditUserForm({ ...editUserForm, is_incognito: e.target.checked })} className="accent-[#00E5FF]" />
                <label htmlFor="incognito" className="text-xs text-white/70 cursor-pointer">Incognito Mode (hide from maps)</label>
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 bg-white/5 text-white/70 border border-white/10 rounded-xl text-[10px] hover:bg-white/10 transition cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#00E5FF] text-[#0a0e1a] font-bold uppercase text-[10px] tracking-wider rounded-xl hover:bg-[#00E5FF]/90 transition cursor-pointer">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

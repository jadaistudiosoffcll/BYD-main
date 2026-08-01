import React, { useState, useEffect } from "react";
import { Car, Calendar, MapPin, Shield, Clock, Check, ChevronRight, Loader2, AlertTriangle, Package, DollarSign, Star, Zap, Search, Filter, ArrowUpDown } from "lucide-react";
import { carImageMap } from "../../data/carImages";

interface RentalVehicle {
  id: number; model: string; year: number; price: number; range_miles: number; acceleration: string; battery: string; description: string; badge: string; category: string; status: string; rental_price_per_day: number; specs: any;
}

interface RentalBooking {
  carId: number; startDate: string; endDate: string; deliveryCity: string; deliveryCountry: string; insuranceTier: string; extras: { gps: boolean; childSeat: boolean; roofRack: boolean; winterTires: boolean }; paymentMethod: string;
}

interface Props { authToken: string; onNavigate: (view: string, params?: any) => void; }

const INSURANCE_TIERS = [
  { id: "basic", name: "Basic", price: 10, coverage: "Liability only", icon: Shield },
  { id: "premium", name: "Premium", price: 25, coverage: "Collision + theft", icon: Shield },
  { id: "elite", name: "Elite", price: 50, coverage: "Full coverage + roadside", icon: Shield },
];

const DELIVERY_CITIES = [
  { city: "Los Angeles", country: "US", fee: 0 },
  { city: "New York", country: "US", fee: 50 },
  { city: "London", country: "UK", fee: 150 },
  { city: "Frankfurt", country: "DE", fee: 120 },
  { city: "Lagos", country: "NG", fee: 200 },
  { city: "Singapore", country: "SG", fee: 180 },
  { city: "Dubai", country: "AE", fee: 160 },
  { city: "Sydney", country: "AU", fee: 190 },
  { city: "São Paulo", country: "BR", fee: 170 },
];

export function RentVehiclePage({ authToken, onNavigate }: Props) {
  const [vehicles, setVehicles] = useState<RentalVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<RentalVehicle | null>(null);
  const [step, setStep] = useState<"browse" | "configure" | "review" | "payment" | "success">("browse");
  const [booking, setBooking] = useState<RentalBooking>({ carId: 0, startDate: "", endDate: "", deliveryCity: "Los Angeles", deliveryCountry: "US", insuranceTier: "basic", extras: { gps: false, childSeat: false, roofRack: false, winterTires: false }, paymentMethod: "crypto" });
  const [availability, setAvailability] = useState<{ available: boolean; price_per_day: number } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("price");
  const [searchQuery, setSearchQuery] = useState("");
  const [isElite, setIsElite] = useState(false);

  useEffect(() => { fetchVehicles(); checkEliteStatus(); }, []);

  const checkEliteStatus = async () => {
    try {
      const res = await fetch("/api/dashboard/summary", { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      setIsElite(!!data?.membership_active);
    } catch {}
  };

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/rentals/vehicles");
      const data = await res.json();
      setVehicles(data);
    } catch {} finally { setLoading(false); }
  };

  const checkAvailability = async () => {
    if (!selectedVehicle || !booking.startDate || !booking.endDate) return;
    setCheckingAvailability(true);
    try {
      const res = await fetch(`/api/rentals/availability/${selectedVehicle.id}?startDate=${booking.startDate}&endDate=${booking.endDate}`);
      const data = await res.json();
      setAvailability(data);
    } catch {} finally { setCheckingAvailability(false); }
  };

  useEffect(() => { if (selectedVehicle && booking.startDate && booking.endDate) checkAvailability(); }, [booking.startDate, booking.endDate, selectedVehicle]);

  const calculateTotal = () => {
    if (!selectedVehicle) return { daily: 0, days: 0, subtotal: 0, insurance: 0, extras: 0, delivery: 0, total: 0, discount: 0, discountAmt: 0 };
    const days = booking.startDate && booking.endDate ? Math.max(1, Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / 86400000)) : 1;
    const baseDaily = availability?.price_per_day || selectedVehicle.rental_price_per_day || 200;
    const daily = isElite ? Math.round(baseDaily * 0.85 * 100) / 100 : baseDaily;
    const discountAmt = isElite ? Math.round((baseDaily - daily) * days * 100) / 100 : 0;
    const insurance = (INSURANCE_TIERS.find(t => t.id === booking.insuranceTier)?.price || 10) * days;
    const extras = (booking.extras.gps ? 5 : 0) + (booking.extras.childSeat ? 8 : 0) + (booking.extras.roofRack ? 12 : 0) + (booking.extras.winterTires ? 15 : 0);
    const delivery = DELIVERY_CITIES.find(c => c.city === booking.deliveryCity)?.fee || 0;
    const subtotal = daily * days + insurance + extras + delivery;
    return { daily, days, subtotal, insurance, extras, delivery, total: subtotal, discount: isElite ? 15 : 0, discountAmt };
  };

  const handleBook = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/rentals/book", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ carId: selectedVehicle?.id, startDate: booking.startDate, endDate: booking.endDate, deliveryCity: booking.deliveryCity, deliveryCountry: booking.deliveryCountry, insuranceTier: booking.insuranceTier, extras: booking.extras, paymentMethod: booking.paymentMethod })
      });
      const data = await res.json();
      if (data.kycRequired) { alert("KYC verification required. Please complete identity verification first."); onNavigate("dashboard", { tab: "kyc" }); return; }
      if (data.success) { setOrderResult(data); setStep("success"); }
      else { alert(data.error || "Booking failed."); }
    } catch { alert("Network error. Please try again."); } finally { setSubmitting(false); }
  };

  const filteredVehicles = vehicles.filter(v => {
    if (filterCategory !== "all" && v.category !== filterCategory) return false;
    if (searchQuery && !v.model.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "price") return a.rental_price_per_day - b.rental_price_per_day;
    if (sortBy === "range") return b.range_miles - a.range_miles;
    if (sortBy === "name") return a.model.localeCompare(b.model);
    return 0;
  });

  if (step === "success" && orderResult) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white/5 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center"><Check className="w-8 h-8 text-emerald-400" /></div>
          <h2 className="text-2xl font-bold mb-2">Rental Booked!</h2>
          <p className="text-sm text-slate-400 mb-4">Order <span className="text-emerald-400 font-mono">{orderResult.order_number}</span></p>
          <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-400">Daily Rate</span><span className="font-mono">${orderResult.daily_rate}/day</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Duration</span><span className="font-mono">{orderResult.days} days</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Insurance</span><span className="font-mono">${orderResult.insurance_cost}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Extras</span><span className="font-mono">${orderResult.extras_cost}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Delivery</span><span className="font-mono">${orderResult.delivery_fee}</span></div>
            <div className="border-t border-white/10 pt-2 flex justify-between font-bold"><span>Total</span><span className="text-cyan-400">${orderResult.subtotal}</span></div>
          </div>
          <button onClick={() => onNavigate("dashboard", { tab: "tracking" })} className="w-full py-3 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-sm font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer">Track My Rental</button>
        </div>
      </div>
    );
  }

  if (step === "configure" && selectedVehicle) {
    const totals = calculateTotal();
    return (
      <div className="space-y-6">
        <button onClick={() => setStep("browse")} className="text-sm text-slate-400 hover:text-white transition flex items-center gap-1"><ChevronRight className="w-4 h-4 rotate-180" /> Back to vehicles</button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-1">{selectedVehicle.model} ({selectedVehicle.year})</h2>
              <p className="text-sm text-slate-400 mb-4">{selectedVehicle.description}</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white/5 rounded-xl p-3"><div className="text-lg font-bold text-cyan-400">{selectedVehicle.range_miles} mi</div><div className="text-[10px] text-slate-500 font-mono">Range</div></div>
                <div className="bg-white/5 rounded-xl p-3"><div className="text-lg font-bold text-cyan-400">{selectedVehicle.acceleration}</div><div className="text-[10px] text-slate-500 font-mono">0-60 mph</div></div>
                <div className="bg-white/5 rounded-xl p-3"><div className="text-lg font-bold text-cyan-400">{selectedVehicle.battery}</div><div className="text-[10px] text-slate-500 font-mono">Battery</div></div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold">Rental Dates</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Start Date</label><input type="date" value={booking.startDate} min={new Date().toISOString().split("T")[0]} onChange={e => setBooking(p => ({ ...p, startDate: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" /></div>
                <div><label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">End Date</label><input type="date" value={booking.endDate} min={booking.startDate || new Date().toISOString().split("T")[0]} onChange={e => setBooking(p => ({ ...p, endDate: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40" /></div>
              </div>
              {checkingAvailability && <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Checking availability...</div>}
              {availability && !checkingAvailability && (
                <div className={`flex items-center gap-2 text-sm ${availability.available ? "text-emerald-400" : "text-red-400"}`}>
                  {availability.available ? <><Check className="w-4 h-4" /> Available — ${availability.price_per_day}/day</> : <><AlertTriangle className="w-4 h-4" /> Not available for these dates</>}
                </div>
              )}
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold">Delivery Location</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {DELIVERY_CITIES.map(c => (
                  <button key={c.city} onClick={() => setBooking(p => ({ ...p, deliveryCity: c.city, deliveryCountry: c.country }))} className={`p-3 rounded-xl border text-left transition cursor-pointer ${booking.deliveryCity === c.city ? "bg-cyan-500/10 border-cyan-500/30" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                    <div className="text-sm font-bold">{c.city}</div>
                    <div className="text-[10px] text-slate-500">{c.country} {c.fee > 0 ? `• +$${c.fee}` : "• Free"}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold">Insurance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {INSURANCE_TIERS.map(t => (
                  <button key={t.id} onClick={() => setBooking(p => ({ ...p, insuranceTier: t.id }))} className={`p-4 rounded-xl border text-left transition cursor-pointer ${booking.insuranceTier === t.id ? "bg-cyan-500/10 border-cyan-500/30" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                    <div className="flex items-center gap-2 mb-1"><t.icon className="w-4 h-4 text-cyan-400" /><span className="text-sm font-bold">{t.name}</span></div>
                    <div className="text-[10px] text-slate-400">{t.coverage}</div>
                    <div className="text-xs font-mono text-cyan-400 mt-2">+${t.price}/day</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold">Add-Ons</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "gps" as const, label: "GPS Tracker", price: 5 },
                  { key: "childSeat" as const, label: "Child Seat", price: 8 },
                  { key: "roofRack" as const, label: "Roof Rack", price: 12 },
                  { key: "winterTires" as const, label: "Winter Tires", price: 15 },
                ].map(e => (
                  <button key={e.key} onClick={() => setBooking(p => ({ ...p, extras: { ...p.extras, [e.key]: !p.extras[e.key] } }))} className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${booking.extras[e.key] ? "bg-cyan-500/10 border-cyan-500/30" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                    <span className="text-sm">{e.label}</span>
                    <span className="text-[10px] font-mono text-slate-400">+${e.price}/day</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sticky top-24">
              <h3 className="text-lg font-bold mb-4">Order Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Vehicle</span><span>{selectedVehicle.model}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Duration</span><span className="font-mono">{totals.days} days</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Daily Rate</span><span className="font-mono">${totals.daily}/day</span></div>
                {totals.discount > 0 && <div className="flex justify-between text-emerald-400"><span className="text-slate-400">Elite Discount ({totals.discount}%)</span><span className="font-mono">-${totals.discountAmt}</span></div>}
                <div className="flex justify-between"><span className="text-slate-400">Rental Cost</span><span className="font-mono">${totals.daily * totals.days}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Insurance</span><span className="font-mono">${totals.insurance}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Add-Ons</span><span className="font-mono">${totals.extras}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Delivery</span><span className="font-mono">${totals.delivery}</span></div>
                <div className="border-t border-white/10 pt-3 flex justify-between font-bold text-lg"><span>Total</span><span className="text-cyan-400">${totals.total}</span></div>
              </div>
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-bold">Payment Method</h4>
                {[
                  { id: "crypto", label: "Crypto (Recommended)", badge: "5% bonus", color: "emerald" },
                  { id: "paystack", label: "Paystack", badge: "1-3 days", color: "blue" },
                  { id: "stripe", label: "Stripe", badge: "1-3 days", color: "purple" },
                  { id: "paypal", label: "PayPal", badge: "1-3 days", color: "cyan" },
                  { id: "bank_transfer", label: "Bank Transfer", badge: "3-5 days", color: "amber" },
                ].map(m => {
                  const active = booking.paymentMethod === m.id;
                  const colors: Record<string, string> = { emerald: "emerald", blue: "blue", purple: "purple", cyan: "cyan", amber: "amber" };
                  return (
                  <button key={m.id} onClick={() => setBooking(p => ({ ...p, paymentMethod: m.id }))} className={`w-full p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${active ? "bg-cyan-500/10 border-cyan-500/30" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                    <span className="text-sm">{m.label}</span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${active ? "bg-cyan-500/10 text-cyan-400" : "bg-white/10 text-white/40"}`}>{m.badge}</span>
                  </button>
                  );
                })}
              </div>
              <button disabled={!availability?.available || submitting || !booking.startDate || !booking.endDate} onClick={handleBook} className="w-full mt-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Confirm & Pay"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Rent a BYD Vehicle</h2>
          <p className="text-sm text-slate-400">Browse our fleet and book your dream EV</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" placeholder="Search models..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-500/40 w-48" /></div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none cursor-pointer"><option value="all">All Categories</option><option value="Sedan">Sedan</option><option value="SUV">SUV</option><option value="Hatchback">Hatchback</option><option value="MPV">MPV</option></select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none cursor-pointer"><option value="price">Price: Low-High</option><option value="range">Range: High-Low</option><option value="name">Name: A-Z</option></select>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-center py-20 text-slate-500"><Car className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No vehicles found</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map(v => (
            <div key={v.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition group">
              <div className="aspect-video bg-white/5 relative overflow-hidden">
                <img src={carImageMap[v.model] || "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600&q=80"} alt={v.model} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600&q=80"; }} />
                {v.badge && <div className="absolute top-3 left-3 px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-[9px] font-bold text-cyan-300">{v.badge}</div>}
                <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-sm font-bold text-cyan-400 font-mono">${v.rental_price_per_day}/day</div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold mb-1">{v.model}</h3>
                <p className="text-xs text-slate-400 mb-3 line-clamp-2">{v.description}</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center"><div className="text-xs font-bold text-cyan-400">{v.range_miles} mi</div><div className="text-[9px] text-slate-500">Range</div></div>
                  <div className="text-center"><div className="text-xs font-bold text-cyan-400">{v.acceleration}</div><div className="text-[9px] text-slate-500">0-60</div></div>
                  <div className="text-center"><div className="text-xs font-bold text-cyan-400">{v.battery}</div><div className="text-[9px] text-slate-500">Battery</div></div>
                </div>
                <button onClick={() => { setSelectedVehicle(v); setBooking(p => ({ ...p, carId: v.id })); setStep("configure"); }} className="w-full py-2.5 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer">Configure Rental</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

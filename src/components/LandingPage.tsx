import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Sparkles, Car, Leaf, Trophy, Users, Zap, Shield, Globe, Gift,
  ArrowRight, ChevronLeft, ChevronRight, Star, TrendingUp
} from "lucide-react";

interface LandingPageProps {
  onNavigate: (view: "landing" | "vehicles" | "payment" | "dashboard" | "admin" | "help", params?: any) => void;
  charityAmount: number;
  setCharityAmount: React.Dispatch<React.SetStateAction<number>>;
}

const FEATURED_CARS = [
  { name: "BYD Seal", category: "Luxury Sedan", price: "$45,900", range: "323 mi", power: "523 hp", accel: "3.8s", img: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80" },
  { name: "BYD Atto 3", category: "Compact SUV", price: "$38,900", range: "260 mi", power: "201 hp", accel: "7.3s", img: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80" },
  { name: "BYD Han", category: "Flagship Sedan", price: "$52,500", range: "375 mi", power: "616 hp", accel: "3.9s", img: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80" },
  { name: "BYD Dolphin", category: "Urban Hatch", price: "$29,900", range: "211 mi", power: "94 hp", accel: "7.0s", img: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80" },
];

const TESTIMONIALS = [
  { name: "Sarah K.", role: "Premium Member, LA", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80", quote: "Joining BYD Horizon Club was the best decision I've made. The referral earnings paid for my first year." },
  { name: "James M.", role: "Elite Tier, Austin", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80", quote: "The Mystery Car Subscription is thrilling. Every month a new BYD shows up at my door. Unreal experience." },
  { name: "Elena R.", role: "President's Club, Miami", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80", quote: "President's Club perks are unmatched. Priority delivery, exclusive events, and double Horizon Points." },
  { name: "David C.", role: "Member, Seattle", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80", quote: "Drive to Earn changed my commute. I actually look forward to traffic now — every mile counts." },
  { name: "Priya S.", role: "Carbon Champion, NYC", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80", quote: "Knowing my driving funds carbon offset projects makes every trip meaningful. Real impact." },
  { name: "Marcus T.", role: "Referral Leader, Chicago", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80", quote: "I've referred 23 members and earned over $1,150. This is the best car community on the planet." },
];

const LEADERBOARD = [
  { name: "@VoltPioneer", referrals: 47, reward: "$2,350" },
  { name: "@EcoKing", referrals: 38, reward: "$1,900" },
  { name: "@ChargeMaster", referrals: 31, reward: "$1,550" },
  { name: "@EVAngel", referrals: 28, reward: "$1,400" },
  { name: "@ZenDrive", referrals: 22, reward: "$1,100" },
];

function AnimatedCounter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [heroIdx, setHeroIdx] = useState(0);
  const [carbonOffset, setCarbonOffset] = useState(1427);

  const HERO_SLIDES = [
    { img: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1920&q=80", tagline: "The World's First Decentralized EV Collective", title: "Own the future.\nDrive the present.\nEarn the difference.", desc: "Join a global movement of EV enthusiasts earning rewards for every mile. Refer friends, unlock tiers, and experience the future of automotive membership.", cta: "Join the Club", ctaNav: "payment" as const },
    { img: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1920&q=80", tagline: "Zero Emissions, Maximum Thrills", title: "Silent power.\nInstant torque.\nZero compromise.", desc: "BYD's Blade Battery technology delivers unmatched safety and range. Experience the next generation of electric mobility.", cta: "Explore Models", ctaNav: "vehicles" as const },
    { img: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=1920&q=80", tagline: "Earn While You Drive", title: "Every mile.\nEvery referral.\nEvery reward.", desc: "Drive to Earn turns your daily commute into income. Earn $0.10/mile, plus bonus rewards for eco-friendly driving patterns.", cta: "Start Earning", ctaNav: "dashboard" as const },
    { img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=80", tagline: "Premium Membership Tiers", title: "Bronze.\nSilver.\nGold.\nElite.\nPresidents.", desc: "Climb the ranks from Bronze to President's Club. Each tier unlocks exclusive benefits, higher earnings, and VIP experiences.", cta: "View Tiers", ctaNav: "dashboard" as const },
    { img: "https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?auto=format&fit=crop&w=1920&q=80", tagline: "Mystery Car Subscription", title: "Surprise.\nExcitement.\nEvery month.", desc: "Subscribe and receive a surprise BYD model delivered to your door. Premium and Elite members get priority access.", cta: "Subscribe Now", ctaNav: "dashboard" as const },
    { img: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=1920&q=80", tagline: "Real-Time Vehicle Tracking", title: "Track.\nMonitor.\nControl.", desc: "Live GPS tracking, delivery updates, and remote vehicle diagnostics — all from your dashboard.", cta: "Track Vehicle", ctaNav: "dashboard" as const },
    { img: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1920&q=80", tagline: "Refer & Earn $50", title: "Share.\nInvite.\nProfit.", desc: "Earn $50 for every direct referral. Build your network and earn from 3 levels of referrals. Top earners make $2,000+/month.", cta: "Get Referral Link", ctaNav: "dashboard" as const },
    { img: "https://images.unsplash.com/photo-1597007066017-8e3b2f33b134?auto=format&fit=crop&w=1920&q=80", tagline: "Drive to Earn Rewards", title: "Commute.\nEarn.\nRepeat.", desc: "Log your daily drives and earn Horizon Points. Convert points to cash, crypto, or exclusive merchandise.", cta: "Log First Drive", ctaNav: "dashboard" as const },
    { img: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1920&q=80", tagline: "Carbon Offset Program", title: "Drive green.\nOffset carbon.\nPlant trees.", desc: "Every mile you drive funds carbon offset projects. Track your environmental impact in real-time on your dashboard.", cta: "View Impact", ctaNav: "dashboard" as const },
    { img: "https://images.unsplash.com/photo-1614200187524-dc4b892acf16?auto=format&fit=crop&w=1920&q=80", tagline: "Crypto-First Payments", title: "USDT.\nBTC.\nETH.\nInstant.", desc: "Pay with cryptocurrency for instant processing. Traditional payment methods also accepted. All transactions are secure and transparent.", cta: "See Payment Options", ctaNav: "payment" as const },
    { img: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1920&q=80", tagline: "Lottery & Sweepstakes", title: "Win.\nDream.\nDrive.", desc: "Enter monthly draws for a chance to win a brand-new BYD vehicle. Every ticket purchased earns Horizon Points.", cta: "Enter Draw", ctaNav: "dashboard" as const },
    { img: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1920&q=80", tagline: "BYD Horizon Club Community", title: "Join.\nConnect.\nBelong.", desc: "25,000+ members worldwide. Exclusive events, meetups, and a community of EV enthusiasts who share your passion.", cta: "Join Community", ctaNav: "payment" as const },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIdx(prev => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIdx(prev => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full relative overflow-hidden bg-slate-950">

      {/* Hero Section — 12-slide Carousel */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {HERO_SLIDES.map((slide, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === heroIdx ? "opacity-100 z-10" : "opacity-0 z-0"}`}>
            <img src={slide.img} alt="" className="w-full h-full object-cover" loading={i === 0 ? "eager" : "lazy"} onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format"; }} />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/30" />
          </div>
        ))}

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.div
            key={`tag-${heroIdx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center space-x-2 bg-cyan-500/10 border border-cyan-400/20 px-4 py-1.5 rounded-full text-xs font-mono text-cyan-400 mb-8 tracking-wide uppercase"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{HERO_SLIDES[heroIdx].tagline}</span>
          </motion.div>

          <motion.h1
            key={`title-${heroIdx}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[0.95] max-w-5xl mx-auto whitespace-pre-line"
          >
            {HERO_SLIDES[heroIdx].title}
          </motion.h1>

          <motion.p
            key={`desc-${heroIdx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            {HERO_SLIDES[heroIdx].desc}
          </motion.p>

          <motion.div
            key={`cta-${heroIdx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => onNavigate(HERO_SLIDES[heroIdx].ctaNav)}
              className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-base rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-105 font-display"
            >
              {HERO_SLIDES[heroIdx].cta}
              <ArrowRight className="inline-block w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => {
                const next = (heroIdx + 1) % HERO_SLIDES.length;
                setHeroIdx(next);
              }}
              className="group px-8 py-4 bg-white/5 border border-white/10 text-white font-medium text-base rounded-2xl hover:bg-white/10 transition-all font-display"
            >
              Next Slide
            </button>
          </motion.div>

          {/* Slide indicators */}
          <div className="mt-12 flex items-center justify-center gap-2">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIdx(i)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${i === heroIdx ? "w-8 bg-cyan-400" : "w-2 bg-white/20 hover:bg-white/40"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Live Stats Ticker */}
      <section className="relative -mt-20 z-20 max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            { icon: Users, value: 1247, label: "Active Members", suffix: "+" },
            { icon: TrendingUp, value: 2300000, label: "Referral Earnings", prefix: "$", suffix: "+" },
            { icon: Car, value: 847, label: "BYDs Delivered", suffix: "+" },
          ].map((stat, i) => (
            <div key={i} className="text-center space-y-2">
              <stat.icon className="w-6 h-6 text-cyan-400 mx-auto" />
              <div className="font-display text-4xl font-bold text-white tabular-nums">
                <AnimatedCounter target={stat.value} prefix={stat.prefix || ""} suffix={stat.suffix || ""} />
              </div>
              <div className="text-sm text-slate-400 font-mono">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Bento Grid Showcase */}
      <section className="max-w-7xl mx-auto px-4 py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-3"
        >
          <span className="inline-flex items-center space-x-2 bg-cyan-500/10 border border-cyan-400/20 px-4 py-1.5 rounded-full text-xs font-mono text-cyan-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Horizon Club Features</span>
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Everything in one place
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[200px]">
          {/* Card 1 - Drive to Earn (Large - spans 2 cols, 2 rows) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="md:col-span-2 md:row-span-2 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 backdrop-blur-xl p-8 flex flex-col justify-between group hover:border-cyan-500/30 transition-all duration-500"
          >
            <div className="flex items-start justify-between">
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400">
                <Zap className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-wider bg-cyan-500/5 px-3 py-1 rounded-full border border-cyan-400/10">Drive to Earn</span>
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-white mb-2">Earn While You Drive</h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                Earn Horizon Points for every mile you drive. Redeem for rewards, service credits, and exclusive BYD merchandise.
              </p>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2 text-cyan-400 font-mono">
                <span className="text-2xl font-bold">10</span>
                <span className="text-xs">pts / mile</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-slate-400 font-mono text-xs">5,000+ members active</div>
            </div>
          </motion.div>

          {/* Card 2 - Mystery Car (Medium) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="md:col-span-1 md:row-span-2 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 backdrop-blur-xl p-8 flex flex-col justify-between group hover:border-purple-500/30 transition-all duration-500"
          >
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center text-purple-400">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-2">Mystery Car</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                $99/month for a random BYD delivered monthly.
              </p>
            </div>
            <div className="text-3xl font-display font-bold text-white">
              $99<span className="text-sm text-slate-400 font-sans">/mo</span>
            </div>
          </motion.div>

          {/* Card 3 - President's Club (Small) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="md:col-span-1 md:row-span-1 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between group hover:border-amber-500/30 transition-all duration-500"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white">President's Club</h3>
              <p className="text-slate-400 text-xs mt-1">Elite tier for top referrers</p>
            </div>
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold text-white">★</div>
              ))}
            </div>
          </motion.div>

          {/* Card 4 - Referral Leaderboard (Medium) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="md:col-span-2 md:row-span-2 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 backdrop-blur-xl p-8 flex flex-col justify-between group hover:border-emerald-500/30 transition-all duration-500"
          >
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono text-emerald-400/60 uppercase">Top Referrers</span>
            </div>
            <h3 className="font-display text-xl font-bold text-white">Referral Leaderboard</h3>
            <div className="space-y-2">
              {LEADERBOARD.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${i === 0 ? "bg-amber-400/20 text-amber-400" : i === 1 ? "bg-slate-400/20 text-slate-400" : i === 2 ? "bg-orange-400/20 text-orange-400" : "bg-slate-700/30 text-slate-500"}`}>{i + 1}</span>
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-slate-500">{item.referrals} refs</span>
                    <span className="text-emerald-400 font-semibold">{item.reward}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Card 5 - BYD Fleet Carousel (Large) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="md:col-span-2 md:row-span-2 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 backdrop-blur-xl p-0 overflow-hidden group relative"
          >
            <div className="absolute top-4 left-4 z-10">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider bg-slate-950/80 px-3 py-1 rounded-full border border-white/10">BYD Fleet</span>
            </div>
            <div className="grid grid-cols-2 h-full">
              {FEATURED_CARS.slice(0, 4).map((car, i) => (
                <div key={i} className="relative overflow-hidden group/card border border-white/5">
                  <img src={car.img} alt={car.name} className="w-full h-full object-cover group-hover/card:scale-110 transition-all duration-700" onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format"; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent p-4 flex flex-col justify-end">
                    <h4 className="font-display text-sm font-bold text-white">{car.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{car.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Card 6 - Carbon Offset Counter (Small) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="md:col-span-1 md:row-span-1 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between group hover:border-emerald-500/30 transition-all duration-500"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white">Carbon Offset</h3>
              <p className="text-slate-400 text-xs mt-1">Trees planted by members</p>
            </div>
            <div className="font-display text-2xl font-bold text-emerald-400">
              <AnimatedCounter target={carbonOffset} suffix="+" />
              <span className="text-xs text-slate-400 ml-1 font-sans">trees</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonial Carousel */}
      <section className="bg-slate-900/50 border-y border-white/5 py-24">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 space-y-3"
          >
            <span className="inline-flex items-center space-x-2 bg-cyan-500/10 border border-cyan-400/20 px-4 py-1.5 rounded-full text-xs font-mono text-cyan-400 uppercase tracking-wider">
              <Star className="w-3.5 h-3.5" />
              <span>Member Testimonials</span>
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight">
              Loved by thousands
            </h2>
          </motion.div>

          <div className="relative">
            <button
              onClick={() => setTestimonialIdx(prev => (prev === 0 ? TESTIMONIALS.length - 1 : prev - 1))}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 h-10 w-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-cyan-400/30 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTestimonialIdx(prev => (prev + 1) % TESTIMONIALS.length)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 h-10 w-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-cyan-400/30 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="overflow-hidden">
              <motion.div
                key={testimonialIdx}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                className="bg-slate-900/80 border border-white/10 backdrop-blur-xl rounded-3xl p-10 md:p-14 text-center max-w-3xl mx-auto"
              >
                <div className="flex justify-center mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-lg md:text-xl text-slate-200 leading-relaxed font-sans mb-8 italic">
                  "{TESTIMONIALS[testimonialIdx].quote}"
                </p>
                <div className="flex items-center justify-center space-x-4">
                  <img
                    src={TESTIMONIALS[testimonialIdx].avatar}
                    alt={TESTIMONIALS[testimonialIdx].name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400/30"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format"; }}
                  />
                  <div className="text-left">
                    <div className="font-display font-semibold text-white">{TESTIMONIALS[testimonialIdx].name}</div>
                    <div className="text-xs text-slate-400 font-mono">{TESTIMONIALS[testimonialIdx].role}</div>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="flex justify-center space-x-2 mt-8">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTestimonialIdx(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${i === testimonialIdx ? "w-8 bg-cyan-400" : "w-2 bg-slate-700 hover:bg-slate-500"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-16 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-xs font-mono text-slate-500 uppercase tracking-widest mb-8">Trusted by Industry Leaders</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-50">
            {["Bloomberg", "Reuters", "TechCrunch", "Forbes", "WIRED", "The Verge", "CNBC"].map((name) => (
              <div key={name} className="font-display text-xl text-slate-400 font-bold tracking-tight">{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Fleet Grid Preview */}
      <section id="fleet-preview" className="max-w-7xl mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-3"
        >
          <span className="inline-flex items-center space-x-2 bg-cyan-500/10 border border-cyan-400/20 px-4 py-1.5 rounded-full text-xs font-mono text-cyan-400 uppercase tracking-wider">
            <Car className="w-3.5 h-3.5" />
            <span>Featured Fleet</span>
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Choose your BYD
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_CARS.map((car, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group rounded-3xl bg-slate-900 border border-white/10 overflow-hidden hover:border-cyan-500/30 transition-all duration-500"
            >
              <div className="h-48 overflow-hidden">
                <img src={car.img} alt={car.name} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format"; }} />
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">{car.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{car.category}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
                  <div className="bg-slate-950 rounded-xl p-2">
                    <div className="text-slate-500">Range</div>
                    <div className="text-white font-semibold">{car.range}</div>
                  </div>
                  <div className="bg-slate-950 rounded-xl p-2">
                    <div className="text-slate-500">Power</div>
                    <div className="text-white font-semibold">{car.power}</div>
                  </div>
                  <div className="bg-slate-950 rounded-xl p-2">
                    <div className="text-slate-500">0-60</div>
                    <div className="text-white font-semibold">{car.accel}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-bold text-white">{car.price}</span>
                  <button
                    onClick={() => onNavigate("payment", { planType: "installment" })}
                    className="px-4 py-2 bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-500/20 transition-all"
                  >
                    Invest
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-900/50 border-y border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-3"
          >
            <span className="inline-flex items-center space-x-2 bg-cyan-500/10 border border-cyan-400/20 px-4 py-1.5 rounded-full text-xs font-mono text-cyan-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Platform Features</span>
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight">
              Everything you need
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Flexible Payment Methods",
                desc: "Crypto, credit cards, bank transfers — choose how you fund your membership. All payments are secured and audited in real-time.",
                color: "from-cyan-400 to-blue-500",
                bgColor: "bg-cyan-500/10",
                borderColor: "border-cyan-400/20",
                iconColor: "text-cyan-400",
              },
              {
                icon: Globe,
                title: "Global Tracking",
                desc: "Real-time telemetry from international harbors to your doorstep. Monitor every leg of your BYD's journey with precision.",
                color: "from-emerald-400 to-teal-500",
                bgColor: "bg-emerald-500/10",
                borderColor: "border-emerald-400/20",
                iconColor: "text-emerald-400",
              },
              {
                icon: Gift,
                title: "Exclusive Rewards",
                desc: "Earn Horizon Points on every transaction. Redeem for merchandise, service upgrades, charging credits, and VIP experiences.",
                color: "from-amber-400 to-orange-500",
                bgColor: "bg-amber-500/10",
                borderColor: "border-amber-400/20",
                iconColor: "text-amber-400",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="group rounded-3xl bg-slate-950 border border-white/10 backdrop-blur-xl p-8 hover:border-cyan-500/30 transition-all duration-500"
              >
                <div className={`h-14 w-14 rounded-2xl ${feature.bgColor} ${feature.borderColor} border flex items-center justify-center ${feature.iconColor} mb-6`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                <div className="mt-6 h-1 w-12 rounded-full bg-gradient-to-r from-cyan-400/50 to-blue-500/50 opacity-40 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

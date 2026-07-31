import React, { useState } from "react";
import { Upload, CheckCircle, X, Shield, ArrowRight, ArrowLeft, FileCheck } from "lucide-react";

interface CameraKYCProps {
  token: string;
  currentStatus?: string;
  onComplete?: () => void;
}

export default function CameraKYC({ token, currentStatus, onComplete }: CameraKYCProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      if (type === "id_front") setFrontImage(data);
      else if (type === "id_back") setBackImage(data);
      else setSelfieImage(data);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (type: string) => {
    if (type === "id_front") setFrontImage(null);
    else if (type === "id_back") setBackImage(null);
    else setSelfieImage(null);
  };

  const submitKYC = async () => {
    if (!frontImage || !backImage || !selfieImage) { setError("All three photos are required."); return; }
    setUploading(true);
    setError("");
    try {
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id_front: frontImage, id_back: backImage, selfie: selfieImage })
      });
      if (res.ok) { setDone(true); onComplete?.(); }
      else { const d = await res.json(); setError(d.error || "Upload failed."); }
    } catch { setError("Network error. Please try again."); }
    finally { setUploading(false); }
  };

  const reset = () => { setFrontImage(null); setBackImage(null); setSelfieImage(null); setCurrentStep(0); setError(""); setDone(false); };

  const steps = [
    { key: "id_front", label: "ID Front (Front of your ID)", image: frontImage },
    { key: "id_back", label: "ID Back (Back of your ID)", image: backImage },
    { key: "selfie", label: "Selfie / Portrait", image: selfieImage },
  ];

  if (currentStatus === "verified") {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
        <p className="text-sm font-bold text-emerald-400">KYC Verified</p>
        <p className="text-[11px] text-white/40 mt-1">Your identity has been verified.</p>
      </div>
    );
  }

  if (currentStatus === "pending") {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-center">
        <Shield className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <p className="text-sm font-bold text-amber-400">KYC Under Review</p>
        <p className="text-[11px] text-white/40 mt-1">Your documents are being reviewed. This usually takes 24 hours.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center">
        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <p className="text-lg font-bold text-emerald-300">KYC Submitted!</p>
        <p className="text-xs text-white/40 mt-2">Your documents are under review. You'll be notified once verified.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold">Identity Verification (KYC)</h2>
          <p className="text-xs text-slate-400">Complete verification to unlock all features</p>
        </div>
        <FileCheck className="w-6 h-6 text-cyan-400" />
      </div>

      {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl mb-4">{error}</p>}

      <div className="flex items-center justify-between gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s.key} className="flex flex-col items-center gap-1 flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 ${s.image ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : currentStep === i ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-white/5 text-white/40 border-white/10'}`}>
              {s.image ? <CheckCircle className="w-5 h-5" /> : i + 1}
            </div>
            <span className={`text-[9px] text-center ${currentStep === i ? 'text-cyan-400' : 'text-white/50'}`}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="border border-dashed border-white/10 rounded-xl p-8 text-center hover:border-cyan-500/30 transition min-h-[200px] flex flex-col items-center justify-center">
        {steps[currentStep].image ? (
          <>
            <img src={steps[currentStep].image} alt={steps[currentStep].label} className="w-full max-w-xs h-48 object-cover rounded-lg mb-3" />
            <p className="text-xs text-emerald-400 font-mono mb-2">{steps[currentStep].label} ✓</p>
            <button onClick={() => removeImage(steps[currentStep].key)} className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-300 hover:bg-red-500/30 transition cursor-pointer">Remove & Re-upload</button>
          </>
        ) : (
          <label className="cursor-pointer flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-cyan-400" />
            <p className="text-sm font-bold text-white/70">{steps[currentStep].label}</p>
            <p className="text-[11px] text-white/30">Click to upload image</p>
            <p className="text-[10px] text-white/20">Accepted: JPG, PNG, WEBP</p>
            <input type="file" accept="image/*" className="hidden" onChange={e => { handleFileUpload(e, steps[currentStep].key); }} />
          </label>
        )}
      </div>

      <div className="flex justify-between mt-6">
        <button onClick={() => setCurrentStep(p => Math.max(0, p - 1))} disabled={currentStep === 0}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs disabled:opacity-30 cursor-pointer hover:bg-white/10 transition flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Previous
        </button>
        {currentStep < 2 ? (
          <button onClick={() => setCurrentStep(p => p + 1)} disabled={!steps[currentStep].image}
            className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-300 cursor-pointer hover:bg-cyan-500/30 transition disabled:opacity-30 flex items-center gap-1">
            Next <ArrowRight className="w-3 h-3" />
          </button>
        ) : (
          <button onClick={submitKYC} disabled={uploading || !selfieImage}
            className="px-6 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300 cursor-pointer hover:bg-emerald-500/30 transition disabled:opacity-40 flex items-center gap-2">
            {uploading ? <><span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> Submitting...</> : <><Shield className="w-4 h-4" /> Submit KYC</>}
          </button>
        )}
      </div>
    </div>
  );
}

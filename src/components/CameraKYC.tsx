import React, { useState } from "react";
import { Upload, CheckCircle, X, Shield } from "lucide-react";

interface CameraKYCProps {
  token: string;
  currentStatus?: string;
  onComplete?: () => void;
}

export default function CameraKYC({ token, currentStatus, onComplete }: CameraKYCProps) {
  const [step, setStep] = useState<"choose" | "uploading" | "done">("choose");
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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
      if (res.ok) { setStep("done"); onComplete?.(); }
      else { const d = await res.json(); setError(d.error || "Upload failed."); }
    } catch { setError("Network error. Please try again."); }
    finally { setUploading(false); }
  };

  const reset = () => { setFrontImage(null); setBackImage(null); setSelfieImage(null); setStep("choose"); setError(""); };

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

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">{error}</p>}

      {/* Progress Steps */}
      <div className="flex items-center justify-between gap-2">
        {(["id_front", "id_back", "selfie"] as const).map((s, i) => {
          const hasImage = (s === "id_front" && frontImage) || (s === "id_back" && backImage) || (s === "selfie" && selfieImage);
          return (
            <div key={s} className="flex flex-col items-center gap-1 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 ${hasImage ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-white/5 text-white/40 border-white/10'}`}>
                {hasImage ? <CheckCircle className="w-5 h-5" /> : i + 1}
              </div>
              <span className="text-[9px] text-white/50 text-center">{s === "id_front" ? "ID Front" : s === "id_back" ? "ID Back" : "Selfie"}</span>
            </div>
          );
        })}
      </div>

      {/* Upload Areas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["id_front", "id_back", "selfie"] as const).map((type) => {
          const image = type === "id_front" ? frontImage : type === "id_back" ? backImage : selfieImage;
          const label = type === "id_front" ? "ID Front" : type === "id_back" ? "ID Back" : "Selfie / Portrait";
          return (
            <div key={type} className="border border-dashed border-white/10 rounded-xl p-4 text-center hover:border-cyan-500/30 transition relative min-h-[140px] flex flex-col items-center justify-center">
              {image ? (
                <>
                  <img src={image} alt={label} className="w-full h-24 object-cover rounded-lg mb-2" />
                  <p className="text-[10px] text-emerald-400 font-mono">{label} ✓</p>
                  <button onClick={() => removeImage(type)} className="absolute top-1 right-1 p-1 bg-red-500/20 rounded-full hover:bg-red-500/40 transition cursor-pointer"><X className="w-3 h-3 text-red-400" /></button>
                </>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-cyan-400" />
                  <p className="text-xs font-bold text-white/70">{label}</p>
                  <p className="text-[9px] text-white/30">Click to upload</p>
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, type)} />
                </label>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      {frontImage && backImage && selfieImage && (
        <button onClick={submitKYC} disabled={uploading}
          className="w-full py-3.5 bg-gradient-to-r from-[#00E5FF] to-blue-500 text-[#0a0e1a] font-bold rounded-xl text-sm hover:opacity-90 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
          {uploading ? <><span className="w-4 h-4 border-2 border-[#0a0e1a] border-t-transparent rounded-full animate-spin" /> Submitting...</> : <><Shield className="w-4 h-4" /> Submit KYC Verification</>}
        </button>
      )}
      {(frontImage || backImage || selfieImage) && (
        <button onClick={reset} className="text-xs text-red-400 hover:text-red-300 cursor-pointer block mx-auto">Reset all photos</button>
      )}

      {step === "done" && (
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <p className="text-lg font-bold">KYC Submitted!</p>
          <p className="text-xs text-white/40 mt-2">Your documents are under review. You'll be notified once verified.</p>
        </div>
      )}
    </div>
  );
}

import React, { useRef, useState, useCallback } from "react";
import { Camera, Upload, CheckCircle, X, RotateCcw, Shield } from "lucide-react";

interface CameraKYCProps {
  token: string;
  currentStatus?: string;
  onComplete?: () => void;
}

export default function CameraKYC({ token, currentStatus, onComplete }: CameraKYCProps) {
  const [step, setStep] = useState<"choose" | "capture" | "preview" | "uploading" | "done">("choose");
  const [captureType, setCaptureType] = useState<"id_front" | "id_back" | "selfie">("id_front");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async (facingMode: "user" | "environment" = "environment") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStep("capture");
    } catch {
      setError("Camera access denied. Please allow camera access or use file upload.");
    }
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) { ctx.drawImage(video, 0, 0); }
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageData);
    stopCamera();
    setStep("preview");
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const acceptPhoto = () => {
    if (captureType === "id_front") { setFrontImage(capturedImage); setCaptureType("id_back"); }
    else if (captureType === "id_back") { setBackImage(capturedImage); setCaptureType("selfie"); }
    else { setSelfieImage(capturedImage); }
    setCapturedImage(null);
    setStep("choose");
  };

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

  const reset = () => { setFrontImage(null); setBackImage(null); setSelfieImage(null); setCapturedImage(null); setStep("choose"); setError(""); };

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

      {/* Progress */}
      <div className="flex items-center gap-2">
        {(["id_front", "id_back", "selfie"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border ${captureType === s ? 'bg-[#00E5FF] text-[#0a0e1a] border-[#00E5FF]' : (s === "id_front" && frontImage) || (s === "id_back" && backImage) || (s === "selfie" && selfieImage) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/30 border-white/10'}`}>
              {(s === "id_front" && frontImage) || (s === "id_back" && backImage) || (s === "selfie" && selfieImage) ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className="text-[10px] text-white/50">{s === "id_front" ? "ID Front" : s === "id_back" ? "ID Back" : "Selfie"}</span>
            {i < 2 && <div className="w-8 h-px bg-white/10 mx-1"></div>}
          </div>
        ))}
      </div>

      {step === "choose" && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => startCamera(captureType === "selfie" ? "user" : "environment")}
            className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-[#00E5FF]/5 hover:border-[#00E5FF]/20 transition cursor-pointer text-center">
            <Camera className="w-8 h-8 text-[#00E5FF] mx-auto mb-2" />
            <p className="text-xs font-bold">Take Photo</p>
            <p className="text-[10px] text-white/40">Use camera</p>
          </button>
          <label className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-[#00E5FF]/5 hover:border-[#00E5FF]/20 transition cursor-pointer text-center">
            <Upload className="w-8 h-8 text-[#00E5FF] mx-auto mb-2" />
            <p className="text-xs font-bold">Upload File</p>
            <p className="text-[10px] text-white/40">From gallery</p>
            <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, captureType)} />
          </label>
        </div>
      )}

      {step === "capture" && (
        <div className="relative rounded-2xl overflow-hidden border border-white/10">
          <video ref={videoRef} className="w-full h-64 object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <button onClick={capturePhoto} className="p-4 bg-[#00E5FF] rounded-full shadow-lg cursor-pointer hover:bg-[#00E5FF]/90 transition">
              <Camera className="w-6 h-6 text-[#0a0e1a]" />
            </button>
            <button onClick={() => { stopCamera(); setStep("choose"); }} className="p-3 bg-red-500/20 rounded-full cursor-pointer hover:bg-red-500/30 transition">
              <X className="w-5 h-5 text-red-400" />
            </button>
          </div>
        </div>
      )}

      {step === "preview" && capturedImage && (
        <div className="space-y-3">
          <img src={capturedImage} alt="Captured" className="w-full h-64 object-cover rounded-2xl border border-white/10" />
          <div className="flex gap-3">
            <button onClick={acceptPhoto} className="flex-1 py-3 bg-[#00E5FF] text-[#0a0e1a] font-bold rounded-xl text-xs hover:bg-[#00E5FF]/90 transition cursor-pointer flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> Accept
            </button>
            <button onClick={() => { setCapturedImage(null); setStep("capture"); startCamera(); }} className="flex-1 py-3 bg-white/10 text-white font-bold rounded-xl text-xs hover:bg-white/15 transition cursor-pointer flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Retake
            </button>
          </div>
        </div>
      )}

      {/* Submit */}
      {frontImage && backImage && selfieImage && step === "choose" && (
        <button onClick={submitKYC} disabled={uploading}
          className="w-full py-3 bg-gradient-to-r from-[#00E5FF] to-blue-500 text-[#0a0e1a] font-bold rounded-xl text-xs hover:opacity-90 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
          {uploading ? <><span className="w-4 h-4 border-2 border-[#0a0e1a] border-t-transparent rounded-full animate-spin" /> Submitting...</> : <><Shield className="w-4 h-4" /> Submit KYC Verification</>}
        </button>
      )}

      {step === "done" && (
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <p className="text-lg font-bold">KYC Submitted!</p>
          <p className="text-xs text-white/40 mt-2">Your documents are under review. You'll be notified once verified.</p>
        </div>
      )}

      {(frontImage || backImage || selfieImage) && step === "choose" && (
        <button onClick={reset} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">Reset all photos</button>
      )}
    </div>
  );
}

import React, { useRef, useState, useCallback } from "react";
import { QrCode, Camera, X, CheckCircle, Copy, ExternalLink } from "lucide-react";

interface QRPaymentScannerProps {
  token: string;
  walletAddress: string;
  onPaymentDetected?: (hash: string) => void;
}

export default function QRPaymentScanner({ token, walletAddress, onPaymentDetected }: QRPaymentScannerProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedAddress, setScannedAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const openTronscan = () => {
    window.open(`https://tronscan.org/#/address/${walletAddress}`, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Wallet Address Display */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2"><QrCode className="w-4 h-4 text-[#00E5FF]" /> Deposit Address</h3>
        <div className="bg-[#0a0e1a] border border-white/10 p-3 rounded-xl">
          <p className="text-[10px] text-white/40 mb-1">USDT (TRC-20)</p>
          <p className="text-xs font-mono text-[#00E5FF] break-all">{walletAddress || "No wallet address configured"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={copyAddress}
            className="flex-1 py-2 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-[#00E5FF]/20 transition cursor-pointer flex items-center justify-center gap-2">
            {copied ? <><CheckCircle className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Address</>}
          </button>
          <button onClick={openTronscan}
            className="flex-1 py-2 bg-white/5 text-white/60 border border-white/10 rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-white/10 transition cursor-pointer flex items-center justify-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" /> View on Tronscan
          </button>
        </div>
      </div>

      {/* QR Code Display */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl text-center space-y-3">
        <h3 className="text-sm font-bold">Scan QR Code</h3>
        {walletAddress ? (
          <div className="inline-block bg-white p-4 rounded-2xl">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=tron:${walletAddress}?token=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t&amount=0`} alt="QR Code" className="w-48 h-48" />
          </div>
        ) : (
          <p className="text-xs text-white/40">No wallet address configured</p>
        )}
        <p className="text-[10px] text-white/40">Scan with any TRC-20 compatible wallet</p>
      </div>

      {/* Instructions */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl space-y-2">
        <h3 className="text-sm font-bold">How to Deposit</h3>
        <div className="space-y-2 text-xs text-white/60">
          <div className="flex gap-3 items-start">
            <span className="w-5 h-5 bg-[#00E5FF]/10 text-[#00E5FF] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
            <p>Copy the deposit address or scan the QR code above</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-5 h-5 bg-[#00E5FF]/10 text-[#00E5FF] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
            <p>Send USDT (TRC-20) from your wallet. Minimum deposit: $150</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-5 h-5 bg-[#00E5FF]/10 text-[#00E5FF] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</span>
            <p>Copy the transaction hash and paste it in the payment form</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-5 h-5 bg-[#00E5FF]/10 text-[#00E5FF] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">4</span>
            <p>Admin will confirm your deposit. Balance will be credited automatically.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

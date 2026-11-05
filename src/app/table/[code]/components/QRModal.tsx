'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, X, Copy, Check } from 'lucide-react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, roomCode }) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const joinUrl = `${window.location.origin}/table/${roomCode}`;
      QRCode.toDataURL(joinUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).then((url) => {
        setQrUrl(url);
      });
    }
  }, [isOpen, roomCode]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(`${window.location.origin}/table/${roomCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5 max-w-xs w-full shadow-2xl text-center space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-1.5 text-amber-400">
            <QrCode className="w-5 h-5" />
            <span className="text-sm font-extrabold uppercase tracking-wider text-white">
              QUÉT MÃ VÀO BÀN
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Render */}
        <div className="bg-white p-3 rounded-2xl inline-block shadow-inner">
          {qrUrl ? (
            <img src={qrUrl} alt="QR Code Vào Bàn" className="w-48 h-48 mx-auto" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-xs text-zinc-500">
              Đang tạo mã QR...
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-zinc-400">Mã phòng cược:</p>
          <p className="text-2xl font-mono font-black text-amber-400 tracking-widest mt-0.5">
            {roomCode}
          </p>
        </div>

        {/* Copy Link Button */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">ĐÃ SAO CHÉP LIÊN KẾT!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-zinc-400" />
              <span>SAO CHÉP ĐƯỜNG LINK</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

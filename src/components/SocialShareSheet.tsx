import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  MessageCircle,
  Radio,
  Share2,
  X,
} from 'lucide-react';
import { renderShareCardDataUrl, ShareContextPayload } from '../utils/share';

interface SocialShareSheetProps {
  isOpen: boolean;
  payload: ShareContextPayload | null;
  onClose: () => void;
  onNotify: (message: string) => void;
}

export function SocialShareSheet({
  isOpen,
  payload,
  onClose,
  onNotify,
}: SocialShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [customNote, setCustomNote] = useState('');

  useEffect(() => {
    if (isOpen && payload) {
      setCustomNote(payload.message);
      setCopied(false);
    }
  }, [isOpen, payload]);

  if (!isOpen || !payload) return null;

  const activeMessage = customNote.trim() || payload.message;

  const handleCopyText = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(activeMessage);
      }
      setCopied(true);
      onNotify('📋 คัดลอกข้อความแจ้งเตือนสำหรับแชร์เรียบร้อย');
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      onNotify('กรุณาเลือกคัดลอกข้อความจากกล่องด้านบน');
    }
  };

  const handleDownloadCard = () => {
    const dataUrl = renderShareCardDataUrl(payload);
    if (!dataUrl) {
      onNotify('ไม่สามารถสร้างการ์ดรูปภาพได้ในเบราว์เซอร์นี้');
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `road-dee-${payload.kind}-${Date.now()}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    onNotify('🖼️ บันทึกรูปการ์ดแจ้งเตือนเรียบร้อย พร้อมโพสต์ลงโซเชียล');
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `Road Dee · ${payload.headline}`,
          text: activeMessage,
          url: payload.shareUrl,
        });
        onNotify('✅ เปิดหน้าต่างแชร์ของระบบเรียบร้อย');
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    await handleCopyText();
  };

  const encodedLineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(
    `${activeMessage}\n${payload.shareUrl}`
  )}`;
  const encodedFacebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    payload.shareUrl
  )}&quote=${encodeURIComponent(activeMessage)}`;
  const encodedXUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    activeMessage
  )}&url=${encodeURIComponent(payload.shareUrl)}&hashtags=${encodeURIComponent(
    payload.hashtags.join(',')
  )}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="แชร์แจ้งเตือนจราจรลงโซเชียล"
      data-testid="social-share-sheet"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-white dark:bg-[#0F172A] border-t border-x border-slate-200 dark:border-slate-700 shadow-2xl p-4 pb-6 animate-sheet-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                แชร์เตือนเพื่อนบนโซเชียล
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ส่งต่อจุดสกัด น้ำท่วม หรือเส้นทางเลี่ยงรถติดใน 1 แตะ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างแชร์"
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visual Social Card Preview */}
        <div className="mt-3 rounded-2xl bg-slate-900 text-white p-3.5 relative overflow-hidden border border-slate-700/80 shadow-md">
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5"
            style={{ backgroundColor: payload.accentColor }}
          />
          <div className="pl-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide text-sky-400 uppercase">
                <Radio className="w-3 h-3" />
                ROAD DEE · ทางดี
              </span>
              <span
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white"
                style={{ backgroundColor: payload.accentColor }}
              >
                {payload.badgeLabel}
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-white mt-1.5 leading-snug">
              {payload.headline}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-snug">
              {payload.subheadline}
            </p>
            <p className="text-[11px] font-semibold text-emerald-400 mt-2 pt-2 border-t border-slate-800 font-metric">
              {payload.metaLine}
            </p>
          </div>
        </div>

        {/* Message Preview + Quick Edit */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="social-share-textarea"
              className="text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              ข้อความพร้อมแชร์ (แก้ไขได้)
            </label>
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}</span>
            </button>
          </div>
          <textarea
            id="social-share-textarea"
            rows={4}
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 leading-relaxed focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Social Channel Buttons */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          <a
            href={encodedLineUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="แชร์ผ่าน LINE"
            className="min-h-[56px] rounded-2xl bg-[#06C755] hover:bg-[#05b34c] text-white flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-[11px] font-extrabold">LINE</span>
          </a>

          <a
            href={encodedFacebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="แชร์ผ่าน Facebook"
            className="min-h-[56px] rounded-2xl bg-[#1877F2] hover:bg-[#1565d8] text-white flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition"
          >
            <span className="text-sm font-black leading-none">f</span>
            <span className="text-[11px] font-extrabold">Facebook</span>
          </a>

          <a
            href={encodedXUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="แชร์ผ่าน X"
            className="min-h-[56px] rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition"
          >
            <span className="text-sm font-black leading-none">𝕏</span>
            <span className="text-[11px] font-extrabold">X</span>
          </a>

          <button
            type="button"
            onClick={handleNativeShare}
            aria-label="แชร์ผ่านแอปอื่น"
            className="min-h-[56px] rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1 active:scale-95 transition"
          >
            <Share2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span className="text-[11px] font-extrabold">แอปอื่น</span>
          </button>
        </div>

        {/* Bottom Actions: Copy & Download PNG Card */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopyText}
            className={`min-h-[46px] px-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition active:scale-95 ${
              copied
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'คัดลอกข้อความแล้ว' : 'คัดลอกข้อความ'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCard}
            className="min-h-[46px] px-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>บันทึกรูปการ์ด</span>
          </button>
        </div>
      </div>
    </div>
  );
}

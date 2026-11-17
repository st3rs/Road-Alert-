import React from 'react';
import { Clock, Share2, ShieldCheck, ThumbsUp, X } from 'lucide-react';
import { CATEGORY_META } from '../data/bangkokSeedData';
import { IncidentPin } from '../types';
import { formatCountdownThai, formatTimeAgoThai } from '../utils/spatial';
import { CategoryIcon } from './CategoryIcon';

interface PinDetailSheetProps {
  pin: IncidentPin | null;
  nowMs: number;
  onClose: () => void;
  onConfirm: (pinId: string) => void;
  onClear: (pinId: string) => void;
  onShare: (pin: IncidentPin) => void;
}

export function PinDetailSheet({
  pin,
  nowMs,
  onClose,
  onConfirm,
  onClear,
  onShare,
}: PinDetailSheetProps) {
  if (!pin) return null;

  const meta = CATEGORY_META[pin.category];
  const remainingClears = Math.max(1, 3 - pin.clearVotes);

  return (
    <div
      data-testid="pin-detail-sheet"
      className="absolute bottom-3 left-3 right-3 z-40 animate-sheet-in rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 shadow-[0_20px_35px_-10px_rgba(15,23,42,0.25)] p-4"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-sm"
          style={{ backgroundColor: meta.color }}
        >
          <CategoryIcon category={pin.category} className="w-6 h-6" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span style={{ color: meta.color }}>{meta.labelThai}</span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-slate-700 dark:text-slate-300">{pin.heading}</span>
            {pin.laneTag && (
              <>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-slate-600 dark:text-slate-400">{pin.laneTag}</span>
              </>
            )}
          </div>

          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-50 mt-0.5 leading-snug">
            {pin.landmark}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            {pin.description}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onShare(pin)}
            aria-label="แชร์จุดแจ้งเตือนนี้"
            className="w-10 h-10 shrink-0 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-800/80 flex items-center justify-center active:scale-95 transition"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดรายละเอียดหมุด"
            className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Metadata Row (Unboxed clean typography with separators) */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2 font-medium">
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            ความน่าเชื่อถือ <span className="font-metric">{pin.trustScore}%</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-metric font-bold text-slate-900 dark:text-slate-100">
            ยืนยัน {pin.confirmations}x
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-metric">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatCountdownThai(pin.expiresAtMs, nowMs)}</span>
        </div>
      </div>

      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>โดย {pin.reportedBy} · {formatTimeAgoThai(pin.createdAtMs, nowMs)}</span>
        {pin.clearVotes > 0 && (
          <span className="text-amber-600 dark:text-amber-400 font-semibold">
            แจ้งเคลียร์แล้ว {pin.clearVotes}/3 ครั้ง
          </span>
        )}
      </div>

      {/* Crowd Verification Action Buttons */}
      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onConfirm(pin.id)}
          className="min-h-[48px] px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
        >
          <ThumbsUp className="w-4 h-4" />
          <span>ยังอยู่ (+30 นาที)</span>
        </button>

        <button
          type="button"
          onClick={() => onClear(pin.id)}
          className="min-h-[48px] px-3 rounded-2xl bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/60 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-95 transition"
        >
          <X className="w-4 h-4 text-red-500" />
          <span>เคลียร์แล้ว (อีก {remainingClears})</span>
        </button>
      </div>
    </div>
  );
}

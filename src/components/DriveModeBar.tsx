import React from 'react';
import { Check, Square, ThumbsUp, X } from 'lucide-react';
import { CATEGORY_META } from '../data/bangkokSeedData';
import { IncidentPin } from '../types';
import { formatDistanceThai } from '../utils/spatial';

interface DriveModeBarProps {
  speedKmh: number;
  speedLimitKmh: number;
  remainingMeters: number;
  remainingMinutes: number;
  promptPin: IncidentPin | null;
  onConfirmPin: (pinId: string) => void;
  onClearPin: (pinId: string) => void;
  onStopDrive: () => void;
}

export function DriveModeBar({
  speedKmh,
  speedLimitKmh,
  remainingMeters,
  remainingMinutes,
  promptPin,
  onConfirmPin,
  onClearPin,
  onStopDrive,
}: DriveModeBarProps) {
  const meta = promptPin ? CATEGORY_META[promptPin.category] : null;

  return (
    <div
      data-testid="drive-mode-hud"
      className="absolute bottom-5 left-3 right-20 z-30 flex flex-col gap-2"
    >
      {/* Quick Driver Prompt: "ผ่านจุดนี้แล้ว ยังอยู่ไหม?" */}
      {promptPin && meta && (
        <div className="animate-sheet-in rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-lg p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              ผ่านจุดนี้แล้ว ยังอยู่ไหม?
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
              {meta.shortThai} · {promptPin.landmark}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onConfirmPin(promptPin.id)}
              className="min-h-[46px] rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>ยังอยู่</span>
            </button>
            <button
              type="button"
              onClick={() => onClearPin(promptPin.id)}
              className="min-h-[46px] rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/60 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <X className="w-4 h-4 text-red-500" />
              <span>เคลียร์แล้ว</span>
            </button>
          </div>
        </div>
      )}

      {/* Cockpit Speedometer + ETA + Exit Bar */}
      <div className="rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {/* Speedometer & Thai Red-Ring Speed Limit Badge */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col leading-none">
              <span className="font-metric text-2xl font-extrabold text-slate-900 dark:text-slate-50">
                {speedKmh}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                กม./ชม.
              </span>
            </div>
            <div
              aria-label={`จำกัดความเร็ว ${speedLimitKmh} กิโลเมตรต่อชั่วโมง`}
              className="w-10 h-10 rounded-full bg-white border-[3.5px] border-red-600 text-slate-950 font-metric text-sm font-extrabold flex items-center justify-center shadow-sm"
            >
              {speedLimitKmh}
            </div>
          </div>

          <div className="h-7 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />

          <div className="flex flex-col leading-tight">
            <span className="font-metric text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {Math.max(1, Math.round(remainingMinutes))} นาที
            </span>
            <span className="font-metric text-[11px] text-slate-500 dark:text-slate-400">
              เหลือ {formatDistanceThai(remainingMeters)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onStopDrive}
          className="min-h-[44px] px-3.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition whitespace-nowrap"
        >
          {remainingMeters <= 120 ? <Check className="w-4 h-4" /> : <Square className="w-3.5 h-3.5 fill-current" />}
          <span>{remainingMeters <= 120 ? 'ถึงที่หมาย' : 'ออกนำทาง'}</span>
        </button>
      </div>
    </div>
  );
}

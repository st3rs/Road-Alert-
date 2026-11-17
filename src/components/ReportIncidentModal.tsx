import React, { useState } from 'react';
import { MapPin, Mic, MicOff, Send, X } from 'lucide-react';
import { CATEGORY_META } from '../data/bangkokSeedData';
import { IncidentCategory, IncidentHeading, LatLng } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface ReportIncidentModalProps {
  isOpen: boolean;
  currentPosition: LatLng;
  detectedRoadName: string;
  defaultHeading: IncidentHeading;
  onClose: () => void;
  onSubmit: (payload: {
    category: IncidentCategory;
    heading: IncidentHeading;
    laneTag: string;
    note: string;
  }) => void;
}

const CATEGORIES_ORDER: IncidentCategory[] = [
  'checkpoint',
  'accident',
  'traffic',
  'flood',
  'hazard',
  'camera',
];

const LANE_TAGS = ['เลนซ้าย', 'เลนขวา', 'ทุกช่องทาง'] as const;
const HEADING_TAGS: IncidentHeading[] = ['ขาเข้า', 'ขาออก'];

export function ReportIncidentModal({
  isOpen,
  currentPosition,
  detectedRoadName,
  defaultHeading,
  onClose,
  onSubmit,
}: ReportIncidentModalProps) {
  const [category, setCategory] = useState<IncidentCategory>('checkpoint');
  const [laneTag, setLaneTag] = useState<string>('เลนซ้าย');
  const [heading, setHeading] = useState<IncidentHeading>(defaultHeading);
  const [note, setNote] = useState('');
  const [isListeningVoice, setIsListeningVoice] = useState(false);

  if (!isOpen) return null;

  const handleVoiceSimulate = () => {
    setIsListeningVoice((prev) => {
      const next = !prev;
      if (next) {
        const meta = CATEGORY_META[category];
        setNote(`${meta.shortThai} บริเวณ${detectedRoadName} ${laneTag} รถชะลอตัว`);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      category,
      heading,
      laneTag,
      note: note.trim(),
    });
    setNote('');
    setIsListeningVoice(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] animate-sheet-in rounded-t-3xl bg-white dark:bg-[#0F172A] border-t border-slate-200 dark:border-slate-700 shadow-2xl p-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3" />

        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h2
              id="report-modal-title"
              className="text-lg font-extrabold text-slate-900 dark:text-slate-50"
            >
              แจ้งเหตุจราจรด่วน
            </h2>
            <p className="text-xs font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>
                จับพิกัดและทิศทางรถอัตโนมัติ · {detectedRoadName} ({currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)})
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างแจ้งเหตุ"
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* 2x3 Touch-Friendly Incident Category Grid */}
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES_ORDER.map((catId) => {
              const meta = CATEGORY_META[catId];
              const active = category === catId;
              return (
                <button
                  key={catId}
                  type="button"
                  onClick={() => setCategory(catId)}
                  className={`min-h-[82px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 text-center transition active:scale-95 ${
                    active
                      ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-slate-900/70 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                  style={
                    active
                      ? {
                          borderColor: meta.color,
                          boxShadow: `0 4px 14px ${meta.color}40`,
                        }
                      : undefined
                  }
                >
                  <div
                    className="w-9 h-9 rounded-xl text-white flex items-center justify-center"
                    style={{ backgroundColor: meta.color }}
                  >
                    <CategoryIcon category={catId} className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold leading-tight">
                    {meta.shortThai}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick-Tag Selector (Lane + Heading) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {LANE_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setLaneTag(tag)}
                className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold border transition ${
                  laneTag === tag
                    ? 'bg-sky-500 text-white border-sky-500'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                {tag}
              </button>
            ))}
            <span className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" aria-hidden="true" />
            {HEADING_TAGS.map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => setHeading(dir)}
                className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold border transition ${
                  heading === dir
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                {dir}
              </button>
            ))}
          </div>

          {/* Optional Short Note + Voice-to-Text */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม (เช่น หน้าป้ายรถเมล์ / 2 เลนซ้าย)"
              aria-label="รายละเอียดเพิ่มเติม"
              className="flex-1 min-h-[46px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={handleVoiceSimulate}
              aria-label="พิมพ์ด้วยเสียง (จำลอง)"
              className={`w-12 h-12 shrink-0 rounded-xl border flex items-center justify-center transition active:scale-95 ${
                isListeningVoice
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              {isListeningVoice ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>

          {/* Primary Instant Submit Button */}
          <button
            type="submit"
            className="w-full min-h-[52px] rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25 active:scale-[0.98] transition"
          >
            <Send className="w-4 h-4" />
            <span>ปักหมุดแจ้งเหตุทันที</span>
          </button>
        </form>
      </div>
    </div>
  );
}

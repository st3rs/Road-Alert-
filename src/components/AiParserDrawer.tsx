import React, { useMemo, useState } from 'react';
import { FileInput, Sparkles, X } from 'lucide-react';
import { CATEGORY_META } from '../data/bangkokSeedData';
import { ParsedReportCandidate } from '../types';
import { parseThaiTrafficReports } from '../utils/spatial';
import { CategoryIcon } from './CategoryIcon';

interface AiParserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPins: (candidates: ParsedReportCandidate[]) => void;
}

const DEFAULT_SAMPLE_REPORTS = [
  '01.43 น. ก่อนถึง เดอะเซ็นซิป ผ่านด่านสังเกตการณ์',
  '23.55 น. รัชดา ปิดตลาดรถไฟ น้ำท่วมขัง',
  '08.15 น. แยกอโศก รถชนกัน 2 คัน กีดขวางเลนขวา ขาเข้า',
].join('\n');

export function AiParserDrawer({
  isOpen,
  onClose,
  onImportPins,
}: AiParserDrawerProps) {
  const [rawText, setRawText] = useState(DEFAULT_SAMPLE_REPORTS);

  const previewCandidates = useMemo(() => parseThaiTrafficReports(rawText), [rawText]);

  if (!isOpen) return null;

  const handleImport = () => {
    if (previewCandidates.length === 0) return;
    onImportPins(previewCandidates);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-parser-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] max-h-[85dvh] flex flex-col animate-sheet-in rounded-t-3xl bg-white dark:bg-[#0F172A] border-t border-slate-200 dark:border-slate-700 shadow-2xl p-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 shrink-0" />

        <div className="flex items-start justify-between gap-2 mb-3 shrink-0">
          <div>
            <h2
              id="ai-parser-title"
              className="text-lg font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2"
            >
              <FileInput className="w-5 h-5 text-sky-500" />
              <span>นำเข้าข้อความจราจร (AI Parser)</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              วางรายงานจากกลุ่มไลน์ / จส.100 เพื่อแยกถนน ประเภทเหตุ และทิศทางเป็นหมุดทันที
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างนำเข้าข้อความ"
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 block">
          ข้อความรายงานดิบ (1 บรรทัด = 1 เหตุการณ์)
        </label>
        <textarea
          rows={4}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="เช่น 01.43 น. ก่อนถึง เดอะเซ็นซิป ผ่านด่านสังเกตการณ์"
          className="w-full rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-xs leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 shrink-0"
        />

        <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
          <span>ตรวจพบพิกัดพร้อมปักหมุด ({previewCandidates.length} รายการ)</span>
          <button
            type="button"
            onClick={() => setRawText(DEFAULT_SAMPLE_REPORTS)}
            className="text-sky-600 dark:text-sky-400 hover:underline font-semibold"
          >
            ใช้ตัวอย่างเริ่มต้น
          </button>
        </div>

        <div className="mt-2 flex-1 overflow-y-auto space-y-2 pr-0.5">
          {previewCandidates.map((item) => {
            const meta = CATEGORY_META[item.category];
            return (
              <div
                key={item.id}
                className="rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-2.5 flex items-center gap-2.5"
              >
                <div
                  className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0"
                  style={{ backgroundColor: meta.color }}
                >
                  <CategoryIcon category={item.category} className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                    <span>{meta.shortThai}</span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span className="truncate">{item.roadName}</span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span>{item.heading}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                    {item.landmark} {item.timeLabel ? `(${item.timeLabel})` : ''}
                  </p>
                </div>
                <span className="font-metric text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  {item.confidence}%
                </span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleImport}
          disabled={previewCandidates.length === 0}
          className="mt-3.5 w-full min-h-[50px] rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>แปลงเป็นหมุดบนแผนที่ ({previewCandidates.length})</span>
        </button>
      </div>
    </div>
  );
}

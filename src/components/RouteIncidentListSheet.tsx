import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Navigation, Route as RouteIcon, Share2, ShieldCheck } from 'lucide-react';
import { CATEGORY_META } from '../data/bangkokSeedData';
import { IncidentPin, OnRouteIncident, RouteOption } from '../types';
import { formatDistanceThai } from '../utils/spatial';
import { CategoryIcon } from './CategoryIcon';

interface RouteIncidentListSheetProps {
  activeRoute: RouteOption;
  useAlternate: boolean;
  onToggleAlternate: () => void;
  onStartDrive: () => void;
  onShareRoute: () => void;
  onRouteIncidents: OnRouteIncident[];
  onSelectPin: (pin: IncidentPin) => void;
}

export function RouteIncidentListSheet({
  activeRoute,
  useAlternate,
  onToggleAlternate,
  onStartDrive,
  onShareRoute,
  onRouteIncidents,
  onSelectPin,
}: RouteIncidentListSheetProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      data-testid="route-summary-sheet"
      className="absolute bottom-5 left-3 right-20 z-20 rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-[0_14px_28px_-6px_rgba(15,23,42,0.18)] overflow-hidden transition-all"
    >
      {/* Summary Header */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 text-left flex items-center gap-2 focus:outline-none"
          aria-expanded={expanded}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-metric text-lg font-extrabold text-slate-900 dark:text-slate-50">
                {activeRoute.durationMinutes} นาที
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-metric">
                · {activeRoute.distanceKm.toFixed(1)} กม.
              </span>
              {useAlternate && (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  · ทางเลี่ยง
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
              {activeRoute.avoidNote && useAlternate ? activeRoute.avoidNote : activeRoute.summary}
            </p>
          </div>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          )}
        </button>
      </div>

      {/* Ordered List of Upcoming On-Route Incidents */}
      {expanded && (
        <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {onRouteIncidents.length === 0 ? (
            <div className="px-3.5 py-3 flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span className="text-xs font-semibold">
                เส้นทางนี้ไม่มีจุดแจ้งเตือนหรือสิ่งกีดขวางในขณะนี้
              </span>
            </div>
          ) : (
            onRouteIncidents.map((item) => {
              const meta = CATEGORY_META[item.pin.category];
              return (
                <button
                  key={item.pin.id}
                  type="button"
                  onClick={() => onSelectPin(item.pin)}
                  className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition"
                >
                  <div
                    className="w-8 h-8 rounded-xl text-white flex items-center justify-center shrink-0"
                    style={{ backgroundColor: meta.color }}
                  >
                    <CategoryIcon category={item.pin.category} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-900 dark:text-slate-100">
                      <span className="truncate">{meta.shortThai}</span>
                      <span aria-hidden="true" className="text-slate-400">·</span>
                      <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">
                        {item.pin.heading}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                      {item.pin.landmark}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-metric text-xs font-bold text-sky-600 dark:text-sky-400">
                      {formatDistanceThai(item.distanceFromOriginMeters)}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-metric">
                      ยืนยัน {item.pin.confirmations}x
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="p-2.5 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleAlternate}
          className={`min-h-[44px] px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition active:scale-95 whitespace-nowrap ${
            useAlternate
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700'
          }`}
        >
          <RouteIcon className="w-4 h-4" />
          <span>{useAlternate ? 'กลับเส้นทางหลัก' : 'เลี่ยงเส้นทาง'}</span>
        </button>

        <button
          type="button"
          onClick={onShareRoute}
          aria-label="แชร์เส้นทาง"
          title="แชร์เส้นทางและจุดแจ้งเตือน"
          className="w-11 min-h-[44px] shrink-0 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition active:scale-95"
        >
          <Share2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onStartDrive}
          className="flex-1 min-h-[44px] px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 whitespace-nowrap"
        >
          <Navigation className="w-4 h-4" />
          <span>เริ่มนำทาง</span>
        </button>
      </div>
    </div>
  );
}

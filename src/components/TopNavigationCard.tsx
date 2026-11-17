import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  CheckCircle2,
  CornerUpRight,
  FileInput,
  Flag,
  Layers,
  MapPin,
  Moon,
  Navigation,
  Route as RouteIcon,
  Search,
  Share2,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { CATEGORY_META, ROUTE_PRESETS } from '../data/bangkokSeedData';
import {
  BangkokPlace,
  IncidentPin,
  MapEngineMode,
  OnRouteIncident,
  RouteOption,
  ThemeMode,
  TurnInstruction,
} from '../types';
import { formatDistanceThai, searchBangkokPlaces } from '../utils/spatial';
import { CategoryIcon } from './CategoryIcon';

interface TopNavigationCardProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  mapEngine: MapEngineMode;
  hasGoogleMapsKey: boolean;
  onToggleMapEngine: () => void;
  onOpenParser: () => void;
  onOpenShare: () => void;
  originText: string;
  destinationText: string;
  onChangeOriginText: (text: string) => void;
  onChangeDestinationText: (text: string) => void;
  onSelectOriginPlace: (place: BangkokPlace) => void;
  onSelectDestinationPlace: (place: BangkokPlace) => void;
  onSubmitCustomRoute: () => void;
  isGeocoding?: boolean;
  onSwapOriginDestination: () => void;
  onSelectPreset: (presetId: string) => void;
  onClearRoute: () => void;
  activePresetId: string | null;
  activeRoute: RouteOption | null;
  useAlternate: boolean;
  onToggleAlternate: () => void;
  onRouteIncidents: OnRouteIncident[];
  isDriving: boolean;
  currentTurn: TurnInstruction | null;
  distanceToTurnMeters: number;
  proximityAlert: { pin: IncidentPin; distanceMeters: number } | null;
  voiceMuted: boolean;
  onToggleVoiceMuted: () => void;
}

function TurnIcon({ maneuver }: { maneuver: TurnInstruction['maneuver'] }) {
  switch (maneuver) {
    case 'left':
      return <ArrowLeft className="w-8 h-8" strokeWidth={2.75} />;
    case 'right':
      return <ArrowRight className="w-8 h-8" strokeWidth={2.75} />;
    case 'slight-right':
      return <ArrowUpRight className="w-8 h-8" strokeWidth={2.75} />;
    case 'merge':
      return <CornerUpRight className="w-8 h-8" strokeWidth={2.75} />;
    case 'arrive':
      return <Flag className="w-8 h-8" strokeWidth={2.5} />;
    default:
      return <ArrowUp className="w-8 h-8" strokeWidth={2.75} />;
  }
}

export function TopNavigationCard({
  theme,
  onToggleTheme,
  mapEngine,
  hasGoogleMapsKey,
  onToggleMapEngine,
  onOpenParser,
  onOpenShare,
  originText,
  destinationText,
  onChangeOriginText,
  onChangeDestinationText,
  onSelectOriginPlace,
  onSelectDestinationPlace,
  onSubmitCustomRoute,
  isGeocoding = false,
  onSwapOriginDestination,
  onSelectPreset,
  onClearRoute,
  activePresetId,
  activeRoute,
  useAlternate,
  onToggleAlternate,
  onRouteIncidents,
  isDriving,
  currentTurn,
  distanceToTurnMeters,
  proximityAlert,
  voiceMuted,
  onToggleVoiceMuted,
}: TopNavigationCardProps) {
  const [focusedField, setFocusedField] = useState<'origin' | 'destination' | null>(null);

  const suggestions = useMemo(() => {
    if (!focusedField) return [];
    const query = focusedField === 'origin' ? originText : destinationText;
    return searchBangkokPlaces(query, 6);
  }, [focusedField, originText, destinationText]);
  if (isDriving && currentTurn) {
    const alertMeta = proximityAlert ? CATEGORY_META[proximityAlert.pin.category] : null;
    return (
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-col gap-2 pointer-events-none">
        {/* Turn-by-Turn Navigation Header Card */}
        <div
          data-testid="drive-turn-card"
          className="pointer-events-auto rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.18)] p-3.5 flex items-center gap-3.5"
        >
          <div className="w-14 h-14 shrink-0 rounded-xl bg-sky-500 dark:bg-sky-400 text-white dark:text-slate-950 flex items-center justify-center shadow-sm">
            <TurnIcon maneuver={currentTurn.maneuver} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-metric text-2xl font-extrabold text-slate-900 dark:text-slate-50 leading-none whitespace-nowrap shrink-0">
                {formatDistanceThai(distanceToTurnMeters)}
              </span>
              <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 truncate">
                {currentTurn.streetName}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">
              {currentTurn.instructionThai}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleVoiceMuted}
            aria-label={voiceMuted ? 'เปิดเสียงเตือนภาษาไทย' : 'ปิดเสียงเตือน'}
            className="w-11 h-11 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {voiceMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-sky-600 dark:text-sky-400" />}
          </button>
        </div>

        {/* 500m Proximity Voice + Visual Alert Banner */}
        {proximityAlert && alertMeta && (
          <div
            data-testid="proximity-alert-banner"
            className="pointer-events-auto animate-sheet-in rounded-2xl px-3.5 py-2.5 border-2 shadow-lg flex items-center gap-3"
            style={{
              backgroundColor: theme === 'dark' ? '#0F172A' : alertMeta.bgLight,
              borderColor: theme === 'dark' ? alertMeta.borderDark : alertMeta.borderLight,
              color: theme === 'dark' ? '#F8FAFC' : alertMeta.textLight,
            }}
          >
            <div
              className="w-10 h-10 shrink-0 rounded-xl text-white flex items-center justify-center"
              style={{ backgroundColor: alertMeta.color }}
            >
              <CategoryIcon category={proximityAlert.pin.category} className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                <span>อีก {formatDistanceThai(proximityAlert.distanceMeters)}</span>
                <span aria-hidden="true">·</span>
                <span>{alertMeta.shortThai}</span>
              </div>
              <p className="text-sm font-bold truncate">
                {proximityAlert.pin.landmark} ({proximityAlert.pin.heading})
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="absolute top-3 left-3 right-3 z-30 flex flex-col gap-2 pointer-events-none">
      {/* Compact Header Utility Row */}
      <div className="pointer-events-auto flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Navigation className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap">
            ทางดี
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenParser}
            className="min-h-[38px] px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs font-semibold flex items-center gap-1 whitespace-nowrap transition active:scale-95"
          >
            <FileInput className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>นำเข้าข้อความ</span>
          </button>

          <button
            type="button"
            onClick={onOpenShare}
            aria-label="แชร์เรดาร์จราจร"
            title="แชร์ลงโซเชียล"
            className="w-9 h-9 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-800/80 flex items-center justify-center transition active:scale-95"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {hasGoogleMapsKey && (
            <button
              type="button"
              onClick={onToggleMapEngine}
              aria-label="สลับโหมดแผนที่"
              className="min-h-[38px] px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center gap-1 whitespace-nowrap transition active:scale-95"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{mapEngine === 'google' ? 'Google' : 'Vector'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'light' ? 'สลับเป็นโหมดกลางคืน' : 'สลับเป็นโหมดกลางวัน'}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center transition active:scale-95"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Top Floating Origin / Destination Search Card */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setFocusedField(null);
          onSubmitCustomRoute();
        }}
        className="pointer-events-auto relative rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-[0_10px_20px_-5px_rgba(15,23,42,0.12)] p-3"
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus-within:border-sky-500 dark:focus-within:border-sky-400 rounded-xl px-2.5 py-1.5 transition">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
              <input
                type="text"
                aria-label="จุดรับ / ต้นทาง"
                placeholder="พิมพ์ต้นทาง (เช่น เซ็นทรัล ลาดพร้าว, ทองหล่อ)"
                value={originText}
                onFocus={() => setFocusedField('origin')}
                onBlur={() => setFocusedField((prev) => (prev === 'origin' ? null : prev))}
                onChange={(e) => {
                  onChangeOriginText(e.target.value);
                  setFocusedField('origin');
                }}
                className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none min-w-0"
              />
              {originText && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChangeOriginText('');
                    setFocusedField('origin');
                  }}
                  aria-label="ล้างช่องต้นทาง"
                  className="w-5 h-5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 flex items-center justify-center shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus-within:border-sky-500 dark:focus-within:border-sky-400 rounded-xl px-2.5 py-1.5 transition">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500 shrink-0" aria-hidden="true" />
              <input
                type="text"
                aria-label="จุดส่ง / ปลายทาง"
                placeholder="พิมพ์ปลายทาง (เช่น สุขุมวิท 50, สยาม, สีลม)"
                value={destinationText}
                onFocus={() => setFocusedField('destination')}
                onBlur={() => setFocusedField((prev) => (prev === 'destination' ? null : prev))}
                onChange={(e) => {
                  onChangeDestinationText(e.target.value);
                  setFocusedField('destination');
                }}
                className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none min-w-0"
              />
              {destinationText && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChangeDestinationText('');
                    setFocusedField('destination');
                  }}
                  aria-label="ล้างช่องปลายทาง"
                  className="w-5 h-5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 flex items-center justify-center shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onSwapOriginDestination}
                aria-label="สลับต้นทางและปลายทาง"
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition active:scale-95"
              >
                <ArrowDownUp className="w-4 h-4" />
              </button>
              {activeRoute && (
                <button
                  type="button"
                  onClick={onClearRoute}
                  aria-label="ล้างเส้นทาง"
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/60 text-slate-500 hover:text-red-600 dark:text-slate-400 flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isGeocoding || !originText.trim() || !destinationText.trim()}
              aria-label="ค้นหาเส้นทาง"
              className="h-9 px-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition active:scale-95 whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isGeocoding ? 'ค้นหา...' : 'เส้นทาง'}</span>
            </button>
          </div>
        </div>

        {/* Autocomplete Dropdown Suggestions */}
        {focusedField && suggestions.length > 0 && (
          <div
            role="listbox"
            aria-label={focusedField === 'origin' ? 'สถานที่แนะนำสำหรับต้นทาง' : 'สถานที่แนะนำสำหรับปลายทาง'}
            className="mt-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800"
          >
            {suggestions.map((place) => (
              <button
                key={`${focusedField}-${place.id}`}
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (focusedField === 'origin') {
                    onSelectOriginPlace(place);
                  } else {
                    onSelectDestinationPlace(place);
                  }
                  setFocusedField(null);
                }}
                className="w-full px-3 py-2 text-left hover:bg-sky-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {place.name}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                  {place.road}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Preset Quick-Select Route Chips */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {ROUTE_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id && activeRoute !== null;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setFocusedField(null);
                  onSelectPreset(preset.id);
                }}
                className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold whitespace-nowrap border transition active:scale-95 ${
                  isSelected
                    ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-sky-400'
                }`}
              >
                {preset.originName} → {preset.destinationName}
              </button>
            );
          })}
        </div>
      </form>

      {/* Floating Warning Banner when Route is Active */}
      {activeRoute && (
        <div
          data-testid="route-warning-banner"
          className={`pointer-events-auto rounded-2xl px-3 py-2 border shadow-md flex items-center justify-between gap-2 ${
            onRouteIncidents.length > 0
              ? 'bg-amber-50 dark:bg-[#1E293B] border-amber-300 dark:border-amber-500/60 text-amber-950 dark:text-amber-100'
              : 'bg-emerald-50 dark:bg-[#064E3B]/70 border-emerald-300 dark:border-emerald-500/60 text-emerald-950 dark:text-emerald-100'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {onRouteIncidents.length > 0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <span className="text-xs font-bold leading-snug">
              {onRouteIncidents.length > 0
                ? `พบ ${onRouteIncidents.length} จุดแจ้งเตือนบนเส้นทางของคุณ`
                : 'เส้นทางโล่ง ไม่พบจุดแจ้งเตือนบนเส้นทาง'}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleAlternate}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 border transition active:scale-95 flex items-center gap-1 ${
              useAlternate
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:border-emerald-500'
            }`}
          >
            <RouteIcon className="w-3.5 h-3.5" />
            <span>{useAlternate ? 'กำลังใช้ทางเลี่ยง' : 'เลี่ยงเส้นทาง'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

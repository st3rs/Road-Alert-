import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Camera,
  ShieldAlert,
  TrafficCone,
  Video,
  Waves,
} from 'lucide-react';
import { CATEGORY_META } from '../data/bangkokSeedData';
import { BmaTrafficCamera, IncidentCategory, IncidentPin } from '../types';

export function CategoryIcon({
  category,
  className = 'w-5 h-5',
}: {
  category: IncidentCategory;
  className?: string;
}) {
  switch (category) {
    case 'checkpoint':
      return <ShieldAlert className={className} strokeWidth={2.25} />;
    case 'accident':
      return <AlertOctagon className={className} strokeWidth={2.25} />;
    case 'traffic':
      return <TrafficCone className={className} strokeWidth={2.25} />;
    case 'flood':
      return <Waves className={className} strokeWidth={2.25} />;
    case 'hazard':
      return <AlertTriangle className={className} strokeWidth={2.25} />;
    case 'camera':
      return <Camera className={className} strokeWidth={2.25} />;
  }
}

interface TeardropPinProps {
  pin: IncidentPin;
  isSelected: boolean;
  isOnRoute: boolean;
  isDimmed: boolean;
  isCompact?: boolean;
  interactive?: boolean;
  onSelect: (pin: IncidentPin) => void;
}

export function TeardropPinMarker({
  pin,
  isSelected,
  isOnRoute,
  isDimmed,
  isCompact = false,
  interactive = true,
  onSelect,
}: TeardropPinProps) {
  const meta = CATEGORY_META[pin.category];
  const fillColor = pin.category === 'checkpoint' ? '#7C3AED' : meta.color;
  const ringColor = pin.category === 'checkpoint' ? '#DC2626' : meta.color;
  const headingArrow = pin.heading === 'ขาเข้า' ? '↙' : pin.heading === 'ขาออก' ? '↗' : '•';

  const sharedClassName = `group relative flex flex-col items-center select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-full transition-all duration-200 ${
    isDimmed
      ? 'opacity-25 scale-90 hover:opacity-75 z-10'
      : isSelected
        ? 'opacity-100 scale-115 z-30'
        : isOnRoute
          ? 'opacity-100 scale-105 z-25'
          : 'opacity-100 hover:scale-110 z-20'
  }`;

  const content = (
    <>
      {/* Pulsing highlight ring for active on-route pins or selected pin */}
      {(isOnRoute || isSelected) && !isDimmed && (
        <span
          aria-hidden="true"
          className="animate-pulse-ring absolute top-1 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full pointer-events-none"
          style={{
            backgroundColor: `${ringColor}33`,
            border: `2px solid ${ringColor}`,
          }}
        />
      )}

      {/* Confirmation Count Badge */}
      {!isCompact && (
        <span
          className={`-mb-1 relative z-10 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold leading-none shadow-sm border whitespace-nowrap font-metric ${
            isOnRoute || isSelected
              ? 'bg-slate-900 text-white border-white/80 dark:bg-white dark:text-slate-950'
              : 'bg-white/95 text-slate-900 border-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:border-slate-700'
          }`}
        >
          ยืนยัน {pin.confirmations}x
        </span>
      )}

      {/* Teardrop Marker Body */}
      <div className="relative flex items-center justify-center w-9 h-10 drop-shadow-[0_4px_8px_rgba(15,23,42,0.28)]">
        <svg
          viewBox="0 0 40 46"
          className="w-9 h-10 overflow-visible"
          aria-hidden="true"
        >
          {pin.category === 'checkpoint' && (
            <defs>
              <linearGradient id={`cp-grad-${pin.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#DC2626" />
                <stop offset="100%" stopColor="#7C3AED" />
              </linearGradient>
            </defs>
          )}
          <path
            d="M20 2C10.06 2 2 10.06 2 20c0 11.4 13.86 21.74 17.02 23.95a1.7 1.7 0 0 0 1.96 0C24.14 41.74 38 31.4 38 20 38 10.06 29.94 2 20 2Z"
            fill={pin.category === 'checkpoint' ? `url(#cp-grad-${pin.id})` : fillColor}
            stroke={isSelected ? '#0F172A' : '#FFFFFF'}
            strokeWidth={isSelected ? '3' : '2.2'}
          />
        </svg>
        <div className="absolute top-[6px] left-1/2 -translate-x-1/2 text-white pointer-events-none">
          <CategoryIcon category={pin.category} className="w-4 h-4" />
        </div>
        {/* Directional heading micro-pill */}
        <span
          aria-hidden="true"
          className="absolute -right-1 top-0 w-4 h-4 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 text-[9px] font-bold flex items-center justify-center shadow"
        >
          {headingArrow}
        </span>
      </div>
    </>
  );

  if (!interactive) {
    return <div className={sharedClassName}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(pin);
      }}
      aria-label={`${meta.shortThai} ${pin.landmark} ${pin.heading} ยืนยัน ${pin.confirmations} ครั้ง`}
      className={sharedClassName}
    >
      {content}
    </button>
  );
}

interface BmaCameraPinProps {
  camera: BmaTrafficCamera;
  isSelected: boolean;
  interactive?: boolean;
  onSelect: (camera: BmaTrafficCamera) => void;
}

export function BmaCameraPinMarker({
  camera,
  isSelected,
  interactive = true,
  onSelect,
}: BmaCameraPinProps) {
  const sharedClassName = `group relative flex items-center justify-center rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
    isSelected
      ? 'scale-125 z-40'
      : 'hover:scale-115 z-10'
  }`;

  const body = (
    <div
      className={`relative flex flex-col items-center justify-center w-7 h-7 rounded-lg border shadow-md transition-colors ${
        isSelected
          ? 'bg-indigo-600 text-white border-white ring-2 ring-indigo-400'
          : 'bg-indigo-600/95 hover:bg-indigo-700 text-white border-white/95 dark:border-slate-900'
      }`}
    >
      <Video className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />
      <span className="text-[7px] font-extrabold leading-none tracking-tight -mt-0.5">
        CCTV
      </span>
    </div>
  );

  if (!interactive) {
    return <div className={sharedClassName}>{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(camera);
      }}
      aria-label={`ดูกล้องจราจร ${camera.name} (${camera.code})`}
      className={sharedClassName}
    >
      {body}
    </button>
  );
}


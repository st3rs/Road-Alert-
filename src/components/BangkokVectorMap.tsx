import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flame, LocateFixed, Minus, Plus, Video } from 'lucide-react';
import {
  BANGKOK_LANDMARKS,
  BANGKOK_ROADS,
  BANGKOK_WATERWAYS,
  latLngToSvg,
  SVG_VIEWBOX,
} from '../data/bangkokSeedData';
import {
  BmaTrafficCamera,
  IncidentPin,
  LatLng,
  RouteOption,
  ThemeMode,
} from '../types';
import { computeRoadTrafficHeatmap, getTrafficHeatColor } from '../utils/spatial';
import { BmaCameraPinMarker, TeardropPinMarker } from './CategoryIcon';

interface BangkokVectorMapProps {
  pins: IncidentPin[];
  selectedPinId: string | null;
  onSelectPin: (pin: IncidentPin) => void;
  cameras: BmaTrafficCamera[];
  selectedCameraId: string | null;
  showCameras: boolean;
  onSelectCamera: (camera: BmaTrafficCamera) => void;
  onToggleCameras?: () => void;
  activeRoute: RouteOption | null;
  comparisonRoute: RouteOption | null;
  onRouteIds: Set<string>;
  vehiclePosition: LatLng;
  vehicleHeadingDeg: number;
  isDriving: boolean;
  theme: ThemeMode;
  onBackgroundClick?: () => void;
}

export function BangkokVectorMap({
  pins,
  selectedPinId,
  onSelectPin,
  cameras,
  selectedCameraId,
  showCameras,
  onSelectCamera,
  onToggleCameras,
  activeRoute,
  comparisonRoute,
  onRouteIds,
  vehiclePosition,
  vehicleHeadingDeg,
  isDriving,
  theme,
  onBackgroundClick,
}: BangkokVectorMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(0.96);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapTickMs, setHeatmapTickMs] = useState(() => Date.now());
  const dragStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
    moved: boolean;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    origPanX: 0,
    origPanY: 0,
    moved: false,
  });

  useEffect(() => {
    if (!showHeatmap) return;
    const timer = window.setInterval(() => {
      setHeatmapTickMs(Date.now());
    }, 4000);
    return () => window.clearInterval(timer);
  }, [showHeatmap]);

  const heatmapData = useMemo(
    () => computeRoadTrafficHeatmap(BANGKOK_ROADS, pins, heatmapTickMs),
    [pins, heatmapTickMs]
  );

  const isDark = theme === 'dark';

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragStateRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.dragging) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragStateRef.current.moved = true;
    }
    setPan({
      x: Math.max(-220, Math.min(220, dragStateRef.current.origPanX + dx)),
      y: Math.max(-260, Math.min(260, dragStateRef.current.origPanY + dy)),
    });
  };

  const handlePointerUp = () => {
    const moved = dragStateRef.current.moved;
    dragStateRef.current.dragging = false;
    if (!moved && onBackgroundClick) {
      onBackgroundClick();
    }
  };

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    setZoom((prev) => Math.max(0.85, Math.min(2.3, Number((prev + delta).toFixed(2)))));
  }, []);

  const recenter = () => {
    setZoom(0.96);
    setPan({ x: 0, y: 0 });
  };

  const routeSvgPath = useMemo(() => {
    if (!activeRoute || activeRoute.waypoints.length < 2) return '';
    return activeRoute.waypoints
      .map((pt, i) => {
        const { x, y } = latLngToSvg(pt);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [activeRoute]);

  const comparisonSvgPath = useMemo(() => {
    if (!comparisonRoute || comparisonRoute.waypoints.length < 2) return '';
    return comparisonRoute.waypoints
      .map((pt, i) => {
        const { x, y } = latLngToSvg(pt);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [comparisonRoute]);

  const vehicleSvg = useMemo(() => latLngToSvg(vehiclePosition), [vehiclePosition]);
  const originSvg = useMemo(
    () => (activeRoute ? latLngToSvg(activeRoute.waypoints[0]) : null),
    [activeRoute]
  );
  const destSvg = useMemo(
    () =>
      activeRoute
        ? latLngToSvg(activeRoute.waypoints[activeRoute.waypoints.length - 1])
        : null,
    [activeRoute]
  );

  const hasActiveRoute = Boolean(activeRoute);

  return (
    <div
      ref={containerRef}
      data-testid="bangkok-vector-map"
      data-heatmap-visible={showHeatmap ? 'true' : 'false'}
      data-congested-count={heatmapData.congestedCount}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      className={`relative w-full h-full overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing ${
        isDark ? 'bg-[#020617]' : 'bg-[#F1F5F9]'
      }`}
    >
      {/* Transformed Map Surface (exact 5:6 ratio matching 1000x1200 viewBox) */}
      <div
        className="absolute left-1/2 top-1/2 origin-center transition-transform duration-150 ease-out"
        style={{
          width: 750,
          height: 900,
          marginLeft: -375,
          marginTop: -450,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <svg
          viewBox={`0 0 ${SVG_VIEWBOX.width} ${SVG_VIEWBOX.height}`}
          preserveAspectRatio="none"
          className="w-full h-full block"
          aria-label="แผนที่การจราจรกรุงเทพมหานคร"
        >
          <defs>
            <pattern
              id="bkk-urban-grid"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke={isDark ? '#0F172A' : '#E2E8F0'}
                strokeWidth="1"
              />
            </pattern>
            <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="active-route-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDark ? '#38BDF8' : '#0EA5E9'} />
              <stop offset="100%" stopColor={isDark ? '#4EDEA3' : '#10B981'} />
            </linearGradient>
            <radialGradient id="heat-blob-severe" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.46" />
              <stop offset="45%" stopColor="#F97316" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="heat-blob-heavy" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F97316" stopOpacity="0.38" />
              <stop offset="55%" stopColor="#F59E0B" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Base City Canvas */}
          <rect
            width={SVG_VIEWBOX.width}
            height={SVG_VIEWBOX.height}
            fill={isDark ? '#0B1326' : '#F8FAFC'}
          />
          <rect
            width={SVG_VIEWBOX.width}
            height={SVG_VIEWBOX.height}
            fill="url(#bkk-urban-grid)"
          />

          {/* Urban District Parks (Chatuchak & Lumpini / Benjakitti) */}
          <ellipse
            cx="330"
            cy="145"
            rx="55"
            ry="42"
            fill={isDark ? '#0C2924' : '#DCFCE7'}
            opacity="0.85"
          />
          <rect
            x="230"
            y="845"
            width="85"
            height="68"
            rx="16"
            fill={isDark ? '#0C2924' : '#DCFCE7'}
            opacity="0.85"
          />
          <rect
            x="385"
            y="855"
            width="52"
            height="84"
            rx="14"
            fill={isDark ? '#0C2924' : '#DCFCE7'}
            opacity="0.8"
          />

          {/* Waterways: Khlong Saen Saep & Chao Phraya edge */}
          {BANGKOK_WATERWAYS.map((water, idx) => {
            const d = water
              .map((pt, i) => {
                const { x, y } = latLngToSvg(pt);
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
              })
              .join(' ');
            return (
              <path
                key={`water-${idx}`}
                d={d}
                fill="none"
                stroke={isDark ? '#0C4A6E' : '#BAE6FD'}
                strokeWidth={idx === 1 ? 38 : 11}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isDark ? 0.65 : 0.85}
              />
            );
          })}

          {/* Road Casing Layer */}
          {BANGKOK_ROADS.map((road) => {
            const d = road.points
              .map((pt, i) => {
                const { x, y } = latLngToSvg(pt);
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
              })
              .join(' ');
            const casingWidth =
              road.tier === 'expressway' ? 20 : road.tier === 'artery' ? 14 : 9;
            return (
              <path
                key={`casing-${road.id}`}
                d={d}
                fill="none"
                stroke={isDark ? '#1E293B' : '#CBD5E1'}
                strokeWidth={casingWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Road Fill Layer */}
          {BANGKOK_ROADS.map((road) => {
            const d = road.points
              .map((pt, i) => {
                const { x, y } = latLngToSvg(pt);
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
              })
              .join(' ');
            const innerWidth =
              road.tier === 'expressway' ? 13 : road.tier === 'artery' ? 9.5 : 6;
            const strokeColor =
              road.tier === 'expressway'
                ? isDark
                  ? '#334155'
                  : '#FEF3C7'
                : isDark
                  ? '#283548'
                  : '#FFFFFF';
            return (
              <g key={`road-${road.id}`}>
                <path
                  d={d}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={innerWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {road.tier === 'expressway' && (
                  <path
                    d={d}
                    fill="none"
                    stroke={isDark ? '#64748B' : '#F59E0B'}
                    strokeWidth="1.5"
                    strokeDasharray="8 8"
                    opacity="0.7"
                  />
                )}
              </g>
            );
          })}

          {/* Real-Time Traffic Density Heatmap Layer (based on BANGKOK_ROADS historical + live pins) */}
          {showHeatmap && (
            <g data-testid="traffic-heatmap-layer" className="pointer-events-none">
              {/* Pass 1: Layered soft thermal halo along congested road corridors */}
              <g>
                {heatmapData.segments.map((seg) => {
                  if (seg.level === 'free') return null;
                  const a = latLngToSvg(seg.start);
                  const b = latLngToSvg(seg.end);
                  const heatColor = getTrafficHeatColor(seg.level, isDark);
                  const haloWidth =
                    seg.level === 'severe'
                      ? 28
                      : seg.level === 'heavy'
                        ? 22
                        : 16;
                  const haloOpacity =
                    seg.level === 'severe'
                      ? isDark
                        ? 0.28
                        : 0.22
                      : seg.level === 'heavy'
                        ? isDark
                          ? 0.22
                          : 0.18
                        : 0.14;
                  return (
                    <g key={`heat-halo-${seg.id}`}>
                      <line
                        x1={a.x.toFixed(1)}
                        y1={a.y.toFixed(1)}
                        x2={b.x.toFixed(1)}
                        y2={b.y.toFixed(1)}
                        stroke={heatColor.glow}
                        strokeWidth={haloWidth + 12}
                        strokeLinecap="round"
                        opacity={haloOpacity * 0.45}
                        className="transition-all duration-700"
                      />
                      <line
                        x1={a.x.toFixed(1)}
                        y1={a.y.toFixed(1)}
                        x2={b.x.toFixed(1)}
                        y2={b.y.toFixed(1)}
                        stroke={heatColor.glow}
                        strokeWidth={haloWidth}
                        strokeLinecap="round"
                        opacity={haloOpacity}
                        className="transition-all duration-700"
                      />
                    </g>
                  );
                })}
              </g>

              {/* Pass 2: Radial junction hotspots highlighting peak congestion zones */}
              <g>
                {heatmapData.hotspots.map((spot) => {
                  const pt = latLngToSvg(spot.position);
                  const radius = 34 + spot.density * 28;
                  return (
                    <circle
                      key={spot.id}
                      cx={pt.x.toFixed(1)}
                      cy={pt.y.toFixed(1)}
                      r={radius.toFixed(1)}
                      fill={
                        spot.level === 'severe'
                          ? 'url(#heat-blob-severe)'
                          : 'url(#heat-blob-heavy)'
                      }
                      className="transition-all duration-700"
                    />
                  );
                })}
              </g>

              {/* Pass 3: Crisp road-hugging traffic density ribbons */}
              <g>
                {heatmapData.segments.map((seg) => {
                  const a = latLngToSvg(seg.start);
                  const b = latLngToSvg(seg.end);
                  const heatColor = getTrafficHeatColor(seg.level, isDark);
                  const ribbonWidth =
                    seg.tier === 'expressway'
                      ? 10.5
                      : seg.tier === 'artery'
                        ? 7.5
                        : 5.2;
                  const ribbonOpacity =
                    seg.level === 'severe'
                      ? 0.9
                      : seg.level === 'heavy'
                        ? 0.82
                        : seg.level === 'moderate'
                          ? 0.7
                          : isDark
                            ? 0.4
                            : 0.48;
                  return (
                    <line
                      key={`heat-core-${seg.id}`}
                      x1={a.x.toFixed(1)}
                      y1={a.y.toFixed(1)}
                      x2={b.x.toFixed(1)}
                      y2={b.y.toFixed(1)}
                      stroke={heatColor.stroke}
                      strokeWidth={ribbonWidth}
                      strokeLinecap="round"
                      opacity={ribbonOpacity}
                      className="transition-all duration-700"
                    />
                  );
                })}
              </g>
            </g>
          )}

          {/* Road Name Labels */}
          <g className="pointer-events-none">
            <text
              x="772"
              y="290"
              transform="rotate(-70 772 290)"
              fill={isDark ? '#94A3B8' : '#475569'}
              fontSize="14"
              fontWeight="600"
            >
              ถ.ประดิษฐ์มนูธรรม
            </text>
            <text
              x="472"
              y="465"
              transform="rotate(-86 472 465)"
              fill={isDark ? '#94A3B8' : '#475569'}
              fontSize="14"
              fontWeight="600"
            >
              ถ.รัชดาภิเษก
            </text>
            <text
              x="540"
              y="632"
              fill={isDark ? '#94A3B8' : '#475569'}
              fontSize="14"
              fontWeight="600"
            >
              ถ.พระราม 9
            </text>
            <text
              x="530"
              y="955"
              transform="rotate(-48 530 955)"
              fill={isDark ? '#94A3B8' : '#475569'}
              fontSize="14"
              fontWeight="600"
            >
              ถ.สุขุมวิท
            </text>
            <text
              x="560"
              y="185"
              transform="rotate(-24 560 185)"
              fill={isDark ? '#94A3B8' : '#475569'}
              fontSize="13"
              fontWeight="600"
            >
              ถ.ลาดพร้าว
            </text>
          </g>

          {/* Secondary Comparison Route (Dimmed Dashed) */}
          {comparisonSvgPath && (
            <path
              d={comparisonSvgPath}
              fill="none"
              stroke={isDark ? '#64748B' : '#94A3B8'}
              strokeWidth="6"
              strokeDasharray="10 8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.6"
            />
          )}

          {/* Active Route Polyline (Glowing Emerald/Sky-Blue) */}
          {routeSvgPath && (
            <g>
              <path
                d={routeSvgPath}
                fill="none"
                stroke={isDark ? '#0EA5E9' : '#0284C7'}
                strokeWidth="15"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.25"
                filter="url(#route-glow)"
              />
              <path
                d={routeSvgPath}
                fill="none"
                stroke="url(#active-route-grad)"
                strokeWidth="9.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={routeSvgPath}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeDasharray="10 14"
                strokeLinecap="round"
                opacity="0.75"
              />
            </g>
          )}

          {/* Landmark Labels */}
          {BANGKOK_LANDMARKS.map((lm) => {
            const { x, y } = latLngToSvg(lm.position);
            return (
              <g key={lm.id} className="pointer-events-none">
                <circle
                  cx={x}
                  cy={y}
                  r={lm.kind === 'hub' ? 4.5 : 3.5}
                  fill={isDark ? '#38BDF8' : '#0284C7'}
                  stroke={isDark ? '#0F172A' : '#FFFFFF'}
                  strokeWidth="1.5"
                />
                <rect
                  x={x + 7}
                  y={y - 11}
                  width={lm.label.length * 7.6 + 14}
                  height="21"
                  rx="6"
                  fill={isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)'}
                  stroke={isDark ? '#334155' : '#E2E8F0'}
                  strokeWidth="1"
                />
                <text
                  x={x + 14}
                  y={y + 3.5}
                  fill={isDark ? '#E2E8F0' : '#0F172A'}
                  fontSize="12"
                  fontWeight="600"
                >
                  {lm.label}
                </text>
              </g>
            );
          })}

          {/* Origin & Destination Markers */}
          {originSvg && (
            <g>
              <circle
                cx={originSvg.x}
                cy={originSvg.y}
                r="11"
                fill="#10B981"
                stroke="#FFFFFF"
                strokeWidth="3.5"
              />
              <circle cx={originSvg.x} cy={originSvg.y} r="4" fill="#FFFFFF" />
            </g>
          )}
          {destSvg && (
            <g>
              <circle
                cx={destSvg.x}
                cy={destSvg.y}
                r="12"
                fill="#EF4444"
                stroke="#FFFFFF"
                strokeWidth="3.5"
              />
              <rect
                x={destSvg.x - 4}
                y={destSvg.y - 4}
                width="8"
                height="8"
                rx="1.5"
                fill="#FFFFFF"
              />
            </g>
          )}
        </svg>

        {/* HTML Interactive Overlay Layer (Pins + Vehicle Marker) */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Simulated Vehicle Marker */}
          <div
            data-testid="vehicle-marker"
            className="absolute -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-150 ease-linear"
            style={{
              left: `${(vehicleSvg.x / SVG_VIEWBOX.width) * 100}%`,
              top: `${(vehicleSvg.y / SVG_VIEWBOX.height) * 100}%`,
            }}
          >
            <div className="relative flex items-center justify-center w-11 h-11">
              {isDriving && (
                <span className="animate-pulse-ring absolute inset-0 rounded-full bg-sky-500/35 border-2 border-sky-400" />
              )}
              <div
                className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border-2 border-sky-500 shadow-lg flex items-center justify-center"
                style={{ transform: `rotate(${vehicleHeadingDeg}deg)` }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="currentColor">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                </svg>
              </div>
            </div>
          </div>

          {/* BMA Traffic CCTV Camera Spots */}
          {showCameras &&
            cameras.map((cam) => {
              const pt = latLngToSvg(cam.position);
              const isSelected = selectedCameraId === cam.id;
              return (
                <div
                  key={cam.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto ${
                    isSelected ? 'z-30' : 'z-10'
                  }`}
                  style={{
                    left: `${(pt.x / SVG_VIEWBOX.width) * 100}%`,
                    top: `${(pt.y / SVG_VIEWBOX.height) * 100}%`,
                  }}
                >
                  <BmaCameraPinMarker
                    camera={cam}
                    isSelected={isSelected}
                    onSelect={onSelectCamera}
                  />
                </div>
              );
            })}

          {/* Incident Teardrop Pins */}
          {pins.map((pin) => {
            const pt = latLngToSvg(pin.position);
            const isOnRoute = hasActiveRoute && onRouteIds.has(pin.id);
            const isDimmed = hasActiveRoute && !onRouteIds.has(pin.id);
            const isSelected = selectedPinId === pin.id;
            return (
              <div
                key={pin.id}
                className={`absolute -translate-x-1/2 -translate-y-full pointer-events-auto ${
                  isSelected ? 'z-30' : 'z-20'
                }`}
                style={{
                  left: `${(pt.x / SVG_VIEWBOX.width) * 100}%`,
                  top: `${(pt.y / SVG_VIEWBOX.height) * 100}%`,
                }}
              >
                <TeardropPinMarker
                  pin={pin}
                  isSelected={isSelected}
                  isOnRoute={isOnRoute}
                  isDimmed={isDimmed}
                  onSelect={onSelectPin}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Compact Real-Time Traffic Heatmap Legend Pill (safe clearance below TopNavigationCard) */}
      {showHeatmap && (
        <div
          data-testid="traffic-heatmap-legend"
          className={`pointer-events-none absolute left-3 z-20 transition-all duration-200 ${
            isDriving
              ? 'top-[182px]'
              : hasActiveRoute
                ? 'top-[308px]'
                : 'top-[264px]'
          }`}
        >
          <div className="pointer-events-auto inline-flex flex-col gap-1 px-2.5 py-1.5 rounded-xl bg-white/92 dark:bg-[#0F172A]/92 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 shadow-md">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-800 dark:text-slate-100">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>คล่องตัว</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>ชะลอ</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span>หนาแน่น</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>ติดขัด</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 font-metric">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>
                หนาแน่น {heatmapData.congestedCount} ช่วง · เฉลี่ย {heatmapData.avgSpeedKmh} กม./ชม.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Map Heatmap Toggle, CCTV Toggle, Zoom & Recenter Controls */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5">
        {onToggleCameras && (
          <button
            type="button"
            onClick={onToggleCameras}
            aria-pressed={showCameras}
            aria-label="สลับจุดดูกล้อง BMA Traffic"
            title="จุดดูกล้องจราจร BMA Traffic"
            className={`w-11 h-11 rounded-xl border shadow-md flex flex-col items-center justify-center active:scale-95 transition ${
              showCameras
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500'
                : 'bg-white/95 dark:bg-slate-900/95 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Video className="w-4 h-4" />
            <span className="text-[9px] font-extrabold leading-none mt-0.5">กล้อง</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowHeatmap((v) => !v)}
          aria-pressed={showHeatmap}
          aria-label="สลับชั้นข้อมูลความหนาแน่นจราจร"
          title="ความหนาแน่นจราจร (Heatmap)"
          className={`w-11 h-11 rounded-xl border shadow-md flex flex-col items-center justify-center active:scale-95 transition ${
            showHeatmap
              ? 'bg-orange-600 hover:bg-orange-700 text-white border-orange-500'
              : 'bg-white/95 dark:bg-slate-900/95 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span className="text-[9px] font-extrabold leading-none mt-0.5">จราจร</span>
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.3, Number((z + 0.2).toFixed(2))))}
          aria-label="ขยายแผนที่"
          className="w-11 h-11 rounded-xl bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.85, Number((z - 0.2).toFixed(2))))}
          aria-label="ย่อแผนที่"
          className="w-11 h-11 rounded-xl bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={recenter}
          aria-label="กลับสู่จุดกึ่งกลางแผนที่"
          className="w-11 h-11 rounded-xl bg-white/95 dark:bg-slate-900/95 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition"
        >
          <LocateFixed className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

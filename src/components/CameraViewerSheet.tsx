import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Gauge,
  Globe,
  MapPin,
  Navigation,
  Search,
  Share2,
  Video,
  X,
} from 'lucide-react';
import {
  BANGKOK_ROADS,
  BMA_TRAFFIC_CAMERAS,
  CATEGORY_META,
} from '../data/bangkokSeedData';
import { BmaTrafficCamera, IncidentPin } from '../types';
import {
  filterBmaCameras,
  getAdjacentBmaCamera,
  getBmaCameraStatus,
} from '../utils/bmaCameras';

interface CameraViewerSheetProps {
  camera: BmaTrafficCamera | null;
  pins: IncidentPin[];
  onClose: () => void;
  onSelectCamera: (camera: BmaTrafficCamera) => void;
  onShareCamera: (camera: BmaTrafficCamera) => void;
  onNavigateToCamera: (camera: BmaTrafficCamera) => void;
}

export function CameraViewerSheet({
  camera,
  pins,
  onClose,
  onSelectCamera,
  onShareCamera,
  onNavigateToCamera,
}: CameraViewerSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmbeddedPortal, setShowEmbeddedPortal] = useState(false);

  const status = useMemo(() => {
    if (!camera) return null;
    return getBmaCameraStatus(camera, BANGKOK_ROADS, pins);
  }, [camera, pins]);

  const filteredCameras = useMemo(
    () => filterBmaCameras(BMA_TRAFFIC_CAMERAS, searchQuery),
    [searchQuery]
  );

  if (!camera || !status) return null;

  const prevCam = getAdjacentBmaCamera(BMA_TRAFFIC_CAMERAS, camera.id, -1);
  const nextCam = getAdjacentBmaCamera(BMA_TRAFFIC_CAMERAS, camera.id, 1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`จุดดูกล้องจราจร ${camera.name}`}
      data-testid="camera-viewer-sheet"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-white dark:bg-[#0F172A] border-t border-x border-slate-200 dark:border-slate-700 shadow-2xl p-4 pb-6 animate-sheet-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Video className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                <span>BMA Traffic CCTV</span>
                <span aria-hidden="true">·</span>
                <span className="font-metric">{camera.code}</span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-50 leading-snug truncate">
                {camera.name}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {camera.junction} · {camera.district}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onShareCamera(camera)}
              aria-label="แชร์จุดกล้องนี้"
              className="w-9 h-9 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-800/80 flex items-center justify-center active:scale-95 transition"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดหน้าต่างดูกล้อง"
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Camera Feed / Official BMA Traffic Portal Box */}
        <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 text-white shadow-inner">
          {/* Status Top Bar */}
          <div className="px-3 py-2 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-bold truncate">{camera.roadName}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 font-metric">
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-extrabold text-white"
                style={{ backgroundColor: status.accentColor }}
              >
                {status.levelLabelThai}
              </span>
              <span className="text-slate-300 font-bold inline-flex items-center gap-0.5">
                <Gauge className="w-3 h-3 text-sky-400" />
                ~{status.estimatedSpeedKmh} กม./ชม.
              </span>
            </div>
          </div>

          {showEmbeddedPortal ? (
            <div className="relative bg-slate-900">
              <iframe
                title={`BMA Traffic CCTV Portal — ${camera.name}`}
                src={camera.sourceUrl}
                className="w-full h-56 border-0 bg-white"
                referrerPolicy="no-referrer"
              />
              <div className="px-3 py-2 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-300">
                <span>
                  หากหน้าเว็บไม่แสดงผล (Mixed HTTP/HTTPS) ให้กดเปิดเว็บทางการด้านล่าง
                </span>
                <button
                  type="button"
                  onClick={() => setShowEmbeddedPortal(false)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold shrink-0"
                >
                  กลับโหมดสรุป
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/80">
              <div className="flex items-start gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-100">
                    มุมกล้อง: {camera.direction}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    เชื่อมต่อฐานข้อมูลจุดกล้องสำนักการจราจรและขนส่ง กรุงเทพมหานคร (bmatraffic.com)
                  </p>
                </div>
              </div>

              {/* Action links to official bmatraffic.com */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href={camera.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[42px] px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>ดูภาพสด BMA Traffic</span>
                </a>

                <button
                  type="button"
                  onClick={() => setShowEmbeddedPortal(true)}
                  className="min-h-[42px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  <span>โหลดหน้าเว็บในแอป</span>
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate">ลิงก์อ้างอิง: {camera.sourceUrl}</span>
                <a
                  href={camera.altPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:underline shrink-0 ml-2 font-semibold"
                >
                  ลิงก์สำรอง กทม. (HTTPS)
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Nearby Live Incidents around this camera */}
        <div className="mt-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 p-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>เหตุการณ์ใกล้จุดกล้อง (รัศมี 650 ม.)</span>
            </span>
            <span className="font-metric text-slate-500 dark:text-slate-400">
              {status.nearbyIncidents.length} จุด
            </span>
          </div>
          {status.nearbyIncidents.length === 0 ? (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1.5 font-medium">
              ยังไม่พบจุดสกัด อุบัติเหตุ หรือสิ่งกีดขวางรอบแยกนี้
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-1.5">
              {status.nearbyIncidents.slice(0, 3).map((item) => {
                const meta = CATEGORY_META[item.pin.category];
                return (
                  <div
                    key={item.pin.id}
                    className="flex items-center justify-between gap-2 text-[11px] bg-white dark:bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span className="font-bold text-slate-900 dark:text-slate-100 shrink-0">
                        {meta.shortThai}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300 truncate">
                        {item.pin.landmark}
                      </span>
                    </div>
                    <span className="font-metric text-sky-600 dark:text-sky-400 font-bold shrink-0">
                      {item.distanceMeters} ม.
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Camera Prev/Next & Route CTA */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => prevCam && onSelectCamera(prevCam)}
            aria-label="ดูกล้องก่อนหน้า"
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center shrink-0 transition active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateToCamera(camera)}
            className="flex-1 min-h-[40px] px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>นำทางไปจุดนี้</span>
          </button>

          <button
            type="button"
            onClick={() => nextCam && onSelectCamera(nextCam)}
            aria-label="ดูกล้องถัดไป"
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center shrink-0 transition active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* All 14 BMA CCTV Junction Directory */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              <span>เลือกจุดกล้อง BMA Traffic ({BMA_TRAFFIC_CAMERAS.length} จุด)</span>
            </span>
          </div>

          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาแยก/ถนน (เช่น อโศก, พระราม 9, ลาดพร้าว)"
              aria-label="ค้นหาจุดดูกล้อง BMA Traffic"
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {filteredCameras.map((cam) => {
              const active = cam.id === camera.id;
              return (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => onSelectCamera(cam)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 border transition ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cam.name.replace(/^กล้อง/, '')}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

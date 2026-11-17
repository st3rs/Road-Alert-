import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigation, Plus, Radio, Video } from 'lucide-react';
import {
  BANGKOK_PLACES,
  BANGKOK_ROADS,
  BMA_TRAFFIC_CAMERAS,
  CATEGORY_META,
  createSeedIncidents,
  ROUTE_PRESETS,
} from './data/bangkokSeedData';
import {
  BangkokPlace,
  BmaTrafficCamera,
  IncidentCategory,
  IncidentHeading,
  IncidentPin,
  LatLng,
  MapEngineMode,
  ParsedReportCandidate,
  RouteOption,
  ThemeMode,
} from './types';
import {
  buildCustomRoutePair,
  computePolylineLengthMeters,
  filterAndSortRouteIncidents,
  haversineDistanceMeters,
  interpolateAlongPolyline,
  pointToPolylineMetrics,
  resolvePlaceFromText,
} from './utils/spatial';
import { BangkokVectorMap } from './components/BangkokVectorMap';
import { GoogleMapsView } from './components/GoogleMapsView';
import { TopNavigationCard } from './components/TopNavigationCard';
import { RouteIncidentListSheet } from './components/RouteIncidentListSheet';
import { DriveModeBar } from './components/DriveModeBar';
import { ReportIncidentModal } from './components/ReportIncidentModal';
import { PinDetailSheet } from './components/PinDetailSheet';
import { AiParserDrawer } from './components/AiParserDrawer';
import { SocialShareSheet } from './components/SocialShareSheet';
import { CameraViewerSheet } from './components/CameraViewerSheet';
import {
  buildPinSharePayload,
  buildRadarSummarySharePayload,
  buildRouteSharePayload,
} from './utils/share';
import {
  buildCameraSharePayload,
  getBmaCameraStatus,
} from './utils/bmaCameras';

const FILTER_OPTIONS: Array<{ id: IncidentCategory | 'all'; label: string }> = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'checkpoint', label: 'ด่านตรวจ' },
  { id: 'accident', label: 'อุบัติเหตุ' },
  { id: 'flood', label: 'น้ำท่วม' },
  { id: 'traffic', label: 'รถติด' },
  { id: 'hazard', label: 'สิ่งกีดขวาง' },
  { id: 'camera', label: 'กล้อง' },
];

function speakThaiAlert(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 1.02;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore TTS failures in headless or restricted audio environments
  }
}

function findNearestRoadName(pos: LatLng): string {
  let bestRoad = 'ถ.พระราม 9';
  let bestDist = Infinity;
  for (const road of BANGKOK_ROADS) {
    const metrics = pointToPolylineMetrics(pos, road.points);
    if (metrics.distanceMeters < bestDist) {
      bestDist = metrics.distanceMeters;
      bestRoad = road.name;
    }
  }
  return bestRoad;
}

async function geocodeThaiPlace(query: string): Promise<BangkokPlace | null> {
  if (typeof window === 'undefined' || !window.google?.maps?.importLibrary) {
    return null;
  }
  try {
    const geocodingLib = (await window.google.maps.importLibrary(
      'geocoding'
    )) as google.maps.GeocodingLibrary;
    const geocoder = new geocodingLib.Geocoder();
    const res = await geocoder.geocode({
      address: `${query}, Bangkok, Thailand`,
      region: 'TH',
    });
    const first = res.results?.[0];
    if (!first?.geometry?.location) return null;
    const loc = first.geometry.location;
    return {
      id: `geo-${query}`,
      name: query,
      shortName: query,
      road: first.formatted_address?.split(',')[0] ?? 'กรุงเทพมหานคร',
      position: { lat: loc.lat(), lng: loc.lng() },
    };
  } catch {
    return null;
  }
}

export default function App() {
  const googleMapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
  const hasGoogleMapsKey = googleMapsApiKey.length > 0;

  const [theme, setTheme] = useState<ThemeMode>('light');
  const [mapEngine, setMapEngine] = useState<MapEngineMode>(
    hasGoogleMapsKey ? 'google' : 'vector'
  );
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const [pins, setPins] = useState<IncidentPin[]>(() => createSeedIncidents());
  const [categoryFilter, setCategoryFilter] = useState<IncidentCategory | 'all'>('all');
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [showCameras, setShowCameras] = useState<boolean>(true);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Origin / Destination & Routing State
  const [originText, setOriginText] = useState<string>(BANGKOK_PLACES[0].name);
  const [destinationText, setDestinationText] = useState<string>(BANGKOK_PLACES[1].name);
  const [originPlace, setOriginPlace] = useState<BangkokPlace>(BANGKOK_PLACES[0]);
  const [destinationPlace, setDestinationPlace] = useState<BangkokPlace>(BANGKOK_PLACES[1]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [routeEnabled, setRouteEnabled] = useState<boolean>(false);
  const [useAlternate, setUseAlternate] = useState<boolean>(false);

  // Drive Mode State
  const [isDriving, setIsDriving] = useState(false);
  const [driveProgress, setDriveProgress] = useState(0);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [resolvedRoutePaths, setResolvedRoutePaths] = useState<Record<string, LatLng[]>>({});
  const spokenAlertsRef = useRef<Set<string>>(new Set());

  const handleResolvedRoutePath = useCallback((routeId: string, path: LatLng[]) => {
    setResolvedRoutePaths((prev) => {
      if (prev[routeId]?.length === path.length) return prev;
      return { ...prev, [routeId]: path };
    });
  }, []);

  // Modals & Toasts
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isParserOpen, setIsParserOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<
    | { kind: 'pin'; pin: IncidentPin }
    | { kind: 'camera'; camera: BmaTrafficCamera }
    | { kind: 'route' }
    | { kind: 'radar' }
    | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // Listen to Google Maps quota exceeded event
  useEffect(() => {
    const handler = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  // Live TTL clock tick
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const activeRoutePair = useMemo(() => {
    if (!routeEnabled) return null;
    if (activePresetId) {
      const preset = ROUTE_PRESETS.find((p) => p.id === activePresetId);
      if (preset) {
        return { primary: preset.primary, alternate: preset.alternate };
      }
    }
    return buildCustomRoutePair(
      originPlace.shortName || originText.trim() || 'ต้นทาง',
      destinationPlace.shortName || destinationText.trim() || 'ปลายทาง',
      originPlace.position,
      destinationPlace.position
    );
  }, [routeEnabled, activePresetId, originPlace, destinationPlace, originText, destinationText]);

  const activeRoute: RouteOption | null = useMemo(() => {
    if (!activeRoutePair) return null;
    return useAlternate ? activeRoutePair.alternate : activeRoutePair.primary;
  }, [activeRoutePair, useAlternate]);

  const comparisonRoute: RouteOption | null = useMemo(() => {
    if (!activeRoutePair) return null;
    return useAlternate ? activeRoutePair.primary : activeRoutePair.alternate;
  }, [activeRoutePair, useAlternate]);

  // Visible pins (filtered by category only when not navigating, or all pins when route active)
  const displayedPins = useMemo(() => {
    if (routeEnabled || categoryFilter === 'all') return pins;
    return pins.filter((p) => p.category === categoryFilter);
  }, [pins, routeEnabled, categoryFilter]);

  const effectiveRouteWaypoints = useMemo(() => {
    if (!activeRoute) return [];
    if (mapEngine === 'google' && resolvedRoutePaths[activeRoute.id]?.length >= 2) {
      return resolvedRoutePaths[activeRoute.id];
    }
    return activeRoute.waypoints;
  }, [activeRoute, mapEngine, resolvedRoutePaths]);

  // Spatial Route Filtering (Point-to-Segment distance check)
  const { onRoute: onRouteIncidents, onRouteIds } = useMemo(() => {
    if (!activeRoute) {
      return { onRoute: [], onRouteIds: new Set<string>() };
    }
    return filterAndSortRouteIncidents(pins, effectiveRouteWaypoints, 380);
  }, [pins, activeRoute, effectiveRouteWaypoints]);

  // Vehicle interpolation along route
  const vehicleState = useMemo(() => {
    if (!activeRoute) {
      return {
        position: { lat: 13.7568, lng: 100.5653 },
        headingDeg: 25,
        traveledMeters: 0,
        totalMeters: 0,
      };
    }
    const progress = isDriving ? driveProgress : 0;
    return interpolateAlongPolyline(effectiveRouteWaypoints, progress);
  }, [activeRoute, effectiveRouteWaypoints, isDriving, driveProgress]);

  const detectedRoadName = useMemo(
    () => findNearestRoadName(vehicleState.position),
    [vehicleState.position]
  );

  // Current Turn & Remaining Distance in Drive Mode
  const { currentTurn, distanceToTurnMeters, remainingMeters, remainingMinutes } =
    useMemo(() => {
      if (!activeRoute) {
        return {
          currentTurn: null,
          distanceToTurnMeters: 0,
          remainingMeters: 0,
          remainingMinutes: 0,
        };
      }
      const totalPolyMeters = Math.max(
        1,
        computePolylineLengthMeters(effectiveRouteWaypoints)
      );
      const traveled = vehicleState.traveledMeters;
      const remMeters = Math.max(0, totalPolyMeters - traveled);
      const remMinutes =
        activeRoute.durationMinutes * (1 - Math.min(1, traveled / totalPolyMeters));

      const turns = activeRoute.turns;
      let nextTurn = turns[turns.length - 1] ?? null;
      let distToTurn = remMeters;

      for (let i = 0; i < turns.length; i++) {
        const scaledTurnDist =
          (turns[i].distanceFromStartMeters / Math.max(1, activeRoute.distanceKm * 1000)) *
          totalPolyMeters;
        if (scaledTurnDist >= traveled - 60) {
          nextTurn = turns[i];
          distToTurn = Math.max(20, scaledTurnDist - traveled);
          break;
        }
      }

      return {
        currentTurn: nextTurn,
        distanceToTurnMeters: distToTurn,
        remainingMeters: remMeters,
        remainingMinutes: remMinutes,
      };
    }, [activeRoute, effectiveRouteWaypoints, vehicleState]);

  // 500m Proximity Alert + Quick Driver Verification Prompt
  const { proximityAlert, promptPin, simulatedSpeedKmh } = useMemo(() => {
    if (!isDriving || !activeRoute) {
      return { proximityAlert: null, promptPin: null, simulatedSpeedKmh: 0 };
    }

    const totalPolyMeters = Math.max(
      1,
      computePolylineLengthMeters(effectiveRouteWaypoints)
    );
    const traveled = vehicleState.traveledMeters;

    let closestAhead: { pin: IncidentPin; distanceMeters: number } | null = null;
    let passedPromptPin: IncidentPin | null = null;

    for (const item of onRouteIncidents) {
      const delta = item.distanceFromOriginMeters - traveled;
      if (delta >= -150 && delta <= 650) {
        if (!closestAhead || Math.abs(delta) < closestAhead.distanceMeters) {
          closestAhead = { pin: item.pin, distanceMeters: Math.max(50, Math.round(Math.abs(delta))) };
        }
      }
      if (delta >= -450 && delta <= 350) {
        passedPromptPin = item.pin;
      }
    }

    // Dynamic speed slows slightly when near congestion or checkpoints
    const baseSpeed = useAlternate ? 72 : 54;
    const wave = Math.round(Math.sin((traveled / Math.max(1, totalPolyMeters)) * Math.PI * 6) * 7);
    const penalty = closestAhead ? 16 : 0;
    const speed = Math.max(24, baseSpeed + wave - penalty);

    return {
      proximityAlert: closestAhead,
      promptPin: passedPromptPin,
      simulatedSpeedKmh: speed,
    };
  }, [isDriving, activeRoute, effectiveRouteWaypoints, onRouteIncidents, vehicleState.traveledMeters, useAlternate]);

  // Trigger Thai TTS voice alert when entering 500m proximity of an incident
  useEffect(() => {
    if (!isDriving || voiceMuted || !proximityAlert) return;
    const key = `${activeRoute?.id ?? 'r'}-${proximityAlert.pin.id}`;
    if (spokenAlertsRef.current.has(key)) return;
    spokenAlertsRef.current.add(key);

    const meta = CATEGORY_META[proximityAlert.pin.category];
    const distRounded = Math.max(100, Math.round(proximityAlert.distanceMeters / 100) * 100);
    speakThaiAlert(`อีก ${distRounded} เมตร ${meta.ttsAlert}`);
  }, [isDriving, voiceMuted, proximityAlert, activeRoute?.id]);

  // Drive Mode Animation Loop (~32s smooth trip simulation)
  useEffect(() => {
    if (!isDriving) return;
    const interval = window.setInterval(() => {
      setDriveProgress((prev) => {
        if (prev >= 1) {
          return 1;
        }
        return Math.min(1, prev + 0.003);
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [isDriving]);

  const findMatchingPresetId = (orig: BangkokPlace, dest: BangkokPlace): string | null => {
    const match = ROUTE_PRESETS.find(
      (p) =>
        (p.originName === orig.shortName || p.originName === orig.name) &&
        (p.destinationName === dest.shortName || p.destinationName === dest.name)
    );
    return match ? match.id : null;
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = ROUTE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const orig =
      BANGKOK_PLACES.find((p) => p.shortName === preset.originName) ?? {
        id: `preset-orig-${preset.id}`,
        name: preset.originName,
        shortName: preset.originName,
        road: 'กรุงเทพมหานคร',
        position: preset.origin,
      };
    const dest =
      BANGKOK_PLACES.find((p) => p.shortName === preset.destinationName) ?? {
        id: `preset-dest-${preset.id}`,
        name: preset.destinationName,
        shortName: preset.destinationName,
        road: 'กรุงเทพมหานคร',
        position: preset.destination,
      };
    setOriginText(orig.name);
    setDestinationText(dest.name);
    setOriginPlace(orig);
    setDestinationPlace(dest);
    setActivePresetId(preset.id);
    setRouteEnabled(true);
    setUseAlternate(false);
    setIsDriving(false);
    setDriveProgress(0);
    setSelectedPinId(null);
  };

  const handleSelectOriginPlace = (place: BangkokPlace) => {
    setOriginText(place.name);
    setOriginPlace(place);
    const resolvedDest = resolvePlaceFromText(destinationText) ?? destinationPlace;
    if (destinationText.trim()) {
      setDestinationPlace(resolvedDest);
      setActivePresetId(findMatchingPresetId(place, resolvedDest));
      setRouteEnabled(true);
    }
    setUseAlternate(false);
    setIsDriving(false);
    setDriveProgress(0);
  };

  const handleSelectDestinationPlace = (place: BangkokPlace) => {
    setDestinationText(place.name);
    setDestinationPlace(place);
    const resolvedOrig = resolvePlaceFromText(originText) ?? originPlace;
    if (originText.trim()) {
      setOriginPlace(resolvedOrig);
      setActivePresetId(findMatchingPresetId(resolvedOrig, place));
      setRouteEnabled(true);
    }
    setUseAlternate(false);
    setIsDriving(false);
    setDriveProgress(0);
  };

  const handleSubmitCustomRoute = async () => {
    const qOrig = originText.trim();
    const qDest = destinationText.trim();
    if (!qOrig || !qDest) {
      showToast('กรุณากรอกทั้งจุดรับ (ต้นทาง) และจุดส่ง (ปลายทาง)');
      return;
    }

    setIsGeocoding(true);
    try {
      let resolvedOrig = resolvePlaceFromText(qOrig);
      if (!resolvedOrig && mapEngine === 'google') {
        resolvedOrig = await geocodeThaiPlace(qOrig);
      }
      if (!resolvedOrig) {
        showToast(`ไม่พบพิกัดต้นทาง "${qOrig}" กรุณาเลือกจากรายการแนะนำ`);
        return;
      }

      let resolvedDest = resolvePlaceFromText(qDest);
      if (!resolvedDest && mapEngine === 'google') {
        resolvedDest = await geocodeThaiPlace(qDest);
      }
      if (!resolvedDest) {
        showToast(`ไม่พบพิกัดปลายทาง "${qDest}" กรุณาเลือกจากรายการแนะนำ`);
        return;
      }

      setOriginPlace(resolvedOrig);
      setDestinationPlace(resolvedDest);
      setActivePresetId(findMatchingPresetId(resolvedOrig, resolvedDest));
      setRouteEnabled(true);
      setUseAlternate(false);
      setIsDriving(false);
      setDriveProgress(0);
      setSelectedPinId(null);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSwapOriginDestination = () => {
    const nextOrigText = destinationText;
    const nextDestText = originText;
    const nextOrigPlace = destinationPlace;
    const nextDestPlace = originPlace;
    setOriginText(nextOrigText);
    setDestinationText(nextDestText);
    setOriginPlace(nextOrigPlace);
    setDestinationPlace(nextDestPlace);
    setActivePresetId(findMatchingPresetId(nextOrigPlace, nextDestPlace));
    if (nextOrigText.trim() && nextDestText.trim()) {
      setRouteEnabled(true);
    }
    setUseAlternate(false);
    setIsDriving(false);
    setDriveProgress(0);
  };

  const handleStartDrive = () => {
    if (!routeEnabled) {
      handleSelectPreset(ROUTE_PRESETS[0].id);
    }
    spokenAlertsRef.current.clear();
    setDriveProgress(0);
    setSelectedPinId(null);
    setIsDriving(true);
    if (!voiceMuted) {
      speakThaiAlert('เริ่มการนำทาง ขับขี่ปลอดภัยครับ');
    }
  };

  const handleStopDrive = () => {
    setIsDriving(false);
    setDriveProgress(0);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleConfirmPin = (pinId: string) => {
    setPins((prev) =>
      prev.map((p) =>
        p.id === pinId
          ? {
              ...p,
              confirmations: p.confirmations + 1,
              expiresAtMs: Math.max(p.expiresAtMs, Date.now()) + 30 * 60_000,
              trustScore: Math.min(99, p.trustScore + 1),
            }
          : p
      )
    );
    showToast('👍 ยืนยันเหตุการณ์แล้ว (+30 นาที)');
  };

  const handleClearPin = (pinId: string) => {
    let removedTitle: string | null = null;
    setPins((prev) =>
      prev.flatMap((p) => {
        if (p.id !== pinId) return [p];
        const nextClears = p.clearVotes + 1;
        if (nextClears >= 3) {
          removedTitle = p.landmark;
          return [];
        }
        return [
          {
            ...p,
            clearVotes: nextClears,
            trustScore: Math.max(25, p.trustScore - 18),
          },
        ];
      })
    );
    if (removedTitle) {
      setSelectedPinId(null);
      showToast(`✖️ ลบหมุด "${removedTitle}" ออกจากแผนที่แล้ว`);
    } else {
      showToast('บันทึกสถานะเคลียร์แล้ว (ครบ 3 ครั้งจะลบหมุดอัตโนมัติ)');
    }
  };

  const handleCreateReport = ({
    category,
    heading,
    laneTag,
    note,
  }: {
    category: IncidentCategory;
    heading: IncidentHeading;
    laneTag: string;
    note: string;
  }) => {
    const now = Date.now();
    const meta = CATEGORY_META[category];
    const newPin: IncidentPin = {
      id: `user-${now}`,
      category,
      title: `${meta.shortThai} · ${detectedRoadName}`,
      roadName: detectedRoadName,
      landmark: `${detectedRoadName} (${laneTag})`,
      description:
        note ||
        `${meta.labelThai} บริเวณ${detectedRoadName} ${heading} • ${laneTag}`,
      heading,
      laneTag,
      position: {
        lat: Number((vehicleState.position.lat + 0.0005).toFixed(5)),
        lng: Number((vehicleState.position.lng + 0.0004).toFixed(5)),
      },
      confirmations: 1,
      clearVotes: 0,
      trustScore: 95,
      createdAtMs: now,
      expiresAtMs: now + 90 * 60_000,
      reportedBy: 'คุณ (ผู้ขับขี่)',
      source: 'user',
    };
    setPins((prev) => [newPin, ...prev]);
    setIsReportOpen(false);
    setSelectedPinId(newPin.id);
    showToast(`📍 ปักหมุด "${meta.shortThai}" บน ${detectedRoadName} แล้ว`);
  };

  const handleImportParsedPins = (candidates: ParsedReportCandidate[]) => {
    const now = Date.now();
    const created: IncidentPin[] = candidates.map((c, idx) => ({
      id: `ai-${now}-${idx}`,
      category: c.category,
      title: `${CATEGORY_META[c.category].shortThai} · ${c.roadName}`,
      roadName: c.roadName,
      landmark: c.landmark,
      description: c.description,
      heading: c.heading,
      position: c.position,
      confirmations: 1,
      clearVotes: 0,
      trustScore: c.confidence,
      createdAtMs: now,
      expiresAtMs: now + 120 * 60_000,
      reportedBy: 'AI Parser (จส.100/ชุมชน)',
      source: 'ai-parser',
    }));
    setPins((prev) => [...created, ...prev]);
    if (created.length > 0) {
      setSelectedPinId(created[0].id);
    }
    showToast(`📥 นำเข้าและปักหมุด ${created.length} จุดลงแผนที่เรียบร้อย`);
  };

  const selectedPin = useMemo(
    () => pins.find((p) => p.id === selectedPinId) ?? null,
    [pins, selectedPinId]
  );

  const selectedCamera = useMemo(
    () => BMA_TRAFFIC_CAMERAS.find((c) => c.id === selectedCameraId) ?? null,
    [selectedCameraId]
  );

  const handleNavigateToCamera = useCallback(
    (camera: BmaTrafficCamera) => {
      const destPlace: BangkokPlace = {
        id: camera.id,
        name: camera.name,
        shortName: camera.junction,
        road: camera.roadName,
        position: camera.position,
      };
      setDestinationText(camera.name);
      setDestinationPlace(destPlace);
      setActivePresetId(null);
      setRouteEnabled(true);
      setUseAlternate(false);
      setIsDriving(false);
      setDriveProgress(0);
      setSelectedCameraId(null);
      setSelectedPinId(null);
      showToast(`🧭 ตั้งปลายทางไป ${camera.name} แล้ว`);
    },
    [showToast]
  );

  const sharePayload = useMemo(() => {
    if (!shareTarget) return null;
    if (shareTarget.kind === 'pin') {
      return buildPinSharePayload(shareTarget.pin, nowMs);
    }
    if (shareTarget.kind === 'camera') {
      return buildCameraSharePayload(
        shareTarget.camera,
        getBmaCameraStatus(shareTarget.camera, BANGKOK_ROADS, pins, nowMs)
      );
    }
    if (shareTarget.kind === 'route' && activeRoute) {
      return buildRouteSharePayload(activeRoute, onRouteIncidents);
    }
    return buildRadarSummarySharePayload(displayedPins);
  }, [shareTarget, nowMs, pins, activeRoute, onRouteIncidents, displayedPins]);

  // Fallback check if vehicle distance near pin triggers auto-focus
  const vehicleNearestDist = useMemo(() => {
    if (!activeRoute || !isDriving) return 0;
    return haversineDistanceMeters(
      vehicleState.position,
      activeRoute.waypoints[activeRoute.waypoints.length - 1]
    );
  }, [activeRoute, isDriving, vehicleState.position]);

  return (
    <div
      className={`min-h-[100dvh] w-full flex flex-col items-center justify-center transition-colors ${
        theme === 'dark' ? 'bg-slate-950' : 'bg-slate-200/80'
      }`}
    >
      {/* Required Google Maps Platform Demo Key Quota Banner */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm w-full">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Mobile-First App Viewport Container */}
      <main
        data-testid="mobile-app-shell"
        data-theme={theme}
        data-driving={isDriving ? 'true' : 'false'}
        data-remaining-dest-m={Math.round(vehicleNearestDist)}
        className="relative w-full max-w-[430px] mx-auto h-[100dvh] overflow-hidden bg-[#F8FAFC] dark:bg-[#020617] md:border-x md:border-slate-300 dark:md:border-slate-800 md:shadow-2xl"
      >
        {/* Map Layer (Google Maps Platform if API Key active, else Interactive Bangkok Vector Map) */}
        {mapEngine === 'google' && hasGoogleMapsKey ? (
          <GoogleMapsView
            apiKey={googleMapsApiKey}
            pins={displayedPins}
            selectedPinId={selectedPinId}
            onSelectPin={(pin) => {
              setSelectedCameraId(null);
              setSelectedPinId(pin.id);
            }}
            cameras={BMA_TRAFFIC_CAMERAS}
            selectedCameraId={selectedCameraId}
            showCameras={showCameras}
            onSelectCamera={(cam) => {
              setSelectedPinId(null);
              setSelectedCameraId(cam.id);
            }}
            activeRoute={activeRoute}
            onRouteIds={onRouteIds}
            vehiclePosition={vehicleState.position}
            vehicleHeadingDeg={vehicleState.headingDeg}
            isDriving={isDriving}
            theme={theme}
            onFallbackToVector={() => setMapEngine('vector')}
            onResolvedRoutePath={handleResolvedRoutePath}
          />
        ) : (
          <BangkokVectorMap
            pins={displayedPins}
            selectedPinId={selectedPinId}
            onSelectPin={(pin) => {
              setSelectedCameraId(null);
              setSelectedPinId(pin.id);
            }}
            cameras={BMA_TRAFFIC_CAMERAS}
            selectedCameraId={selectedCameraId}
            showCameras={showCameras}
            onSelectCamera={(cam) => {
              setSelectedPinId(null);
              setSelectedCameraId(cam.id);
            }}
            onToggleCameras={() => setShowCameras((v) => !v)}
            activeRoute={activeRoute}
            comparisonRoute={comparisonRoute}
            onRouteIds={onRouteIds}
            vehiclePosition={vehicleState.position}
            vehicleHeadingDeg={vehicleState.headingDeg}
            isDriving={isDriving}
            theme={theme}
            onBackgroundClick={() => {
              setSelectedPinId(null);
              setSelectedCameraId(null);
            }}
          />
        )}

        {/* Top Navigation & Search / Drive Header */}
        <TopNavigationCard
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          mapEngine={mapEngine}
          hasGoogleMapsKey={hasGoogleMapsKey}
          onToggleMapEngine={() =>
            setMapEngine((m) => (m === 'google' ? 'vector' : 'google'))
          }
          onOpenParser={() => setIsParserOpen(true)}
          onOpenShare={() =>
            setShareTarget(
              routeEnabled && activeRoute ? { kind: 'route' } : { kind: 'radar' }
            )
          }
          originText={originText}
          destinationText={destinationText}
          onChangeOriginText={(text) => {
            setOriginText(text);
            setActivePresetId(null);
          }}
          onChangeDestinationText={(text) => {
            setDestinationText(text);
            setActivePresetId(null);
          }}
          onSelectOriginPlace={handleSelectOriginPlace}
          onSelectDestinationPlace={handleSelectDestinationPlace}
          onSubmitCustomRoute={handleSubmitCustomRoute}
          isGeocoding={isGeocoding}
          onSwapOriginDestination={handleSwapOriginDestination}
          onSelectPreset={handleSelectPreset}
          onClearRoute={() => {
            setRouteEnabled(false);
            setActivePresetId(null);
            setIsDriving(false);
            setDriveProgress(0);
          }}
          activePresetId={activePresetId}
          activeRoute={activeRoute}
          useAlternate={useAlternate}
          onToggleAlternate={() => setUseAlternate((v) => !v)}
          onRouteIncidents={onRouteIncidents}
          isDriving={isDriving}
          currentTurn={currentTurn}
          distanceToTurnMeters={distanceToTurnMeters}
          proximityAlert={proximityAlert}
          voiceMuted={voiceMuted}
          onToggleVoiceMuted={() => setVoiceMuted((v) => !v)}
        />

        {/* Explore Mode Bottom Category Filters & Quick Start CTA (when no route & no detail sheet) */}
        {!routeEnabled && !selectedPin && !selectedCamera && !isDriving && (
          <div className="absolute bottom-5 left-3 right-20 z-20 flex flex-col gap-2 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {FILTER_OPTIONS.map((opt) => {
                const active = categoryFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCategoryFilter(opt.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border shadow-sm transition active:scale-95 ${
                      active
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white'
                        : 'bg-white/95 dark:bg-[#0F172A]/95 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="pointer-events-auto rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-lg px-3 py-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-slate-50">
                  <Radio className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate font-metric">หมุด {displayedPins.length} · กล้อง {BMA_TRAFFIC_CAMERAS.length}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  แตะจุด CCTV เพื่อดูภาพสด
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  data-testid="open-bma-cameras-btn"
                  onClick={() => {
                    setSelectedPinId(null);
                    setShowCameras(true);
                    setSelectedCameraId(BMA_TRAFFIC_CAMERAS[0].id);
                  }}
                  className="min-h-[40px] px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shrink-0 shadow-sm active:scale-95 transition whitespace-nowrap"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>กล้อง BMA</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(ROUTE_PRESETS[0].id)}
                  className="min-h-[40px] px-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1 shrink-0 shadow-sm active:scale-95 transition whitespace-nowrap"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>นำทาง</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Route Incident Summary Sheet */}
        {routeEnabled && activeRoute && !isDriving && !selectedPin && !selectedCamera && (
          <RouteIncidentListSheet
            activeRoute={activeRoute}
            useAlternate={useAlternate}
            onToggleAlternate={() => setUseAlternate((v) => !v)}
            onStartDrive={handleStartDrive}
            onShareRoute={() => setShareTarget({ kind: 'route' })}
            onRouteIncidents={onRouteIncidents}
            onSelectPin={(pin) => {
              setSelectedCameraId(null);
              setSelectedPinId(pin.id);
            }}
          />
        )}

        {/* Live Drive Mode Bottom HUD */}
        {isDriving && activeRoute && !selectedPin && !selectedCamera && (
          <DriveModeBar
            speedKmh={simulatedSpeedKmh}
            speedLimitKmh={currentTurn?.speedLimitKmh ?? 60}
            remainingMeters={remainingMeters}
            remainingMinutes={remainingMinutes}
            promptPin={promptPin}
            onConfirmPin={handleConfirmPin}
            onClearPin={handleClearPin}
            onStopDrive={handleStopDrive}
          />
        )}

        {/* Pin Detail & Crowd Verification Sheet */}
        {selectedPin && (
          <PinDetailSheet
            pin={selectedPin}
            nowMs={nowMs}
            onClose={() => setSelectedPinId(null)}
            onConfirm={handleConfirmPin}
            onClear={handleClearPin}
            onShare={(pin) => setShareTarget({ kind: 'pin', pin })}
          />
        )}

        {/* BMA Traffic CCTV Camera Viewer Sheet */}
        <CameraViewerSheet
          camera={selectedCamera}
          pins={pins}
          onClose={() => setSelectedCameraId(null)}
          onSelectCamera={(cam) => setSelectedCameraId(cam.id)}
          onShareCamera={(cam) => setShareTarget({ kind: 'camera', camera: cam })}
          onNavigateToCamera={handleNavigateToCamera}
        />

        {/* + แจ้งเหตุ Floating Orange CTA Button */}
        {!selectedPin && !selectedCamera && (
          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            aria-label="แจ้งเหตุ"
            className="absolute bottom-5 right-3 z-30 w-15 h-15 rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-[0_8px_20px_rgba(234,88,12,0.45)] border-2 border-white dark:border-slate-900 flex flex-col items-center justify-center active:scale-95 transition"
          >
            <Plus className="w-6 h-6" strokeWidth={3} />
            <span className="text-[10px] font-extrabold leading-none mt-0.5">แจ้งเหตุ</span>
          </button>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-2xl bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-950 text-xs font-bold shadow-xl whitespace-nowrap animate-sheet-in"
          >
            {toastMessage}
          </div>
        )}

        {/* 2-Tap Quick Incident Reporting Bottom Sheet */}
        <ReportIncidentModal
          isOpen={isReportOpen}
          currentPosition={vehicleState.position}
          detectedRoadName={detectedRoadName}
          defaultHeading="ขาออก"
          onClose={() => setIsReportOpen(false)}
          onSubmit={handleCreateReport}
        />

        {/* AI Text-to-Pin Parser Drawer */}
        <AiParserDrawer
          isOpen={isParserOpen}
          onClose={() => setIsParserOpen(false)}
          onImportPins={handleImportParsedPins}
        />

        {/* Social Share Bottom Sheet */}
        <SocialShareSheet
          isOpen={Boolean(sharePayload)}
          payload={sharePayload}
          onClose={() => setShareTarget(null)}
          onNotify={showToast}
        />
      </main>
    </div>
  );
}

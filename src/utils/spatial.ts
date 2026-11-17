import {
  BANGKOK_PLACES,
  BangkokRoadSegment,
  CATEGORY_META,
} from '../data/bangkokSeedData';
import {
  BangkokPlace,
  IncidentCategory,
  IncidentHeading,
  IncidentPin,
  LatLng,
  OnRouteIncident,
  ParsedReportCandidate,
  RouteOption,
  TrafficCongestionLevel,
  TrafficHeatmapData,
  TrafficHeatmapHotspot,
  TrafficHeatmapSegment,
  TurnInstruction,
} from '../types';

const EARTH_RADIUS_METERS = 6_371_000;
const DEG_TO_RAD = Math.PI / 180;
const BANGKOK_COS_LAT = Math.cos(13.75 * DEG_TO_RAD);

export function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const dLng = (b.lng - a.lng) * DEG_TO_RAD;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(a.lat * DEG_TO_RAD) * Math.cos(b.lat * DEG_TO_RAD) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Projects lat/lng to local flat meters relative to an origin around Bangkok
 * for accurate point-to-segment distance checks.
 */
function toLocalMeters(point: LatLng, refLat = 13.75): { x: number; y: number } {
  const cosLat = Math.cos(refLat * DEG_TO_RAD);
  return {
    x: point.lng * DEG_TO_RAD * EARTH_RADIUS_METERS * cosLat,
    y: point.lat * DEG_TO_RAD * EARTH_RADIUS_METERS,
  };
}

export function pointToSegmentDistanceMeters(
  point: LatLng,
  segStart: LatLng,
  segEnd: LatLng
): { distanceMeters: number; t: number } {
  const refLat = (segStart.lat + segEnd.lat) * 0.5;
  const p = toLocalMeters(point, refLat);
  const a = toLocalMeters(segStart, refLat);
  const b = toLocalMeters(segEnd, refLat);

  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const lenSq = abx * abx + aby * aby;

  if (lenSq <= 1e-6) {
    return {
      distanceMeters: Math.hypot(p.x - a.x, p.y - a.y),
      t: 0,
    };
  }

  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / lenSq));
  const closestX = a.x + t * abx;
  const closestY = a.y + t * aby;
  return {
    distanceMeters: Math.hypot(p.x - closestX, p.y - closestY),
    t,
  };
}

export function pointToPolylineMetrics(
  point: LatLng,
  polyline: LatLng[]
): { distanceMeters: number; distanceFromOriginMeters: number; totalLengthMeters: number } {
  if (polyline.length === 0) {
    return { distanceMeters: Infinity, distanceFromOriginMeters: 0, totalLengthMeters: 0 };
  }
  if (polyline.length === 1) {
    return {
      distanceMeters: haversineDistanceMeters(point, polyline[0]),
      distanceFromOriginMeters: 0,
      totalLengthMeters: 0,
    };
  }

  let minDistance = Infinity;
  let bestOriginOffset = 0;
  let accumulated = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const start = polyline[i];
    const end = polyline[i + 1];
    const segLength = haversineDistanceMeters(start, end);
    const { distanceMeters, t } = pointToSegmentDistanceMeters(point, start, end);
    if (distanceMeters < minDistance) {
      minDistance = distanceMeters;
      bestOriginOffset = accumulated + t * segLength;
    }
    accumulated += segLength;
  }

  return {
    distanceMeters: minDistance,
    distanceFromOriginMeters: bestOriginOffset,
    totalLengthMeters: accumulated,
  };
}

export function filterAndSortRouteIncidents(
  pins: IncidentPin[],
  waypoints: LatLng[],
  thresholdMeters = 360
): {
  onRoute: OnRouteIncident[];
  onRouteIds: Set<string>;
} {
  if (waypoints.length < 2) {
    return { onRoute: [], onRouteIds: new Set() };
  }

  const onRoute: OnRouteIncident[] = [];
  for (const pin of pins) {
    const metrics = pointToPolylineMetrics(pin.position, waypoints);
    if (metrics.distanceMeters <= thresholdMeters) {
      onRoute.push({
        pin,
        distanceFromRouteMeters: Math.round(metrics.distanceMeters),
        distanceFromOriginMeters: Math.round(metrics.distanceFromOriginMeters),
      });
    }
  }

  onRoute.sort((a, b) => a.distanceFromOriginMeters - b.distanceFromOriginMeters);
  return {
    onRoute,
    onRouteIds: new Set(onRoute.map((item) => item.pin.id)),
  };
}

export function computePolylineLengthMeters(polyline: LatLng[]): number {
  let total = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    total += haversineDistanceMeters(polyline[i], polyline[i + 1]);
  }
  return total;
}

export function interpolateAlongPolyline(
  polyline: LatLng[],
  progressFraction: number
): {
  position: LatLng;
  headingDeg: number;
  traveledMeters: number;
  totalMeters: number;
} {
  if (polyline.length === 0) {
    return {
      position: { lat: 13.7568, lng: 100.5653 },
      headingDeg: 0,
      traveledMeters: 0,
      totalMeters: 0,
    };
  }
  if (polyline.length === 1) {
    return {
      position: polyline[0],
      headingDeg: 0,
      traveledMeters: 0,
      totalMeters: 0,
    };
  }

  const clamped = Math.max(0, Math.min(1, progressFraction));
  const segLengths: number[] = [];
  let totalMeters = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const len = haversineDistanceMeters(polyline[i], polyline[i + 1]);
    segLengths.push(len);
    totalMeters += len;
  }

  const targetDist = clamped * totalMeters;
  let walked = 0;

  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (walked + segLen >= targetDist || i === segLengths.length - 1) {
      const ratio = segLen > 0 ? Math.max(0, Math.min(1, (targetDist - walked) / segLen)) : 0;
      const a = polyline[i];
      const b = polyline[i + 1];
      const position: LatLng = {
        lat: a.lat + (b.lat - a.lat) * ratio,
        lng: a.lng + (b.lng - a.lng) * ratio,
      };
      const dx = (b.lng - a.lng) * BANGKOK_COS_LAT;
      const dy = b.lat - a.lat;
      const headingDeg = (Math.atan2(dx, dy) * 180) / Math.PI;
      return {
        position,
        headingDeg: (headingDeg + 360) % 360,
        traveledMeters: targetDist,
        totalMeters,
      };
    }
    walked += segLen;
  }

  return {
    position: polyline[polyline.length - 1],
    headingDeg: 0,
    traveledMeters: totalMeters,
    totalMeters,
  };
}

export function formatCountdownThai(expiresAtMs: number, nowMs = Date.now()): string {
  const diffMs = expiresAtMs - nowMs;
  if (diffMs <= 0) return 'กำลังตรวจสอบสถานะล่าสุด';
  const totalMins = Math.max(1, Math.ceil(diffMs / 60_000));
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0 && mins > 0) {
    return `หมดอายุใน ${hours} ชม. ${mins} นาที`;
  }
  if (hours > 0) {
    return `หมดอายุใน ${hours} ชม.`;
  }
  return `หมดอายุใน ${mins} นาที`;
}

export function formatTimeAgoThai(createdAtMs: number, nowMs = Date.now()): string {
  const mins = Math.max(0, Math.floor((nowMs - createdAtMs) / 60_000));
  if (mins < 1) return 'เมื่อสักครู่';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  return `${hours} ชม. ที่แล้ว`;
}

export function formatDistanceThai(meters: number): string {
  if (meters < 1000) {
    return `${Math.max(50, Math.round(meters / 10) * 10)} ม.`;
  }
  return `${(meters / 1000).toFixed(1)} กม.`;
}

export function buildCustomRoutePair(
  originName: string,
  destinationName: string,
  origin: LatLng,
  destination: LatLng
): { primary: RouteOption; alternate: RouteOption } {
  const midDirect: LatLng = {
    lat: (origin.lat + destination.lat) * 0.5,
    lng: (origin.lng + destination.lng) * 0.5,
  };
  // Offset alternate slightly eastward/westward around central Bangkok arteries
  const dLat = destination.lat - origin.lat;
  const dLng = destination.lng - origin.lng;
  const perpLat = -dLng * 0.22;
  const perpLng = dLat * 0.22;
  const altMid: LatLng = {
    lat: midDirect.lat + perpLat,
    lng: midDirect.lng + perpLng,
  };

  const primaryWaypoints = [origin, midDirect, destination];
  const altWaypoints = [origin, altMid, destination];
  const primaryDistKm = Math.max(
    1.2,
    Number((computePolylineLengthMeters(primaryWaypoints) / 1000 * 1.18).toFixed(1))
  );
  const altDistKm = Number((primaryDistKm * 1.14).toFixed(1));

  const primaryTurns: TurnInstruction[] = [
    {
      id: 'ct-1',
      distanceFromStartMeters: 0,
      maneuver: 'straight',
      streetName: `ออกจาก ${originName}`,
      instructionThai: `มุ่งหน้าเส้นทางหลักสู่ ${destinationName}`,
      speedLimitKmh: 60,
      position: origin,
    },
    {
      id: 'ct-2',
      distanceFromStartMeters: Math.round(primaryDistKm * 500),
      maneuver: 'slight-right',
      streetName: 'ทางเชื่อมถนนสายหลัก',
      instructionThai: `ชิดขวาต่อเนื่องมุ่งหน้า ${destinationName}`,
      speedLimitKmh: 60,
      position: midDirect,
    },
    {
      id: 'ct-3',
      distanceFromStartMeters: Math.round(primaryDistKm * 1000),
      maneuver: 'arrive',
      streetName: destinationName,
      instructionThai: `ถึงจุดหมายปลายทาง ${destinationName}`,
      speedLimitKmh: 40,
      position: destination,
    },
  ];

  const altTurns: TurnInstruction[] = [
    {
      id: 'cta-1',
      distanceFromStartMeters: 0,
      maneuver: 'right',
      streetName: `ทางเลี่ยงจาก ${originName}`,
      instructionThai: `เบี่ยงใช้เส้นทางเลี่ยงจุดแจ้งเตือนมุ่งหน้า ${destinationName}`,
      speedLimitKmh: 70,
      position: origin,
    },
    {
      id: 'cta-2',
      distanceFromStartMeters: Math.round(altDistKm * 500),
      maneuver: 'left',
      streetName: 'ทางเลี่ยงสายรอง / ทางด่วน',
      instructionThai: `เลี้ยวซ้ายเข้าเส้นทางเลี่ยงสู่ ${destinationName}`,
      speedLimitKmh: 80,
      position: altMid,
    },
    {
      id: 'cta-3',
      distanceFromStartMeters: Math.round(altDistKm * 1000),
      maneuver: 'arrive',
      streetName: destinationName,
      instructionThai: `ถึงจุดหมายปลายทาง ${destinationName}`,
      speedLimitKmh: 40,
      position: destination,
    },
  ];

  return {
    primary: {
      id: `custom-primary-${originName}-${destinationName}`,
      label: `เส้นทางหลัก (${originName} → ${destinationName})`,
      isAlternate: false,
      summary: `เส้นทางตรงจาก ${originName} ไปยัง ${destinationName}`,
      durationMinutes: Math.max(10, Math.round(primaryDistKm * 2.7)),
      distanceKm: primaryDistKm,
      waypoints: primaryWaypoints,
      turns: primaryTurns,
    },
    alternate: {
      id: `custom-alt-${originName}-${destinationName}`,
      label: `ทางเลี่ยงแนะนำ (อ้อมจุดติดขัด)`,
      isAlternate: true,
      summary: `เส้นทางเลี่ยงจุดแจ้งเตือนจาก ${originName} ไปยัง ${destinationName}`,
      durationMinutes: Math.max(9, Math.round(altDistKm * 2.1)),
      distanceKm: altDistKm,
      avoidNote: 'เลือกแนวถนนเลี่ยงจุดแออัดและจุดสกัดบนเส้นทางหลัก',
      waypoints: altWaypoints,
      turns: altTurns,
    },
  };
}

interface LocationRule {
  keywords: string[];
  roadName: string;
  landmark: string;
  position: LatLng;
}

const THAI_LOCATION_RULES: LocationRule[] = [
  {
    keywords: ['เดอะเซ็นซิป', 'เซ็นซิป', 'ประดิษฐ์มนูธรรม', 'เลียบด่วน'],
    roadName: 'ถ.ประดิษฐ์มนูธรรม',
    landmark: 'ก่อนถึง เดอะเซ็นซิป ถ.ประดิษฐ์มนูธรรม',
    position: { lat: 13.8025, lng: 100.6145 },
  },
  {
    keywords: ['ตลาดรถไฟ', 'เอสพลานาด', 'รัชดา', 'รัชดาภิเษก'],
    roadName: 'ถ.รัชดาภิเษก',
    landmark: 'หน้าตลาดรถไฟ / เอสพลานาด รัชดาฯ',
    position: { lat: 13.7668, lng: 100.5735 },
  },
  {
    keywords: ['พระราม 9', 'พระราม9', 'อสมท'],
    roadName: 'ถ.พระราม 9',
    landmark: 'ใต้ทางด่วน / แยกพระราม 9',
    position: { lat: 13.7568, lng: 100.5653 },
  },
  {
    keywords: ['อโศก', 'เทอร์มินอล', 'terminal'],
    roadName: 'ถ.อโศกมนตรี – สุขุมวิท',
    landmark: 'แยกอโศก-สุขุมวิท',
    position: { lat: 13.738, lng: 100.5605 },
  },
  {
    keywords: ['เซ็นทรัล ลาดพร้าว', 'ลาดพร้าว', 'พหลโยธิน', 'ห้าแยกลาดพร้าว'],
    roadName: 'ถ.พหลโยธิน – ลาดพร้าว',
    landmark: 'หน้าเซ็นทรัล ลาดพร้าว',
    position: { lat: 13.8161, lng: 100.5612 },
  },
  {
    keywords: ['เอกมัย', 'ทองหล่อ', 'เพชรบุรี'],
    roadName: 'ถ.เอกมัย – เพชรบุรี',
    landmark: 'แยกเอกมัย-เพชรบุรี',
    position: { lat: 13.7435, lng: 100.5875 },
  },
  {
    keywords: ['สุขุมวิท 50', 'อ่อนนุช', 'สุขุมวิท50'],
    roadName: 'ถ.สุขุมวิท',
    landmark: 'ปากซอยสุขุมวิท 50 (อ่อนนุช)',
    position: { lat: 13.7065, lng: 100.6005 },
  },
  {
    keywords: ['สยาม', 'พารากอน', 'ราชประสงค์', 'ประตูน้ำ'],
    roadName: 'ถ.พระราม 1 – ราชดำริ',
    landmark: 'แยกประตูน้ำ – สยามพารากอน',
    position: { lat: 13.7485, lng: 100.5385 },
  },
  {
    keywords: ['ฉลองรัช', 'ทางด่วน'],
    roadName: 'ทางพิเศษฉลองรัช',
    landmark: 'ทางพิเศษฉลองรัช ช่วงลาดพร้าว',
    position: { lat: 13.789, lng: 100.6085 },
  },
  {
    keywords: ['อนุสาวรีย์', 'วิภาวดี', 'ดินแดง'],
    roadName: 'ถ.พหลโยธิน – ดินแดง',
    landmark: 'อนุสาวรีย์ชัยสมรภูมิ',
    position: { lat: 13.7649, lng: 100.5383 },
  },
];

function detectCategoryFromThaiText(text: string): IncidentCategory {
  if (/ด่าน|จุดสกัด|สังเกตการณ์|ตรวจวัด|แอลกอฮอล์|ตั้งด่าน|ตำรวจ/.test(text)) {
    return 'checkpoint';
  }
  if (/น้ำท่วม|ท่วมขัง|รอระบาย|น้ำขัง|ฝนหนัก/.test(text)) {
    return 'flood';
  }
  if (/ชน|อุบัติเหตุ|พลิกคว่ำ|เฉี่ยวชน|กู้ภัย/.test(text)) {
    return 'accident';
  }
  if (/กล้อง|จับความเร็ว/.test(text)) {
    return 'camera';
  }
  if (/จอดเสีย|รถเสีย|ยางแตก|น้ำมันรั่ว|ของตก|หล่น|กีดขวาง/.test(text)) {
    return 'hazard';
  }
  if (/ปิด|ติด|ทำทาง|ซ่อมถนน|ชะลอ|ท้ายแถว|ขบวน/.test(text)) {
    return 'traffic';
  }
  return 'traffic';
}

function detectHeadingFromThaiText(text: string): IncidentHeading {
  if (/ขาออก|มุ่งหน้ารามอินทรา|มุ่งหน้าอ่อนนุช|มุ่งหน้าบางนา/.test(text)) {
    return 'ขาออก';
  }
  if (/ขาเข้า|มุ่งหน้าอโศก|มุ่งหน้าสยาม|เข้าเมือง/.test(text)) {
    return 'ขาเข้า';
  }
  return 'ขาออก';
}

export function parseThaiTrafficReports(rawText: string): ParsedReportCandidate[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((line, index) => {
    const timeMatch = line.match(/(\d{1,2}[.:]\d{2}\s*น\.?)/);
    const timeLabel = timeMatch ? timeMatch[1] : undefined;
    const category = detectCategoryFromThaiText(line);
    const heading = detectHeadingFromThaiText(line);

    let matchedRule = THAI_LOCATION_RULES.find((rule) =>
      rule.keywords.some((kw) => line.toLowerCase().includes(kw.toLowerCase()))
    );

    if (!matchedRule) {
      const placeMatch = BANGKOK_PLACES.find((p) =>
        line.includes(p.shortName) || line.includes(p.name)
      );
      if (placeMatch) {
        matchedRule = {
          keywords: [placeMatch.shortName],
          roadName: placeMatch.road,
          landmark: placeMatch.name,
          position: placeMatch.position,
        };
      }
    }

    // Small deterministic jitter so multiple parsed pins at same corridor don't overlap 100%
    const jitterLat = ((index % 3) - 1) * 0.0014;
    const jitterLng = (((index + 1) % 3) - 1) * 0.0014;
    const basePos = matchedRule
      ? matchedRule.position
      : { lat: 13.7568, lng: 100.5653 };

    const categoryMeta = CATEGORY_META[category];
    const cleanBody = line.replace(/^(\d{1,2}[.:]\d{2}\s*น\.?)\s*/, '').trim();

    return {
      id: `parsed-${Date.now()}-${index}`,
      rawLine: line,
      timeLabel,
      category,
      heading,
      roadName: matchedRule ? matchedRule.roadName : 'ถ.พระราม 9 (พิกัดประมาณการ)',
      landmark: matchedRule ? matchedRule.landmark : 'พิกัดใจกลางกรุงเทพฯ',
      description: `${cleanBody || line} (${categoryMeta.shortThai})`,
      position: {
        lat: Number((basePos.lat + jitterLat).toFixed(5)),
        lng: Number((basePos.lng + jitterLng).toFixed(5)),
      },
      confidence: matchedRule ? 95 : 78,
    };
  });
}

function normalizeQuery(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Searches known Bangkok locations by name, shortName, road, or aliases.
 */
export function searchBangkokPlaces(query: string, limit = 6): BangkokPlace[] {
  const q = normalizeQuery(query);
  if (!q) {
    return BANGKOK_PLACES.slice(0, limit);
  }

  const scored: Array<{ place: BangkokPlace; score: number }> = [];
  for (const place of BANGKOK_PLACES) {
    const candidates = [
      place.name.toLowerCase(),
      place.shortName.toLowerCase(),
      place.road.toLowerCase(),
      ...(place.aliases ?? []).map((a) => a.toLowerCase()),
    ];

    let bestScore = 0;
    for (const field of candidates) {
      if (field === q) {
        bestScore = Math.max(bestScore, 100);
      } else if (field.startsWith(q)) {
        bestScore = Math.max(bestScore, 80);
      } else if (field.includes(q)) {
        bestScore = Math.max(bestScore, 60);
      } else if (q.length >= 2 && q.includes(field)) {
        bestScore = Math.max(bestScore, 45);
      }
    }

    if (bestScore > 0) {
      scored.push({ place, score: bestScore });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((item) => item.place);
}

/**
 * Resolves free-text user input (Thai/English landmark, alias, or "lat, lng") into a BangkokPlace.
 */
export function resolvePlaceFromText(query: string): BangkokPlace | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Support pasted coordinates e.g. "13.7563, 100.5018"
  const coordMatch = trimmed.match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
  if (coordMatch) {
    const lat = Number(coordMatch[1]);
    const lng = Number(coordMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= 5 && lat <= 21 && lng >= 97 && lng <= 106) {
      return {
        id: `coord-${lat}-${lng}`,
        name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        shortName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        road: 'พิกัดที่ระบุ',
        position: { lat, lng },
      };
    }
  }

  const matches = searchBangkokPlaces(trimmed, 1);
  if (matches.length > 0) {
    return matches[0];
  }

  const qLower = trimmed.toLowerCase();
  const rule = THAI_LOCATION_RULES.find((r) =>
    r.keywords.some((kw) => qLower.includes(kw.toLowerCase()))
  );
  if (rule) {
    return {
      id: `rule-${rule.roadName}`,
      name: trimmed,
      shortName: trimmed,
      road: rule.roadName,
      position: rule.position,
    };
  }

  return null;
}

const INCIDENT_CONGESTION_WEIGHT: Record<IncidentCategory, number> = {
  accident: 0.36,
  flood: 0.34,
  traffic: 0.3,
  hazard: 0.24,
  checkpoint: 0.22,
  camera: 0.06,
};

export function classifyTrafficCongestion(density: number): TrafficCongestionLevel {
  if (density >= 0.82) return 'severe';
  if (density >= 0.68) return 'heavy';
  if (density >= 0.45) return 'moderate';
  return 'free';
}

export function getTrafficHeatColor(
  level: TrafficCongestionLevel,
  isDark = false
): { stroke: string; glow: string; labelThai: string } {
  switch (level) {
    case 'severe':
      return {
        stroke: isDark ? '#F87171' : '#EF4444',
        glow: isDark ? '#EF4444' : '#DC2626',
        labelThai: 'ติดขัดมาก',
      };
    case 'heavy':
      return {
        stroke: isDark ? '#FB923C' : '#F97316',
        glow: isDark ? '#F97316' : '#EA580C',
        labelThai: 'หนาแน่น',
      };
    case 'moderate':
      return {
        stroke: isDark ? '#FBBF24' : '#F59E0B',
        glow: '#F59E0B',
        labelThai: 'ชะลอตัว',
      };
    default:
      return {
        stroke: isDark ? '#34D399' : '#10B981',
        glow: '#10B981',
        labelThai: 'คล่องตัว',
      };
  }
}

/**
 * Computes real-time traffic density across BANGKOK_ROADS segments by combining
 * historical corridor baselines, live incident pin proximity boosts, and a subtle
 * real-time harmonic traffic wave.
 */
export function computeRoadTrafficHeatmap(
  roads: BangkokRoadSegment[],
  pins: IncidentPin[],
  timestampMs = Date.now()
): TrafficHeatmapData {
  const segments: TrafficHeatmapSegment[] = [];
  const hotspotCandidates: TrafficHeatmapHotspot[] = [];

  roads.forEach((road, roadIdx) => {
    const pts = road.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const start = pts[i];
      const end = pts[i + 1];
      const midpoint: LatLng = {
        lat: (start.lat + end.lat) * 0.5,
        lng: (start.lng + end.lng) * 0.5,
      };
      const historicalDensity = Math.max(
        0.05,
        Math.min(1, road.historicalDensity[i] ?? 0.5)
      );

      let incidentBoost = 0;
      for (const pin of pins) {
        const { distanceMeters } = pointToSegmentDistanceMeters(
          pin.position,
          start,
          end
        );
        if (distanceMeters <= 550) {
          const proximityDecay = Math.max(0, 1 - distanceMeters / 550);
          const categoryWeight = INCIDENT_CONGESTION_WEIGHT[pin.category] ?? 0.2;
          const voteFactor = Math.max(
            0.4,
            Math.min(1.25, 0.8 + pin.confirmations * 0.025 - pin.clearVotes * 0.25)
          );
          incidentBoost += proximityDecay * categoryWeight * voteFactor;
        }
      }
      incidentBoost = Math.min(0.55, Number(incidentBoost.toFixed(3)));

      const liveWave =
        Math.sin(timestampMs / 8500 + roadIdx * 1.13 + i * 0.77) *
        0.045 *
        (road.peakCongestionBias || 1);

      const density = Number(
        Math.max(0.08, Math.min(1, historicalDensity + incidentBoost + liveWave)).toFixed(3)
      );
      const level = classifyTrafficCongestion(density);
      const estimatedSpeedKmh = Math.max(
        6,
        Math.round(road.historicalSpeedKmh * (1 - density * 0.78))
      );

      const segment: TrafficHeatmapSegment = {
        id: `${road.id}-seg-${i}`,
        roadId: road.id,
        roadName: road.name,
        tier: road.tier,
        start,
        end,
        midpoint,
        historicalDensity,
        incidentBoost,
        density,
        level,
        estimatedSpeedKmh,
      };
      segments.push(segment);

      if (density >= 0.7) {
        hotspotCandidates.push({
          id: `hs-${segment.id}`,
          roadName: road.name,
          position: midpoint,
          density,
          level,
        });
      }
    }
  });

  hotspotCandidates.sort((a, b) => b.density - a.density);
  const hotspots = hotspotCandidates.slice(0, 14);

  let congestedCount = 0;
  let severeCount = 0;
  let totalSpeed = 0;

  for (const seg of segments) {
    if (seg.level === 'heavy' || seg.level === 'severe') congestedCount++;
    if (seg.level === 'severe') severeCount++;
    totalSpeed += seg.estimatedSpeedKmh;
  }

  const avgSpeedKmh =
    segments.length > 0 ? Math.round(totalSpeed / segments.length) : 35;

  return {
    segments,
    hotspots,
    congestedCount,
    severeCount,
    avgSpeedKmh,
  };
}



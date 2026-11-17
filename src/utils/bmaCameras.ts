import {
  BANGKOK_ROADS,
  BangkokRoadSegment,
  CATEGORY_META,
} from '../data/bangkokSeedData';
import {
  BmaTrafficCamera,
  IncidentPin,
  TrafficCongestionLevel,
} from '../types';
import {
  computeRoadTrafficHeatmap,
  getTrafficHeatColor,
  haversineDistanceMeters,
  pointToSegmentDistanceMeters,
} from './spatial';
import { getSafeShareBaseUrl, ShareContextPayload } from './share';

export interface BmaCameraStatus {
  density: number;
  level: TrafficCongestionLevel;
  levelLabelThai: string;
  accentColor: string;
  estimatedSpeedKmh: number;
  nearbyIncidents: Array<{ pin: IncidentPin; distanceMeters: number }>;
}

export function getBmaCameraStatus(
  camera: BmaTrafficCamera,
  roads: BangkokRoadSegment[] = BANGKOK_ROADS,
  pins: IncidentPin[] = [],
  timestampMs = Date.now()
): BmaCameraStatus {
  const heatmap = computeRoadTrafficHeatmap(roads, pins, timestampMs);

  let bestSegment = heatmap.segments[0];
  let bestDist = Infinity;

  for (const seg of heatmap.segments) {
    const { distanceMeters } = pointToSegmentDistanceMeters(
      camera.position,
      seg.start,
      seg.end
    );
    if (distanceMeters < bestDist) {
      bestDist = distanceMeters;
      bestSegment = seg;
    }
  }

  const nearbyIncidents = pins
    .map((pin) => ({
      pin,
      distanceMeters: Math.round(
        haversineDistanceMeters(camera.position, pin.position)
      ),
    }))
    .filter((item) => item.distanceMeters <= 650)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  const level = bestSegment?.level ?? 'moderate';
  const heatColor = getTrafficHeatColor(level, false);

  return {
    density: bestSegment?.density ?? 0.5,
    level,
    levelLabelThai: heatColor.labelThai,
    accentColor: heatColor.stroke,
    estimatedSpeedKmh: bestSegment?.estimatedSpeedKmh ?? 28,
    nearbyIncidents,
  };
}

export function filterBmaCameras(
  cameras: BmaTrafficCamera[],
  query: string
): BmaTrafficCamera[] {
  const q = query.trim().toLowerCase();
  if (!q) return cameras;
  return cameras.filter((cam) =>
    [cam.name, cam.junction, cam.roadName, cam.district, cam.code]
      .join(' ')
      .toLowerCase()
      .includes(q)
  );
}

export function getAdjacentBmaCamera(
  cameras: BmaTrafficCamera[],
  currentId: string,
  offset: 1 | -1
): BmaTrafficCamera | null {
  if (cameras.length === 0) return null;
  const idx = cameras.findIndex((c) => c.id === currentId);
  if (idx === -1) return cameras[0];
  const nextIdx = (idx + offset + cameras.length) % cameras.length;
  return cameras[nextIdx];
}

export function buildCameraSharePayload(
  camera: BmaTrafficCamera,
  status: BmaCameraStatus,
  baseUrl = getSafeShareBaseUrl()
): ShareContextPayload {
  const shareUrl = `${baseUrl}#camera=${encodeURIComponent(camera.id)}`;
  const alertLine =
    status.nearbyIncidents.length > 0
      ? `⚠️ ใกล้จุดกล้องมี ${status.nearbyIncidents.length} เหตุการณ์ (${CATEGORY_META[status.nearbyIncidents[0].pin.category].shortThai} · ${status.nearbyIncidents[0].pin.landmark})`
      : '✅ บริเวณแยกนี้ยังไม่มีอุบัติเหตุหรือจุดสกัดรายงานเพิ่มเติม';

  const message = [
    `📹 จุดดูกล้องจราจร กทม. [${camera.code}] ${camera.name}`,
    `📍 ${camera.junction} (${camera.district})`,
    `🚦 สถานะจราจร: ${status.levelLabelThai} · ความเร็วเฉลี่ย ~${status.estimatedSpeedKmh} กม./ชม.`,
    alertLine,
    `🌐 ดูภาพกล้องสด BMA Traffic: ${camera.sourceUrl}`,
  ].join('\n');

  const hashtags = ['RoadDee', 'ทางดี', 'BMATraffic', 'กล้องจราจร'];

  return {
    kind: 'radar',
    badgeLabel: `${camera.code} · BMA CCTV`,
    accentColor: '#4F46E5',
    headline: camera.name,
    subheadline: `${camera.junction} · ${camera.roadName}`,
    metaLine: `สภาพจราจร: ${status.levelLabelThai} (~${status.estimatedSpeedKmh} กม./ชม.)`,
    message,
    shareUrl,
    lineShareUrl: `https://line.me/R/msg/text/?${encodeURIComponent(`${message}\n${shareUrl}`)}`,
    facebookShareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      shareUrl
    )}&quote=${encodeURIComponent(message)}`,
    xShareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      message
    )}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent(
      hashtags.join(',')
    )}`,
    hashtags,
  };
}

import { CATEGORY_META } from '../data/bangkokSeedData';
import { IncidentPin, OnRouteIncident, RouteOption } from '../types';
import {
  formatCountdownThai,
  formatDistanceThai,
  formatTimeAgoThai,
} from './spatial';

export interface ShareContextPayload {
  kind: 'pin' | 'route' | 'radar';
  badgeLabel: string;
  accentColor: string;
  headline: string;
  subheadline: string;
  metaLine: string;
  message: string;
  shareUrl: string;
  lineShareUrl: string;
  facebookShareUrl: string;
  xShareUrl: string;
  hashtags: string[];
}

const DEFAULT_APP_URL = 'https://roaddee.bangkok.app';

export function getSafeShareBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin + window.location.pathname;
  }
  return DEFAULT_APP_URL;
}

function buildSocialLinks(
  message: string,
  shareUrl: string,
  hashtags: string[]
): {
  lineShareUrl: string;
  facebookShareUrl: string;
  xShareUrl: string;
} {
  const combinedLineText = `${message}\n${shareUrl}`;
  const lineShareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(combinedLineText)}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}&quote=${encodeURIComponent(message)}`;
  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    message
  )}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent(
    hashtags.join(',')
  )}`;

  return { lineShareUrl, facebookShareUrl, xShareUrl };
}

export function buildPinSharePayload(
  pin: IncidentPin,
  nowMs = Date.now(),
  baseUrl = getSafeShareBaseUrl()
): ShareContextPayload {
  const meta = CATEGORY_META[pin.category];
  const lanePart = pin.laneTag ? ` · ${pin.laneTag}` : '';
  const timeAgo = formatTimeAgoThai(pin.createdAtMs, nowMs);
  const ttlText = formatCountdownThai(pin.expiresAtMs, nowMs);
  const shareUrl = `${baseUrl}#pin=${encodeURIComponent(pin.id)}`;

  const message = [
    `🚨 แจ้งเตือนจราจร [${meta.shortThai}]`,
    `📍 ${pin.landmark} (${pin.roadName})`,
    `🧭 ทิศทาง: ${pin.heading}${lanePart}`,
    `📝 ${pin.description}`,
    `✅ ยืนยันจากชุมชน ${pin.confirmations} คน (${pin.trustScore}%) · ${timeAgo}`,
    `📲 เช็กแผนที่สดบน Road Dee (ทางดี)`,
  ].join('\n');

  const hashtags = ['RoadDee', 'ทางดี', 'จราจรกรุงเทพ', 'JS100'];
  const links = buildSocialLinks(message, shareUrl, hashtags);

  return {
    kind: 'pin',
    badgeLabel: meta.labelThai,
    accentColor: meta.color,
    headline: pin.landmark,
    subheadline: `${pin.roadName} · ${pin.heading}${lanePart}`,
    metaLine: `ยืนยัน ${pin.confirmations}x · ความน่าเชื่อถือ ${pin.trustScore}% · ${ttlText}`,
    message,
    shareUrl,
    ...links,
    hashtags,
  };
}

export function buildRouteSharePayload(
  route: RouteOption,
  onRouteIncidents: OnRouteIncident[],
  baseUrl = getSafeShareBaseUrl()
): ShareContextPayload {
  const shareUrl = `${baseUrl}#route=${encodeURIComponent(route.id)}`;
  const topAlerts = onRouteIncidents
    .slice(0, 3)
    .map((item, idx) => {
      const m = CATEGORY_META[item.pin.category];
      return `${idx + 1}. [${m.shortThai}] ${item.pin.landmark} (${formatDistanceThai(
        item.distanceFromOriginMeters
      )})`;
    });

  const alertSummaryLine =
    onRouteIncidents.length > 0
      ? `⚠️ พบ ${onRouteIncidents.length} จุดแจ้งเตือนบนเส้นทาง:\n${topAlerts.join('\n')}`
      : '✅ เส้นทางนี้โล่ง ไม่มีจุดแจ้งเตือนหรือสิ่งกีดขวาง';

  const message = [
    `🗺️ แชร์เส้นทางเดินทาง: ${route.label}`,
    `⏱️ ประมาณ ${route.durationMinutes} นาที · ระยะทาง ${route.distanceKm.toFixed(1)} กม.`,
    alertSummaryLine,
    `📲 ดูเส้นทางเลี่ยงรถติดแบบเรียลไทม์บน Road Dee (ทางดี)`,
  ].join('\n');

  const hashtags = ['RoadDee', 'ทางดี', 'เส้นทางเลี่ยงรถติด', 'จราจร'];
  const links = buildSocialLinks(message, shareUrl, hashtags);

  return {
    kind: 'route',
    badgeLabel: route.isAlternate ? 'เส้นทางเลี่ยงแนะนำ' : 'สรุปเส้นทางเดินทาง',
    accentColor: route.isAlternate ? '#10B981' : '#0EA5E9',
    headline: route.label,
    subheadline: `${route.durationMinutes} นาที · ${route.distanceKm.toFixed(1)} กม. · ${route.summary}`,
    metaLine:
      onRouteIncidents.length > 0
        ? `พบ ${onRouteIncidents.length} จุดแจ้งเตือนบนเส้นทาง`
        : 'เส้นทางปลอดภัย ไม่พบจุดแจ้งเตือน',
    message,
    shareUrl,
    ...links,
    hashtags,
  };
}

export function buildRadarSummarySharePayload(
  pins: IncidentPin[],
  baseUrl = getSafeShareBaseUrl()
): ShareContextPayload {
  const topPins = [...pins]
    .sort((a, b) => b.confirmations - a.confirmations)
    .slice(0, 3);

  const lines = topPins.map((p, idx) => {
    const m = CATEGORY_META[p.category];
    return `${idx + 1}. [${m.shortThai}] ${p.landmark} (${p.heading}) · ยืนยัน ${p.confirmations}x`;
  });

  const message = [
    `📡 อัปเดตเรดาร์จราจรกรุงเทพฯ ล่าสุด (ทั้งหมด ${pins.length} จุด)`,
    ...lines,
    `📲 ตรวจสอบจุดสกัด น้ำท่วม และอุบัติเหตุสดๆ ที่ Road Dee (ทางดี)`,
  ].join('\n');

  const hashtags = ['RoadDee', 'ทางดี', 'เรดาร์จราจร', 'กรุงเทพ'];
  const links = buildSocialLinks(message, baseUrl, hashtags);

  return {
    kind: 'radar',
    badgeLabel: 'สรุปเรดาร์จราจรสด',
    accentColor: '#EA580C',
    headline: `จุดแจ้งเตือนใช้งานอยู่ ${pins.length} จุดในกรุงเทพฯ`,
    subheadline:
      topPins[0]
        ? `จุดเด่นล่าสุด: ${topPins[0].landmark} (${CATEGORY_META[topPins[0].category].shortThai})`
        : 'ตรวจสอบสภาพจราจรและเส้นทางแบบเรียลไทม์',
    metaLine: `อัปเดตจากชุมชนผู้ขับขี่ Road Dee · ${pins.length} เหตุการณ์`,
    message,
    shareUrl: baseUrl,
    ...links,
    hashtags,
  };
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const chars = Array.from(text);
  const lines: string[] = [];
  let current = '';

  for (const ch of chars) {
    if (ch === '\n') {
      lines.push(current);
      current = '';
      if (lines.length >= maxLines) break;
      continue;
    }
    const next = current + ch;
    if (ctx.measureText(next).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = ch;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

/**
 * Generates a crisp downloadable PNG card representing the traffic alert or route summary.
 */
export function renderShareCardDataUrl(payload: ShareContextPayload): string | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 840;
  canvas.height = 460;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 840, 460);
  bg.addColorStop(0, '#0F172A');
  bg.addColorStop(1, '#1E293B');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 840, 460);

  // Subtle accent glow
  ctx.fillStyle = payload.accentColor;
  ctx.globalAlpha = 0.16;
  ctx.beginPath();
  ctx.arc(740, 80, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Left accent bar
  ctx.fillStyle = payload.accentColor;
  ctx.fillRect(36, 40, 10, 380);

  // Brand header
  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 22px Prompt, Inter, sans-serif';
  ctx.fillText('ROAD DEE · ทางดี เรดาร์จราจร', 68, 72);

  // Category/Context badge pill
  ctx.fillStyle = payload.accentColor;
  ctx.beginPath();
  ctx.roundRect(68, 96, Math.min(420, payload.badgeLabel.length * 16 + 44), 40, 12);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px Prompt, Inter, sans-serif';
  ctx.fillText(payload.badgeLabel, 88, 123);

  // Headline
  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 34px Prompt, Inter, sans-serif';
  const titleLines = wrapCanvasText(ctx, payload.headline, 720, 2);
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, 68, 192 + idx * 44);
  });

  // Subheadline
  const subY = 192 + titleLines.length * 44 + 14;
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '500 22px Prompt, Inter, sans-serif';
  const subLines = wrapCanvasText(ctx, payload.subheadline, 720, 2);
  subLines.forEach((line, idx) => {
    ctx.fillText(line, 68, subY + idx * 32);
  });

  // Footer metadata & timestamp
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(68, 366);
  ctx.lineTo(790, 366);
  ctx.stroke();

  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 20px Prompt, Inter, sans-serif';
  ctx.fillText(payload.metaLine, 68, 406);

  return canvas.toDataURL('image/png');
}

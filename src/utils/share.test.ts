import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPinSharePayload,
  buildRadarSummarySharePayload,
  buildRouteSharePayload,
} from './share';
import { createSeedIncidents, ROUTE_PRESETS } from '../data/bangkokSeedData';
import { filterAndSortRouteIncidents } from './spatial';

test('buildPinSharePayload formats Thai commuter alert text and social URLs cleanly', () => {
  const fixedNow = 1_700_000_000_000;
  const pin = createSeedIncidents(fixedNow)[0]; // ด่านตรวจ · เดอะเซ็นซิป
  const payload = buildPinSharePayload(pin, fixedNow, 'https://roaddee.test');

  assert.equal(payload.kind, 'pin');
  assert.ok(payload.headline.includes('เดอะเซ็นซิป'));
  assert.ok(payload.message.includes('ด่านตรวจ'));
  assert.ok(payload.message.includes('ยืนยันจากชุมชน 16 คน'));
  assert.ok(payload.lineShareUrl.startsWith('https://line.me/R/msg/text/?'));
  assert.ok(payload.facebookShareUrl.startsWith('https://www.facebook.com/sharer/sharer.php?'));
  assert.ok(payload.xShareUrl.startsWith('https://twitter.com/intent/tweet?'));
  assert.ok(decodeURIComponent(payload.lineShareUrl).includes(pin.landmark));
});

test('buildRouteSharePayload includes route ETA, distance, and top on-route warnings', () => {
  const fixedNow = 1_700_000_000_000;
  const seed = createSeedIncidents(fixedNow);
  const route = ROUTE_PRESETS[0].primary;
  const { onRoute } = filterAndSortRouteIncidents(seed, route.waypoints);

  const payload = buildRouteSharePayload(route, onRoute, 'https://roaddee.test');

  assert.equal(payload.kind, 'route');
  assert.ok(payload.message.includes(route.label));
  assert.ok(payload.message.includes(`${route.durationMinutes} นาที`));
  assert.ok(payload.message.includes(`พบ ${onRoute.length} จุดแจ้งเตือนบนเส้นทาง`));
  assert.ok(payload.xShareUrl.includes('RoadDee'));
});

test('buildRadarSummarySharePayload summarizes active community alerts', () => {
  const seed = createSeedIncidents(1_700_000_000_000);
  const payload = buildRadarSummarySharePayload(seed, 'https://roaddee.test');

  assert.equal(payload.kind, 'radar');
  assert.ok(payload.headline.includes(`${seed.length} จุด`));
  assert.ok(payload.message.includes('เรดาร์จราจรกรุงเทพฯ'));
  assert.ok(payload.lineShareUrl.includes(encodeURIComponent('https://roaddee.test')));
});

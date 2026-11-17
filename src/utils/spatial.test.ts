import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCustomRoutePair,
  classifyTrafficCongestion,
  computeRoadTrafficHeatmap,
  filterAndSortRouteIncidents,
  formatCountdownThai,
  getTrafficHeatColor,
  haversineDistanceMeters,
  interpolateAlongPolyline,
  parseThaiTrafficReports,
  pointToSegmentDistanceMeters,
  resolvePlaceFromText,
  searchBangkokPlaces,
} from './spatial';
import {
  BANGKOK_ROADS,
  createSeedIncidents,
  ROUTE_PRESETS,
} from '../data/bangkokSeedData';

test('haversineDistanceMeters computes realistic Bangkok corridor distance', () => {
  const ladprao = { lat: 13.8161, lng: 100.5612 };
  const sukhumvit50 = { lat: 13.7055, lng: 100.601 };
  const dist = haversineDistanceMeters(ladprao, sukhumvit50);
  assert.ok(dist > 12_000 && dist < 14_500, `Expected ~13km, got ${dist}`);
});

test('pointToSegmentDistanceMeters returns ~0 for point lying on segment and accurate offset otherwise', () => {
  const a = { lat: 13.75, lng: 100.55 };
  const b = { lat: 13.75, lng: 100.57 };
  const onSeg = pointToSegmentDistanceMeters({ lat: 13.75, lng: 100.56 }, a, b);
  assert.ok(onSeg.distanceMeters < 1, `Expected <1m, got ${onSeg.distanceMeters}`);

  // 0.005 deg lat is ~555m north
  const offSeg = pointToSegmentDistanceMeters({ lat: 13.755, lng: 100.56 }, a, b);
  assert.ok(
    offSeg.distanceMeters > 500 && offSeg.distanceMeters < 610,
    `Expected ~555m, got ${offSeg.distanceMeters}`
  );
});

test('filterAndSortRouteIncidents filters primary vs alternate routes and sorts by origin distance', () => {
  const seed = createSeedIncidents(1_700_000_000_000);
  const preset = ROUTE_PRESETS[0]; // Ladprao -> Sukhumvit 50

  const primaryFiltered = filterAndSortRouteIncidents(seed, preset.primary.waypoints);
  const altFiltered = filterAndSortRouteIncidents(seed, preset.alternate.waypoints);

  assert.ok(primaryFiltered.onRoute.length >= 4, 'Primary route should catch ladprao, ratchada, rama9, asok, suk50 pins');
  assert.ok(primaryFiltered.onRouteIds.has('pin-3'), 'Primary route should include Asok flood');
  assert.ok(!altFiltered.onRouteIds.has('pin-3'), 'Alternate route should avoid Asok flood');
  assert.ok(!altFiltered.onRouteIds.has('pin-5'), 'Alternate route should avoid Ratchada construction');

  // Verify sorted ascending by distanceFromOriginMeters
  for (let i = 1; i < primaryFiltered.onRoute.length; i++) {
    assert.ok(
      primaryFiltered.onRoute[i].distanceFromOriginMeters >=
        primaryFiltered.onRoute[i - 1].distanceFromOriginMeters
    );
  }
});

test('interpolateAlongPolyline smoothly interpolates start, mid, and end positions', () => {
  const poly = [
    { lat: 13.8, lng: 100.56 },
    { lat: 13.75, lng: 100.56 },
  ];
  const start = interpolateAlongPolyline(poly, 0);
  const mid = interpolateAlongPolyline(poly, 0.5);
  const end = interpolateAlongPolyline(poly, 1);

  assert.equal(start.position.lat, 13.8);
  assert.ok(Math.abs(mid.position.lat - 13.775) < 1e-6);
  assert.equal(end.position.lat, 13.75);
  assert.ok(Math.abs(mid.headingDeg - 180) < 1, `Expected southbound ~180 deg, got ${mid.headingDeg}`);
});

test('formatCountdownThai formats hours and minutes cleanly', () => {
  const now = 1_700_000_000_000;
  assert.equal(formatCountdownThai(now + 105 * 60_000, now), 'หมดอายุใน 1 ชม. 45 นาที');
  assert.equal(formatCountdownThai(now + 30 * 60_000, now), 'หมดอายุใน 30 นาที');
  assert.equal(formatCountdownThai(now - 5000, now), 'กำลังตรวจสอบสถานะล่าสุด');
});

test('parseThaiTrafficReports accurately parses Thai JS100/community messages into pins', () => {
  const sample = [
    '01.43 น. ก่อนถึง เดอะเซ็นซิป ผ่านด่านสังเกตการณ์',
    '23.55 น. รัชดา ปิดตลาดรถไฟ น้ำท่วมขัง',
  ].join('\n');

  const parsed = parseThaiTrafficReports(sample);
  assert.equal(parsed.length, 2);

  assert.equal(parsed[0].category, 'checkpoint');
  assert.equal(parsed[0].roadName, 'ถ.ประดิษฐ์มนูธรรม');
  assert.equal(parsed[0].timeLabel, '01.43 น.');

  assert.equal(parsed[1].category, 'flood');
  assert.equal(parsed[1].roadName, 'ถ.รัชดาภิเษก');
  assert.equal(parsed[1].timeLabel, '23.55 น.');
});

test('buildCustomRoutePair builds distinct primary and alternate routes', () => {
  const pair = buildCustomRoutePair(
    'พระราม 9',
    'เอกมัย',
    { lat: 13.7568, lng: 100.5653 },
    { lat: 13.72, lng: 100.585 }
  );
  assert.ok(pair.primary.distanceKm > 0);
  assert.ok(pair.alternate.waypoints.length === 3);
  assert.notDeepEqual(pair.primary.waypoints[1], pair.alternate.waypoints[1]);
});

test('searchBangkokPlaces and resolvePlaceFromText resolve Thai aliases, English names, and coordinates', () => {
  const thonglorMatches = searchBangkokPlaces('ทองหล่อ');
  assert.ok(thonglorMatches.length >= 1);
  assert.equal(thonglorMatches[0].id, 'thonglor');

  const siam = resolvePlaceFromText('siam');
  assert.ok(siam);
  assert.equal(siam.id, 'siam-paragon');

  const coordPlace = resolvePlaceFromText('13.7563, 100.5018');
  assert.ok(coordPlace);
  assert.equal(coordPlace.position.lat, 13.7563);
  assert.equal(coordPlace.position.lng, 100.5018);

  assert.equal(resolvePlaceFromText(''), null);
});

test('computeRoadTrafficHeatmap builds segments for all BANGKOK_ROADS edges and boosts density near live incidents', () => {
  const expectedSegments = BANGKOK_ROADS.reduce(
    (sum, r) => sum + Math.max(0, r.points.length - 1),
    0
  );
  const fixedNow = 1_700_000_000_000;

  const baseline = computeRoadTrafficHeatmap(BANGKOK_ROADS, [], fixedNow);
  assert.equal(baseline.segments.length, expectedSegments);
  assert.ok(baseline.avgSpeedKmh >= 6 && baseline.avgSpeedKmh <= 90);

  for (const seg of baseline.segments) {
    assert.ok(seg.density >= 0.08 && seg.density <= 1, `Density out of bounds: ${seg.density}`);
    assert.equal(seg.incidentBoost, 0);
  }

  // Place a severe accident directly on Chalong Rat Expressway first segment (normally low density 0.34)
  const chalongStart = BANGKOK_ROADS[0].points[0];
  const chalongEnd = BANGKOK_ROADS[0].points[1];
  const accidentPin = {
    ...createSeedIncidents(fixedNow)[3],
    id: 'test-chalong-accident',
    category: 'accident' as const,
    confirmations: 15,
    clearVotes: 0,
    position: {
      lat: (chalongStart.lat + chalongEnd.lat) * 0.5,
      lng: (chalongStart.lng + chalongEnd.lng) * 0.5,
    },
  };

  const withIncident = computeRoadTrafficHeatmap(BANGKOK_ROADS, [accidentPin], fixedNow);
  const baseSeg = baseline.segments.find((s) => s.id === 'chalong-rat-exp-seg-0');
  const boostedSeg = withIncident.segments.find((s) => s.id === 'chalong-rat-exp-seg-0');

  assert.ok(baseSeg && boostedSeg);
  assert.ok(boostedSeg.incidentBoost > 0.25, `Expected live boost > 0.25, got ${boostedSeg.incidentBoost}`);
  assert.ok(
    boostedSeg.density > baseSeg.density + 0.2,
    `Expected boosted density (${boostedSeg.density}) > baseline (${baseSeg.density})`
  );
  assert.ok(boostedSeg.estimatedSpeedKmh < baseSeg.estimatedSpeedKmh);
});

test('classifyTrafficCongestion and getTrafficHeatColor map all congestion levels consistently', () => {
  assert.equal(classifyTrafficCongestion(0.25), 'free');
  assert.equal(classifyTrafficCongestion(0.55), 'moderate');
  assert.equal(classifyTrafficCongestion(0.75), 'heavy');
  assert.equal(classifyTrafficCongestion(0.9), 'severe');

  assert.equal(getTrafficHeatColor('severe', false).labelThai, 'ติดขัดมาก');
  assert.equal(getTrafficHeatColor('free', true).stroke, '#34D399');
});



import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BMA_TRAFFIC_CAMERAS,
  BANGKOK_ROADS,
  createSeedIncidents,
} from '../data/bangkokSeedData';
import {
  buildCameraSharePayload,
  filterBmaCameras,
  getAdjacentBmaCamera,
  getBmaCameraStatus,
} from './bmaCameras';

test('BMA_TRAFFIC_CAMERAS contains valid Bangkok coordinates and bmatraffic.com source URLs', () => {
  assert.ok(BMA_TRAFFIC_CAMERAS.length >= 12);
  for (const cam of BMA_TRAFFIC_CAMERAS) {
    assert.ok(cam.position.lat > 13.65 && cam.position.lat < 13.9);
    assert.ok(cam.position.lng > 100.45 && cam.position.lng < 100.7);
    assert.equal(cam.sourceUrl, 'http://www.bmatraffic.com/index.aspx');
  }
});

test('getBmaCameraStatus computes local congestion level and nearby community incidents', () => {
  const fixedNow = 1_700_000_000_000;
  const seed = createSeedIncidents(fixedNow);
  const asokCam = BMA_TRAFFIC_CAMERAS.find((c) => c.id === 'bma-cam-asok');
  assert.ok(asokCam);

  const status = getBmaCameraStatus(asokCam, BANGKOK_ROADS, seed, fixedNow);
  assert.ok(status.density >= 0.08 && status.density <= 1);
  assert.ok(status.estimatedSpeedKmh >= 6);
  assert.ok(
    status.nearbyIncidents.some((item) => item.pin.id === 'pin-3'),
    'Asok camera should detect Asok flood pin within 650m'
  );
});

test('filterBmaCameras and getAdjacentBmaCamera filter and cycle cleanly', () => {
  const asokMatches = filterBmaCameras(BMA_TRAFFIC_CAMERAS, 'อโศก');
  assert.ok(asokMatches.length >= 2);

  const nextCam = getAdjacentBmaCamera(
    BMA_TRAFFIC_CAMERAS,
    BMA_TRAFFIC_CAMERAS[BMA_TRAFFIC_CAMERAS.length - 1].id,
    1
  );
  assert.equal(nextCam?.id, BMA_TRAFFIC_CAMERAS[0].id);

  const prevCam = getAdjacentBmaCamera(
    BMA_TRAFFIC_CAMERAS,
    BMA_TRAFFIC_CAMERAS[0].id,
    -1
  );
  assert.equal(prevCam?.id, BMA_TRAFFIC_CAMERAS[BMA_TRAFFIC_CAMERAS.length - 1].id);
});

test('buildCameraSharePayload links to bmatraffic.com and encodes social links', () => {
  const fixedNow = 1_700_000_000_000;
  const seed = createSeedIncidents(fixedNow);
  const cam = BMA_TRAFFIC_CAMERAS[0];
  const status = getBmaCameraStatus(cam, BANGKOK_ROADS, seed, fixedNow);
  const payload = buildCameraSharePayload(cam, status, 'https://roaddee.test');

  assert.ok(payload.message.includes('http://www.bmatraffic.com/index.aspx'));
  assert.ok(payload.message.includes(cam.name));
  assert.ok(payload.lineShareUrl.startsWith('https://line.me/R/msg/text/?'));
});

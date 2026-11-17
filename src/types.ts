export type IncidentCategory =
  | 'checkpoint'
  | 'accident'
  | 'traffic'
  | 'flood'
  | 'hazard'
  | 'camera';

export type IncidentHeading = 'ขาเข้า' | 'ขาออก' | 'ทุกทิศทาง';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface IncidentPin {
  id: string;
  category: IncidentCategory;
  title: string;
  roadName: string;
  landmark: string;
  description: string;
  heading: IncidentHeading;
  laneTag?: string;
  position: LatLng;
  confirmations: number;
  clearVotes: number;
  trustScore: number; // 0-100
  createdAtMs: number;
  expiresAtMs: number;
  reportedBy: string;
  source?: 'seed' | 'user' | 'ai-parser';
}

export interface TurnInstruction {
  id: string;
  distanceFromStartMeters: number;
  maneuver: 'straight' | 'left' | 'right' | 'slight-right' | 'merge' | 'arrive';
  streetName: string;
  instructionThai: string;
  speedLimitKmh: number;
  position: LatLng;
}

export interface RouteOption {
  id: string;
  label: string;
  isAlternate: boolean;
  summary: string;
  durationMinutes: number;
  distanceKm: number;
  avoidNote?: string;
  waypoints: LatLng[];
  turns: TurnInstruction[];
}

export interface RoutePreset {
  id: string;
  originName: string;
  destinationName: string;
  origin: LatLng;
  destination: LatLng;
  primary: RouteOption;
  alternate: RouteOption;
}

export interface BangkokPlace {
  id: string;
  name: string;
  shortName: string;
  road: string;
  position: LatLng;
  aliases?: string[];
}

export interface OnRouteIncident {
  pin: IncidentPin;
  distanceFromRouteMeters: number;
  distanceFromOriginMeters: number;
}

export interface ParsedReportCandidate {
  id: string;
  rawLine: string;
  timeLabel?: string;
  category: IncidentCategory;
  heading: IncidentHeading;
  roadName: string;
  landmark: string;
  description: string;
  position: LatLng;
  confidence: number;
}

export type ThemeMode = 'light' | 'dark';
export type MapEngineMode = 'vector' | 'google';

export type TrafficCongestionLevel = 'free' | 'moderate' | 'heavy' | 'severe';

export interface TrafficHeatmapSegment {
  id: string;
  roadId: string;
  roadName: string;
  tier: 'expressway' | 'artery' | 'secondary';
  start: LatLng;
  end: LatLng;
  midpoint: LatLng;
  historicalDensity: number; // 0..1 baseline from BANGKOK_ROADS
  incidentBoost: number; // 0..0.55 boost from live pins
  density: number; // 0..1 combined real-time density
  level: TrafficCongestionLevel;
  estimatedSpeedKmh: number;
}

export interface TrafficHeatmapHotspot {
  id: string;
  roadName: string;
  position: LatLng;
  density: number;
  level: TrafficCongestionLevel;
}

export interface TrafficHeatmapData {
  segments: TrafficHeatmapSegment[];
  hotspots: TrafficHeatmapHotspot[];
  congestedCount: number;
  severeCount: number;
  avgSpeedKmh: number;
}

export interface BmaTrafficCamera {
  id: string;
  code: string;
  name: string;
  junction: string;
  roadName: string;
  district: string;
  direction: string;
  position: LatLng;
  sourceUrl: string;
  altPortalUrl: string;
}



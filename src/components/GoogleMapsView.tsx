import React, { useEffect, useRef } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  APILoadingStatus,
  Map as GoogleMap,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { BmaTrafficCamera, IncidentPin, LatLng, RouteOption, ThemeMode } from '../types';
import { BmaCameraPinMarker, TeardropPinMarker } from './CategoryIcon';

interface GoogleMapsViewProps {
  apiKey: string;
  pins: IncidentPin[];
  selectedPinId: string | null;
  onSelectPin: (pin: IncidentPin) => void;
  cameras: BmaTrafficCamera[];
  selectedCameraId: string | null;
  showCameras: boolean;
  onSelectCamera: (camera: BmaTrafficCamera) => void;
  activeRoute: RouteOption | null;
  onRouteIds: Set<string>;
  vehiclePosition: LatLng;
  vehicleHeadingDeg: number;
  isDriving: boolean;
  theme: ThemeMode;
  onFallbackToVector: () => void;
  onResolvedRoutePath?: (routeId: string, path: LatLng[]) => void;
}

function RoutePolylineLayer({
  activeRoute,
  theme,
  onResolvedRoutePath,
}: {
  activeRoute: RouteOption | null;
  theme: ThemeMode;
  onResolvedRoutePath?: (routeId: string, path: LatLng[]) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!map || !activeRoute || activeRoute.waypoints.length < 2) return;

    const origin = activeRoute.waypoints[0];
    const destination = activeRoute.waypoints[activeRoute.waypoints.length - 1];
    const intermediates = activeRoute.waypoints.slice(1, -1);

    let cancelled = false;

    const drawFallbackPolyline = () => {
      if (cancelled) return;
      const line = new google.maps.Polyline({
        path: activeRoute.waypoints,
        geodesic: true,
        strokeColor: theme === 'dark' ? '#38BDF8' : '#0EA5E9',
        strokeOpacity: 0.95,
        strokeWeight: 7,
        map,
      });
      polylinesRef.current = [line];
      const bounds = new google.maps.LatLngBounds();
      activeRoute.waypoints.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, { top: 235, bottom: 265, left: 36, right: 36 });
    };

    if (routesLib?.Route?.computeRoutes) {
      // Uses modern Promise-based Google Maps JS SDK Route.computeRoutes static method
      routesLib.Route.computeRoutes({
        origin,
        destination,
        intermediates: intermediates.map((location) => ({ location })),
        travelMode: 'DRIVING' as google.maps.TravelMode,
        fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
      })
        .then((response) => {
          if (cancelled) return;
          const primaryRoute = response?.routes?.[0];
          if (primaryRoute?.path && primaryRoute.path.length >= 2 && onResolvedRoutePath) {
            const convertedPath: LatLng[] = primaryRoute.path.map((pt) => ({
              lat: pt.lat,
              lng: pt.lng,
            }));
            onResolvedRoutePath(activeRoute.id, convertedPath);
          }
          if (primaryRoute?.createPolylines) {
            const lines = primaryRoute.createPolylines({
              polylineOptions: {
                strokeColor: theme === 'dark' ? '#38BDF8' : '#0EA5E9',
                strokeWeight: 7,
                strokeOpacity: 0.95,
              },
            });
            lines.forEach((polyline) => {
              polyline.setMap(map);
            });
            polylinesRef.current = lines;
            if (primaryRoute.viewport) {
              map.fitBounds(primaryRoute.viewport, { top: 235, bottom: 265, left: 36, right: 36 });
            }
          } else {
            drawFallbackPolyline();
          }
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT') || msg.includes('429')) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
          drawFallbackPolyline();
        });
    } else {
      drawFallbackPolyline();
    }

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, routesLib, activeRoute, theme, onResolvedRoutePath]);

  return null;
}

function ApiStatusWatcher({ onFallbackToVector }: { onFallbackToVector: () => void }) {
  const status = useApiLoadingStatus();

  useEffect(() => {
    if (
      status === APILoadingStatus.AUTH_FAILURE ||
      status === APILoadingStatus.FAILED
    ) {
      onFallbackToVector();
    }
  }, [status, onFallbackToVector]);

  return null;
}

export function GoogleMapsView({
  apiKey,
  pins,
  selectedPinId,
  onSelectPin,
  cameras,
  selectedCameraId,
  showCameras,
  onSelectCamera,
  activeRoute,
  onRouteIds,
  vehiclePosition,
  vehicleHeadingDeg,
  isDriving,
  theme,
  onFallbackToVector,
  onResolvedRoutePath,
}: GoogleMapsViewProps) {
  const hasActiveRoute = Boolean(activeRoute);

  return (
    <div className="w-full h-full relative" data-testid="google-maps-view">
      <APIProvider
        apiKey={apiKey}
        language="th"
        region="TH"
        libraries={['routes', 'marker']}
      >
        <ApiStatusWatcher onFallbackToVector={onFallbackToVector} />
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={{ lat: 13.758, lng: 100.573 }}
          defaultZoom={12.4}
          center={isDriving ? vehiclePosition : undefined}
          colorScheme={theme === 'dark' ? 'DARK' : 'LIGHT'}
          gestureHandling="greedy"
          disableDefaultUI
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
        >
          <RoutePolylineLayer
            activeRoute={activeRoute}
            theme={theme}
            onResolvedRoutePath={onResolvedRoutePath}
          />

          {/* Simulated Vehicle Marker */}
          <AdvancedMarker position={vehiclePosition} title="ตำแหน่งรถปัจจุบัน">
            <div className="relative flex items-center justify-center w-11 h-11">
              {isDriving && (
                <span className="animate-pulse-ring absolute inset-0 rounded-full bg-sky-500/35 border-2 border-sky-400" />
              )}
              <div
                className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border-2 border-sky-500 shadow-lg flex items-center justify-center"
                style={{ transform: `rotate(${vehicleHeadingDeg}deg)` }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-sky-600" fill="currentColor">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                </svg>
              </div>
            </div>
          </AdvancedMarker>

          {/* BMA Traffic CCTV AdvancedMarkers */}
          {showCameras &&
            cameras.map((cam) => (
              <AdvancedMarker
                key={cam.id}
                position={cam.position}
                title={`${cam.name} (${cam.code})`}
                onClick={() => onSelectCamera(cam)}
              >
                <BmaCameraPinMarker
                  camera={cam}
                  isSelected={selectedCameraId === cam.id}
                  interactive={false}
                  onSelect={onSelectCamera}
                />
              </AdvancedMarker>
            ))}

          {/* Crowdsourced Incident AdvancedMarkers */}
          {pins.map((pin) => {
            const isOnRoute = hasActiveRoute && onRouteIds.has(pin.id);
            const isDimmed = hasActiveRoute && !onRouteIds.has(pin.id);
            return (
              <AdvancedMarker
                key={pin.id}
                position={pin.position}
                title={pin.title}
                onClick={() => onSelectPin(pin)}
              >
                <TeardropPinMarker
                  pin={pin}
                  isSelected={selectedPinId === pin.id}
                  isOnRoute={isOnRoute}
                  isDimmed={isDimmed}
                  interactive={false}
                  onSelect={onSelectPin}
                />
              </AdvancedMarker>
            );
          })}
        </GoogleMap>
      </APIProvider>
    </div>
  );
}

import React, { useEffect, useRef, useState, useCallback, useMemo, Suspense, lazy } from 'react';
import { setWorkerUrl, type LngLatBounds } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
setWorkerUrl(workerUrl);

import Map, { Marker, Popup, Source, Layer, type MapRef, type MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AlertTriangle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import MapSidebar from '@/components/map-dashboard/MapSidebar';
import MapTopSearch from '@/components/map-dashboard/MapTopSearch';
import MapPointControls from '@/components/map-dashboard/MapPointControls';
import MapRouteDetailBar from '@/components/map-dashboard/MapRouteDetailBar';
import TransportMarkerIcon, { LegModeMarker, LEG_MODE_COLOR } from '@/components/transportMarkerIcon';
import { getMapStyle, walkingDirections, drivingDirections, type DirectionsResult } from '@/services/mapService';
import { getCurrentPosition, isGeolocationSupported, distanceMeters } from '@/services/locationService';
import {
  INDONESIA_TRANSPORT_DATA,
  TRANSPORT_TYPE_LABELS,
  type IndonesiaTransportType,
  type IndonesiaTransportLocation,
} from '@/data/indonesiaTransportData';
import { INDONESIA_ROAD_DISRUPTIONS, SEVERITY_COLORS } from '@/data/indonesiaRoadDisruption';
import type { GeoPoint, RouteOption, RouteLeg, PlaceResult } from '@/types/domain.types';

const StreetViewModal = lazy(() => import('@/components/StreetViewModal'));

const JAKARTA_CENTER: GeoPoint = { lat: -6.2088, lng: 106.8456 };
type BaseLayer = 'street' | 'satellite';

const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    'esri-satellite': {
      type: 'raster' as const,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
  },
  layers: [{ id: 'esri-satellite-layer', type: 'raster' as const, source: 'esri-satellite' }],
};

const ALL_TRANSPORT_TYPES = Object.keys(TRANSPORT_TYPE_LABELS) as IndonesiaTransportType[];
const MAX_RENDERED_MARKERS = 200;
const STREET_VIEW_CONFIRM_RADIUS_M = 40;

function legCoordinates(leg: RouteLeg): [number, number][] {
  const points = leg.geometry && leg.geometry.length >= 2 ? leg.geometry : [leg.from, leg.to];
  return points.map((p) => [p.lng, p.lat]);
}

export default function MapDashboard() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const mapRef = useRef<MapRef>(null);

  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [baseLayer, setBaseLayer] = useState<BaseLayer>('street');
  const [popupTarget, setPopupTarget] = useState<'user' | 'place' | null>(null);

  // Directions state
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [loadingDirections, setLoadingDirections] = useState(false);
  const [travelMode, setTravelMode] = useState<'walk' | 'ojek' | 'transit'>('ojek');
  const [budgetPreference, setBudgetPreference] = useState<'cheapest' | 'fastest' | 'efficient'>('efficient');

  const itineraryOption = (routerLocation.state as { option?: RouteOption } | null)?.option ?? null;

  // Active transport operator filters
  const [activeTypes, setActiveTypes] = useState<Set<IndonesiaTransportType>>(new Set(ALL_TRANSPORT_TYPES));
  const [mapBounds, setMapBounds] = useState<LngLatBounds | null>(null);
  const [hoveredStopId, setHoveredStopId] = useState<string | null>(null);
  const [hoveredDisruptionId, setHoveredDisruptionId] = useState<string | null>(null);

  // Street view modal state
  const [pendingStreetViewPoint, setPendingStreetViewPoint] = useState<GeoPoint | null>(null);
  const [streetViewPoint, setStreetViewPoint] = useState<GeoPoint | null>(null);

  const [viewState, setViewState] = useState({
    latitude: JAKARTA_CENTER.lat,
    longitude: JAKARTA_CENTER.lng,
    zoom: 14,
  });

  // GPS Location fetch
  useEffect(() => {
    if (!isGeolocationSupported()) return;
    getCurrentPosition()
      .then((point) => setUserLocation(point))
      .catch(() => {});
  }, []);

  // Fly to user location initially
  useEffect(() => {
    if (itineraryOption || !userLocation || !mapRef.current) return;
    mapRef.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 14, duration: 800 });
  }, [userLocation, itineraryOption]);

  // Directions calculation effect
  useEffect(() => {
    if (itineraryOption || !userLocation || !selectedPlace) {
      setDirections(null);
      return;
    }
    let cancelled = false;
    setLoadingDirections(true);

    const fetchDirections = travelMode === 'walk' ? walkingDirections : drivingDirections;

    fetchDirections(userLocation, selectedPlace)
      .then((result) => {
        if (!cancelled) setDirections(result);
      })
      .catch(() => {
        if (!cancelled) setDirections(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingDirections(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userLocation, selectedPlace, travelMode, itineraryOption]);

  // Fit bounds if itinerary option passed
  useEffect(() => {
    if (!itineraryOption || !mapRef.current) return;
    const allPoints = itineraryOption.legs.flatMap((leg) => legCoordinates(leg));
    if (allPoints.length === 0) return;

    let minLng = allPoints[0][0];
    let maxLng = allPoints[0][0];
    let minLat = allPoints[0][1];
    let maxLat = allPoints[0][1];
    for (const [lng, lat] of allPoints) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
    mapRef.current.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 60, duration: 800 }
    );
  }, [itineraryOption]);

  const handleMoveEnd = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) setMapBounds(map.getBounds());
  }, []);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map) setMapBounds(map.getBounds());
  }, []);

  const visibleTransportLocations = useMemo(() => {
    if (!mapBounds) return [];
    const filtered = INDONESIA_TRANSPORT_DATA.filter(
      (t) => activeTypes.has(t.type) && mapBounds.contains([t.longitude, t.latitude])
    );
    return filtered.length > MAX_RENDERED_MARKERS ? filtered.slice(0, MAX_RENDERED_MARKERS) : filtered;
  }, [mapBounds, activeTypes]);

  const activeRoadDisruptions = useMemo(() => {
    if (!mapBounds) return [];
    return INDONESIA_ROAD_DISRUPTIONS.filter(
      (d) => d.isActive && d.latitude && d.longitude && mapBounds.contains([d.longitude, d.latitude])
    );
  }, [mapBounds]);

  const toggleType = (type: IndonesiaTransportType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const showAllTypes = () => {
    setActiveTypes(new Set(ALL_TRANSPORT_TYPES));
  };

  const handleSelectSavedPlace = (lat: number, lng: number) => {
    setSelectedPlace({
      lat,
      lng,
      label: 'Saved Location',
      address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    });
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
    }
  };

  const handleSelectSearchPlace = (place: PlaceResult) => {
    setSelectedPlace(place);
    setPendingStreetViewPoint({ lat: place.lat, lng: place.lng });
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [place.lng, place.lat], zoom: 15, duration: 800 });
    }
  };

  const handleSelectRouteSearch = (origin: PlaceResult | null, destination: PlaceResult) => {
    if (origin) {
      setUserLocation({ lat: origin.lat, lng: origin.lng });
    }
    setSelectedPlace(destination);
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [destination.lng, destination.lat], zoom: 15, duration: 800 });
    }
  };

  const handleMapClick = useCallback(
    async (e: MapLayerMouseEvent) => {
      const { lat, lng } = e.lngLat;
      const point: GeoPoint = { lat, lng };

      if (pendingStreetViewPoint && distanceMeters(point, pendingStreetViewPoint) <= STREET_VIEW_CONFIRM_RADIUS_M) {
        setStreetViewPoint(pendingStreetViewPoint);
        return;
      }
      setPendingStreetViewPoint(point);
    },
    [pendingStreetViewPoint]
  );

  const routeGeoJson = directions
    ? {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: directions.geometry.map((p) => [p.lng, p.lat]),
        },
      }
    : null;

  return (
    <div style={dashboardWrapper}>
      {/* 1. Sidebar Component */}
      <MapSidebar
        activeTypes={activeTypes}
        onToggleType={toggleType}
        onShowAllTypes={showAllTypes}
        onSelectSavedPlace={handleSelectSavedPlace}
      />

      {/* Map Viewport Area */}
      <main style={mapContainer}>
        {/* 2. Top Floating Search Bar & Filters */}
        <MapTopSearch
          onSelectPlace={handleSelectSearchPlace}
          onSelectRouteSearch={handleSelectRouteSearch}
          travelMode={travelMode}
          onChangeTravelMode={setTravelMode}
          budgetPreference={budgetPreference}
          onChangeBudgetPreference={setBudgetPreference}
        />

        {/* 3. Right Floating Point Controls */}
        <MapPointControls
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onToggleMapStyle={() => setBaseLayer((prev) => (prev === 'street' ? 'satellite' : 'street'))}
          onReCenterUserLocation={() => {
            if (userLocation && mapRef.current) {
              mapRef.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 15, duration: 800 });
            }
          }}
          onAddStop={() => {}}
          onToggleRoute={() => {}}
          baseLayer={baseLayer}
        />

        {/* 4. Bottom Route Detail Bar */}
        <MapRouteDetailBar
          destination={selectedPlace}
          directions={directions}
          loading={loadingDirections}
          onOpenDetails={() => {
            if (selectedPlace) {
              navigate('/routes', { state: { destination: selectedPlace } });
            }
          }}
          onCloseRoute={() => {
            setSelectedPlace(null);
            setDirections(null);
          }}
        />

        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          onMoveEnd={handleMoveEnd}
          onClick={handleMapClick}
          mapStyle={baseLayer === 'satellite' ? SATELLITE_STYLE : getMapStyle()}
          style={{ width: '100%', height: '100%' }}
        >

          {/* Render Route Line if directions available */}
          {!itineraryOption && routeGeoJson && (
            <Source id="single-route" type="geojson" data={routeGeoJson}>
              <Layer
                id="single-route-line"
                type="line"
                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                paint={{
                  'line-color': '#DA362A',
                  'line-width': 5,
                  'line-opacity': 0.85,
                }}
              />
            </Source>
          )}

          {/* Multi-leg itinerary rendering if passed */}
          {itineraryOption &&
            itineraryOption.legs.map((leg, i) => {
              const coords = legCoordinates(leg);
              const color = LEG_MODE_COLOR[leg.mode] ?? LEG_MODE_COLOR.other;
              const isDashed = leg.mode === 'walk' || !!leg.geometryIsEstimate;
              const midIdx = Math.floor(coords.length / 2);
              const mid = coords[midIdx];
              const boundaryPoint = coords[0];

              return (
                <React.Fragment key={i}>
                  <Source
                    id={`leg-${i}`}
                    type="geojson"
                    data={{
                      type: 'Feature',
                      properties: {},
                      geometry: { type: 'LineString', coordinates: coords },
                    }}
                  >
                    <Layer
                      id={`leg-line-${i}`}
                      type="line"
                      layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                      paint={{
                        'line-color': color,
                        'line-width': 5,
                        'line-opacity': 0.9,
                        'line-dasharray': isDashed ? [2, 2] : [1, 0],
                      }}
                    />
                  </Source>

                  {leg.mode !== 'walk' && mid && (
                    <Marker longitude={mid[0]} latitude={mid[1]} anchor="center">
                      <LegModeMarker mode={leg.mode} />
                    </Marker>
                  )}

                  {i > 0 && boundaryPoint && (
                    <Marker longitude={boundaryPoint[0]} latitude={boundaryPoint[1]} anchor="center">
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: '#fff',
                          border: `3px solid ${color}`,
                        }}
                      />
                    </Marker>
                  )}
                </React.Fragment>
              );
            })}

          {/* User GPS location dot */}
          {userLocation && (
            <Marker
              latitude={userLocation.lat}
              longitude={userLocation.lng}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupTarget('user');
              }}
            >
              <div className="maplibregl-user-location-dot" />
            </Marker>
          )}

          {userLocation && popupTarget === 'user' && (
            <Popup
              latitude={userLocation.lat}
              longitude={userLocation.lng}
              onClose={() => setPopupTarget(null)}
              closeButton={false}
            >
              Posisiku Saat Ini
            </Popup>
          )}

          {/* Selected Destination Marker */}
          {selectedPlace && (
            <Marker latitude={selectedPlace.lat} longitude={selectedPlace.lng}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#DA362A',
                  border: '3px solid #FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              />
            </Marker>
          )}

          {/* Road Disruptions Layer */}
          {activeRoadDisruptions.map((d) => (
            <Marker
              key={d.id}
              latitude={d.latitude!}
              longitude={d.longitude!}
              onClick={(e) => e.originalEvent.stopPropagation()}
            >
              <div
                onMouseEnter={() => setHoveredDisruptionId(d.id)}
                onMouseLeave={() => setHoveredDisruptionId((id) => (id === d.id ? null : id))}
                style={{
                  width: hoveredDisruptionId === d.id ? 30 : 24,
                  height: hoveredDisruptionId === d.id ? 30 : 24,
                  borderRadius: '50%',
                  background: SEVERITY_COLORS[d.severity],
                  border: '2px solid #0B1220',
                  boxShadow:
                    hoveredDisruptionId === d.id
                      ? '0 0 0 5px rgba(255,255,255,0.15), 0 2px 6px rgba(0,0,0,0.4)'
                      : '0 2px 5px rgba(0,0,0,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                <AlertTriangle
                  size={Math.round((hoveredDisruptionId === d.id ? 30 : 24) * 0.55)}
                  color="#fff"
                  strokeWidth={2.5}
                />
              </div>
            </Marker>
          ))}

          {hoveredDisruptionId && (() => {
            const d = activeRoadDisruptions.find((s) => s.id === hoveredDisruptionId);
            if (!d || !d.latitude || !d.longitude) return null;
            return (
              <Popup
                latitude={d.latitude}
                longitude={d.longitude}
                closeButton={false}
                closeOnClick={false}
                offset={20}
                anchor="bottom"
                style={{ zIndex: 'var(--z-popover)' }}
              >
                <div style={{ minWidth: 160, maxWidth: 220 }}>
                  <strong>{d.title}</strong>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: SEVERITY_COLORS[d.severity] + '22',
                        color: SEVERITY_COLORS[d.severity],
                      }}
                    >
                      {d.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{d.description}</div>
                </div>
              </Popup>
            );
          })()}

          {/* Transport Operator Locations */}
          {visibleTransportLocations.map((stop: IndonesiaTransportLocation) => (
            <Marker
              key={stop.id}
              latitude={stop.latitude}
              longitude={stop.longitude}
              onClick={(e) => e.originalEvent.stopPropagation()}
            >
              <div
                onMouseEnter={() => setHoveredStopId(stop.id)}
                onMouseLeave={() => setHoveredStopId((id) => (id === stop.id ? null : id))}
              >
                <TransportMarkerIcon type={stop.type} highlighted={hoveredStopId === stop.id} />
              </div>
            </Marker>
          ))}

          {hoveredStopId && (() => {
            const stop = visibleTransportLocations.find((s) => s.id === hoveredStopId);
            if (!stop) return null;
            return (
              <Popup
                latitude={stop.latitude}
                longitude={stop.longitude}
                closeButton={false}
                closeOnClick={false}
                offset={20}
                anchor="bottom"
              >
                <div style={{ minWidth: 160 }}>
                  <strong>{stop.name}</strong>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{TRANSPORT_TYPE_LABELS[stop.type]}</div>
                  {stop.line && <div style={{ fontSize: 12, color: '#555' }}>{stop.line}</div>}
                  <div style={{ fontSize: 12, color: '#555' }}>
                    {stop.city}, {stop.province}
                  </div>
                </div>
              </Popup>
            );
          })()}

          {/* Street view indicator dot */}
          {pendingStreetViewPoint && (
            <Marker latitude={pendingStreetViewPoint.lat} longitude={pendingStreetViewPoint.lng}>
              <div
                title="Click again for street view"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#F97316',
                  border: '3px solid #0B1220',
                  boxShadow: '0 0 0 6px rgba(249,115,22,0.25)',
                }}
              />
            </Marker>
          )}
        </Map>

        {/* Street view modal */}
        {streetViewPoint && (
          <Suspense fallback={<div style={overlayLoadingFallback}>Loading street view…</div>}>
            <StreetViewModal
              point={streetViewPoint}
              onClose={() => setStreetViewPoint(null)}
            />
          </Suspense>
        )}
      </main>
    </div>
  );
}

const dashboardWrapper: React.CSSProperties = {
  display: 'flex',
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
};

const mapContainer: React.CSSProperties = {
  flex: 1,
  height: '100%',
  position: 'relative',
};

const overlayLoadingFallback: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontSize: 14,
  zIndex: 'var(--z-modal)',
};

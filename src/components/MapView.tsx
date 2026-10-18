import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GPSLocation, SavedMarker, HistoryPoint, TileLayerType } from '../types';
import { Plus, Minus, Globe, Crosshair, FilePlus, Briefcase } from 'lucide-react';

interface MapViewProps {
  currentLocation: GPSLocation | null;
  savedMarkers: SavedMarker[];
  historyPoints: HistoryPoint[];
  tileLayer: TileLayerType;
  setTileLayer: (layer: TileLayerType) => void;
  onMapClick: (lat: number, lng: number) => void;
  flyToCoords: { lat: number; lng: number; zoom: number } | null;
  hideZoomControls?: boolean;
  onResetToUserLocation?: () => void;
  activeNavigationRoute?: { startLat: number; startLng: number; endLat: number; endLng: number } | null;
  navigationStep?: number;
  onCreateGig?: () => void;
  workRadiusMiles?: number;
  onShowNearbyGigs?: () => void;
  nearbyGigsCount?: number;
}

export const MapView: React.FC<MapViewProps> = ({
  currentLocation,
  savedMarkers,
  historyPoints,
  tileLayer,
  setTileLayer,
  onMapClick,
  flyToCoords,
  hideZoomControls,
  onResetToUserLocation,
  activeNavigationRoute,
  navigationStep = 0,
  onCreateGig,
  workRadiusMiles,
  onShowNearbyGigs,
  nearbyGigsCount = 0,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const seekerMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const workRadiusCircleRef = useRef<L.Circle | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map Instantly
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    // Center immediately on user or South Africa default (Johannesburg / Cape Town)
    const initialLat = currentLocation ? currentLocation.lat : -26.2041;
    const initialLng = currentLocation ? currentLocation.lng : 28.0473;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      fadeAnimation: false, // Quicker rendering without delay
      zoomAnimation: true,
      preferCanvas: true,
    }).setView([initialLat, initialLng], 15);

    // Initial tile layer with instant buffer
    const tLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      updateWhenIdle: false, // Update continuously for fast display
      updateWhenZooming: true,
      keepBuffer: 6,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    tileLayerRef.current = tLayer;

    // Layer group for saved markers
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    // Map click handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;

    // Instantly invalidate size for immediate tile rendering
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; OpenStreetMap contributors';

    if (tileLayer === 'topo') {
      url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      attribution = 'Map data: &copy; OpenStreetMap contributors, SRTM';
    } else if (tileLayer === 'dark') {
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      attribution = '&copy; OpenStreetMap contributors &copy; CARTO';
    } else if (tileLayer === 'voyager') {
      url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      attribution = '&copy; OpenStreetMap contributors &copy; CARTO';
    } else if (tileLayer === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri';
    }

    const newLayer = L.tileLayer(url, { 
      maxZoom: 19, 
      keepBuffer: 6, 
      updateWhenIdle: false,
      attribution 
    });
    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
  }, [tileLayer]);

  // Handle FlyTo
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !flyToCoords) return;
    
    // Validate coordinates to prevent NaN
    if (isNaN(flyToCoords.lat) || isNaN(flyToCoords.lng)) {
      console.warn('Invalid flyTo coordinates:', flyToCoords);
      return;
    }

    map.flyTo([flyToCoords.lat, flyToCoords.lng], flyToCoords.zoom || 16, {
      duration: 0.8,
    });
  }, [flyToCoords]);

  // Update User Location Marker & Accuracy Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentLocation) return;

    const latLng: [number, number] = [currentLocation.lat, currentLocation.lng];

    // Custom pulse HTML icon for user
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="position: relative; width: 26px; height: 26px;">
          <div style="position: absolute; top: 0; left: 0; width: 26px; height: 26px; background: rgba(16, 185, 129, 0.4); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; top: 4px; left: 4px; width: 18px; height: 18px; background: #10b981; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(latLng);
    } else {
      userMarkerRef.current = L.marker(latLng, { icon: userIcon }).addTo(map);
    }

    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng(latLng);
      accuracyCircleRef.current.setRadius(currentLocation.accuracy || 15);
    } else {
      accuracyCircleRef.current = L.circle(latLng, {
        radius: currentLocation.accuracy || 15,
        color: '#10b981',
        weight: 1,
        fillColor: '#10b981',
        fillOpacity: 0.15,
      }).addTo(map);
    }
  }, [currentLocation]);

  // Update Working Radius Circle in miles around User Location
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!currentLocation || !workRadiusMiles) {
      if (workRadiusCircleRef.current) {
        map.removeLayer(workRadiusCircleRef.current);
        workRadiusCircleRef.current = null;
      }
      return;
    }

    const latLng: [number, number] = [currentLocation.lat, currentLocation.lng];
    const radiusMeters = workRadiusMiles * 1609.344;

    if (workRadiusCircleRef.current) {
      workRadiusCircleRef.current.setLatLng(latLng);
      workRadiusCircleRef.current.setRadius(radiusMeters);
    } else {
      workRadiusCircleRef.current = L.circle(latLng, {
        radius: radiusMeters,
        color: '#2563eb',
        weight: 1.5,
        dashArray: '6, 6',
        fillColor: '#3b82f6',
        fillOpacity: 0.06,
      }).addTo(map);
    }
  }, [currentLocation, workRadiusMiles]);

  // Update Navigation Route Polyline & Step-by-Step Seeker Marker Position
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeNavigationRoute) {
      const start: [number, number] = [activeNavigationRoute.startLat, activeNavigationRoute.startLng];
      const end: [number, number] = [activeNavigationRoute.endLat, activeNavigationRoute.endLng];

      // Draw or update route polyline
      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs([start, end]);
      } else {
        routePolylineRef.current = L.polyline([start, end], {
          color: '#2563eb',
          weight: 5,
          opacity: 0.85,
          dashArray: '8, 8',
        }).addTo(map);
      }

      // Calculate step-by-step position (fraction from 0 to 1 based on navigationStep 0..4)
      const fraction = Math.min(1, Math.max(0, (navigationStep || 0) / 4));
      const currentLat = activeNavigationRoute.startLat + (activeNavigationRoute.endLat - activeNavigationRoute.startLat) * fraction;
      const currentLng = activeNavigationRoute.startLng + (activeNavigationRoute.endLng - activeNavigationRoute.startLng) * fraction;
      const currentPos: [number, number] = [currentLat, currentLng];

      const isArrived = fraction >= 1;

      const seekerIcon = L.divIcon({
        className: 'custom-seeker-marker',
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; background-color: ${isArrived ? '#10b981' : '#2563eb'}; opacity: 0.3; border-radius: 50%; animation: ping 1.5s infinite;"></div>
            <div style="position: relative; background-color: ${isArrived ? '#10b981' : '#2563eb'}; width: 40px; height: 40px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.35); border: 3px solid white; color: white; font-weight: bold; font-size: 10px; line-height: 1;">
              <span>${isArrived ? 'Arrived' : 'Step ' + (navigationStep || 1)}</span>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      if (seekerMarkerRef.current) {
        seekerMarkerRef.current.setLatLng(currentPos);
        seekerMarkerRef.current.setIcon(seekerIcon);
      } else {
        seekerMarkerRef.current = L.marker(currentPos, { icon: seekerIcon }).addTo(map);
      }
    } else {
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      if (seekerMarkerRef.current) {
        map.removeLayer(seekerMarkerRef.current);
        seekerMarkerRef.current = null;
      }
    }
  }, [activeNavigationRoute, navigationStep]);

  // Update Saved Markers
  useEffect(() => {
    const markersGroup = markersLayerRef.current;
    if (!markersGroup) return;

    markersGroup.clearLayers();

    savedMarkers.forEach((marker) => {
      const color = '#334155';

      const pinIcon = L.divIcon({
        className: 'custom-pin-marker',
        html: `
          <div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.25); border: 2px solid white;">
            <div style="width: 10px; height: 10px; background: white; border-radius: 50%; transform: rotate(45deg);"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const m = L.marker([marker.lat, marker.lng], { icon: pinIcon });
      m.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; min-width: 170px; padding: 2px;">
          <div style="font-weight: bold; color: #0f172a; font-size: 13px; margin-bottom: 2px;">${marker.title}</div>
          ${marker.notes ? `<div style="font-size: 11px; color: #475569; margin-bottom: 6px;">${marker.notes}</div>` : ''}
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px;">
            <span style="font-weight: bold; background: #ecfdf5; color: #047857; padding: 2px 6px; border-radius: 4px; border: 1px solid #a7f3d0;">
              Active Casual Gig
            </span>
            <span style="color: #94a3b8;">${marker.address || 'South Africa'}</span>
          </div>
        </div>
      `);
      markersGroup.addLayer(m);
    });
  }, [savedMarkers]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const toggleSatellite = () => {
    if (tileLayer === 'satellite') {
      setTileLayer('osm');
    } else {
      setTileLayer('satellite');
    }
  };

  return (
    <div className="flex-1 relative h-full w-full">
      <div ref={mapContainerRef} className="absolute inset-0 z-10 w-full h-full" />

      {/* Separate floating map control buttons */}
      {!hideZoomControls && (
        <>
          {/* Zoom controls at bottom right, above bottom bar */}
          <div className="absolute bottom-20 right-6 z-30 flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="w-11 h-11 rounded-2xl bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-900 flex items-center justify-center shadow-lg border border-slate-200 transition-transform active:scale-95"
              title="Zoom In"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-11 h-11 rounded-2xl bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-900 flex items-center justify-center shadow-lg border border-slate-200 transition-transform active:scale-95"
              title="Zoom Out"
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>

          {/* Top Right Action: Post Gig Badge */}
          {onCreateGig && (
            <div className="absolute top-20 right-6 z-30">
              <button
                onClick={onCreateGig}
                className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-xl border border-blue-500 transition-all active:scale-95 text-xs font-bold"
                title="Create a Gig"
              >
                <FilePlus className="w-4 h-4" />
                <span>Post Gig</span>
              </button>
            </div>
          )}

          {/* Floating Action Cluster: Location & Map Style */}
          <div className="absolute top-32 right-6 z-30 flex flex-col gap-2">
            {onResetToUserLocation && (
              <button
                onClick={onResetToUserLocation}
                className="w-11 h-11 rounded-2xl bg-white/95 backdrop-blur-md hover:bg-slate-50 text-emerald-700 flex items-center justify-center shadow-lg border border-slate-200 transition-transform active:scale-95"
                title="Return to My Location"
              >
                <Crosshair className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={toggleSatellite}
              className={`w-11 h-11 rounded-2xl backdrop-blur-md flex items-center justify-center shadow-lg border transition-transform active:scale-95 ${
                tileLayer === 'satellite' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white/95 hover:bg-slate-50 text-slate-800 border-slate-200'
              }`}
              title="Toggle Satellite View"
            >
              <Globe className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

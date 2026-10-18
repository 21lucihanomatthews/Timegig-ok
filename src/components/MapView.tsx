import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GPSLocation, SavedMarker, HistoryPoint, TileLayerType } from '../types';

interface MapViewProps {
  currentLocation: GPSLocation | null;
  savedMarkers: SavedMarker[];
  historyPoints: HistoryPoint[];
  tileLayer: TileLayerType;
  onMapClick: (lat: number, lng: number) => void;
  flyToCoords: { lat: number; lng: number; zoom: number } | null;
}

export const MapView: React.FC<MapViewProps> = ({
  currentLocation,
  savedMarkers,
  historyPoints,
  tileLayer,
  onMapClick,
  flyToCoords,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const initialLat = currentLocation ? currentLocation.lat : 40.7128;
    const initialLng = currentLocation ? currentLocation.lng : -74.0060;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([initialLat, initialLng], 14);

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial tile layer
    const tLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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

    return () => {
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
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    if (tileLayer === 'topo') {
      url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      attribution = 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)';
    } else if (tileLayer === 'dark') {
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      attribution = '&copy; OpenStreetMap contributors &copy; CARTO';
    } else if (tileLayer === 'voyager') {
      url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      attribution = '&copy; OpenStreetMap contributors &copy; CARTO';
    }

    const newLayer = L.tileLayer(url, { maxZoom: 19, attribution });
    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
  }, [tileLayer]);

  // Handle FlyTo
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !flyToCoords) return;
    map.flyTo([flyToCoords.lat, flyToCoords.lng], flyToCoords.zoom || 16, {
      duration: 1.5,
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
        <div style="position: relative; width: 24px; height: 24px;">
          <div style="position: absolute; top: 0; left: 0; width: 24px; height: 24px; background: rgba(16, 185, 129, 0.3); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: #10b981; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
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

  // Update Saved Markers
  useEffect(() => {
    const markersGroup = markersLayerRef.current;
    if (!markersGroup) return;

    markersGroup.clearLayers();

    savedMarkers.forEach((marker) => {
      const color = 
        marker.category === 'home' ? '#2563eb' :
        marker.category === 'work' ? '#4f46e5' :
        marker.category === 'restaurant' ? '#d97706' :
        marker.category === 'sight' ? '#16a34a' :
        marker.category === 'alert' ? '#dc2626' : '#334155';

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
      
      const popupContent = `
        <div style="font-family: inherit; padding: 4px; min-width: 180px;">
          <h3 style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 2px;">${marker.title}</h3>
          <span style="display: inline-block; font-size: 10px; font-weight: 600; text-transform: uppercase; color: ${color}; background: ${color}15; padding: 2px 6px; border-radius: 4px; margin-bottom: 6px;">${marker.category}</span>
          ${marker.address ? `<p style="font-size: 11px; color: #475569; margin-bottom: 4px;">${marker.address}</p>` : ''}
          ${marker.notes ? `<p style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 4px;">"${marker.notes}"</p>` : ''}
          <div style="font-size: 10px; color: #94a3b8; font-family: monospace; margin-top: 6px; border-top: 1px solid #e2e8f0; pt-4;">
            ${marker.lat.toFixed(4)}°, ${marker.lng.toFixed(4)}°
          </div>
        </div>
      `;

      m.bindPopup(popupContent);
      markersGroup.addLayer(m);
    });
  }, [savedMarkers]);

  // Update History Polyline Trail
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const latLngs = historyPoints.map(p => [p.lat, p.lng] as [number, number]);

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latLngs);
    } else if (latLngs.length > 1) {
      polylineRef.current = L.polyline(latLngs, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.7,
        dashArray: '6, 6',
      }).addTo(map);
    }
  }, [historyPoints]);

  return (
    <div className="flex-1 relative h-full w-full">
      <div ref={mapContainerRef} className="absolute inset-0 z-10 w-full h-full" />
    </div>
  );
};

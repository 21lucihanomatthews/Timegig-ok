import React, { useState, useEffect, useRef } from 'react';
import { GPSLocation, SavedMarker, HistoryPoint, TileLayerType } from './types';
import { MapView } from './components/MapView';

export default function App() {
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const hasCenteredInitiallyRef = useRef<boolean>(false);

  // Live device GPS location effect
  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    // Immediate single position request for instant fix
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
        const loc: GPSLocation = {
          lat: latitude,
          lng: longitude,
          accuracy,
          altitude,
          speed,
          heading,
          timestamp: position.timestamp,
        };
        setCurrentLocation(loc);
        if (!hasCenteredInitiallyRef.current) {
          setFlyToCoords({ lat: latitude, lng: longitude, zoom: 17 });
          hasCenteredInitiallyRef.current = true;
        }
      },
      (err) => {
        console.warn('Initial geolocation error:', err.message);
        // Default to New York City if GPS is denied or unavailable
        if (!currentLocation) {
          setCurrentLocation({
            lat: 40.7128,
            lng: -74.0060,
            accuracy: 20,
            altitude: 10,
            speed: 0,
            heading: 0,
            timestamp: Date.now(),
          });
          setFlyToCoords({ lat: 40.7128, lng: -74.0060, zoom: 14 });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Continuous watch position
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
        const newLoc: GPSLocation = {
          lat: latitude,
          lng: longitude,
          accuracy,
          altitude,
          speed,
          heading,
          timestamp: position.timestamp,
        };
        setCurrentLocation(newLoc);

        if (!hasCenteredInitiallyRef.current) {
          setFlyToCoords({ lat: latitude, lng: longitude, zoom: 17 });
          hasCenteredInitiallyRef.current = true;
        }
      },
      (error) => {
        console.warn('Geolocation watch error:', error.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 m-0 p-0">
      <MapView
        currentLocation={currentLocation}
        savedMarkers={[]}
        historyPoints={[]}
        tileLayer={'osm'}
        onMapClick={() => {}}
        flyToCoords={flyToCoords}
      />
    </div>
  );
}

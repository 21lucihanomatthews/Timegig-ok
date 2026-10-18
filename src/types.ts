export interface GPSLocation {
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
  address?: string;
}

export type MarkerCategory = 'home' | 'work' | 'restaurant' | 'sight' | 'custom' | 'alert';

export interface SavedMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category: MarkerCategory;
  notes?: string;
  timestamp: number;
  address?: string;
}

export interface HistoryPoint {
  id: string;
  lat: number;
  lng: number;
  timestamp: number;
  speed?: number | null;
}

export type TileLayerType = 'osm' | 'topo' | 'dark' | 'voyager';

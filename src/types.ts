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

export type TileLayerType = 'osm' | 'topo' | 'dark' | 'voyager' | 'satellite';

export type ActivityType = 'gig_created' | 'seeker_hired' | 'gig_completed' | 'gig_cancelled' | 'profile_saved';

export interface UserActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: number;
  amount?: string;
  status?: 'active' | 'completed' | 'cancelled' | 'saved';
  details?: {
    seekerName?: string;
    reason?: string;
    cancelledBy?: string;
    budget?: string;
    location?: string;
    trade?: string;
  };
}

export interface CreatedGigItem {
  id: string;
  title: string;
  description: string;
  budget: string;
  location: string;
  lat: number;
  lng: number;
  timestamp: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  timeSchedule?: string;
  locationMode?: 'automatic' | 'manual';
}

export interface GigPostItem {
  id: string;
  title: string;
  trade: string;
  description: string;
  budget: string; // South African Rand (ZAR) e.g. "R 1,450"
  locationName: string;
  lat: number;
  lng: number;
  distanceMiles?: number;
  postedTimeAgo: string;
  urgency: 'Immediate' | 'Today' | 'Flexible';
  requirements: string[];
  clientName: string;
  contactNumber?: string;
  status: 'available' | 'applied' | 'assigned';
  isUserCreated?: boolean;
}

import { GigPostItem, CreatedGigItem } from '../types';

/**
 * Calculates distance in miles between two coordinates using the Haversine formula
 */
export function calculateDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in statute miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

interface BaseGigTemplate {
  id: string;
  title: string;
  trade: string;
  description: string;
  budget: string;
  offsetMilesNorth: number;
  offsetMilesEast: number;
  postedTimeAgo: string;
  urgency: 'Immediate' | 'Today' | 'Flexible';
  requirements: string[];
  clientName: string;
  locationArea: string;
}

const GIG_TEMPLATES: BaseGigTemplate[] = [];
/**
 * Generates available gig posts around the user's location,
 * merging user-created gigs and template gigs with computed miles distance.
 */
export function getAvailableGigPosts(
  userLat: number,
  userLng: number,
  userLocationName?: string,
  createdGigs: CreatedGigItem[] = []
): GigPostItem[] {
  // Approximate conversion: 1 degree latitude ~= 69 miles
  // 1 degree longitude ~= 69 * cos(lat) miles
  const milesPerDegreeLat = 69.0;
  const milesPerDegreeLng = 69.0 * Math.max(0.1, Math.cos((userLat * Math.PI) / 180));

  const templateGigs: GigPostItem[] = GIG_TEMPLATES.map((tmpl) => {
    const lat = userLat + tmpl.offsetMilesNorth / milesPerDegreeLat;
    const lng = userLng + tmpl.offsetMilesEast / milesPerDegreeLng;
    const distanceMiles = calculateDistanceMiles(userLat, userLng, lat, lng);

    return {
      id: tmpl.id,
      title: tmpl.title,
      trade: tmpl.trade,
      description: tmpl.description,
      budget: tmpl.budget,
      locationName: tmpl.locationArea,
      lat,
      lng,
      distanceMiles,
      postedTimeAgo: tmpl.postedTimeAgo,
      urgency: tmpl.urgency,
      requirements: tmpl.requirements,
      clientName: tmpl.clientName,
      status: 'available',
      isUserCreated: false,
    };
  });

  // Convert user created gigs into GigPostItem
  const userGigs: GigPostItem[] = createdGigs.map((cg) => {
    const distanceMiles = calculateDistanceMiles(userLat, userLng, cg.lat, cg.lng);
    return {
      id: cg.id,
      title: cg.title,
      trade: 'General Handyman & Casual Gig',
      description: cg.description,
      budget: cg.budget,
      locationName: cg.location || userLocationName || 'Nearby Location',
      lat: cg.lat,
      lng: cg.lng,
      distanceMiles,
      postedTimeAgo: 'Just now',
      urgency: 'Immediate',
      requirements: ['Basic tools & casual work experience'],
      clientName: 'You (Posted Gig)',
      status: 'available',
      isUserCreated: true,
    };
  });

  // Combine user gigs first, then template gigs, sorted by distance ascending
  const all = [...userGigs, ...templateGigs].sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0));
  return all;
}

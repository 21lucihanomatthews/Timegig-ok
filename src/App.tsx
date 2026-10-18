import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GPSLocation, TileLayerType, CreatedGigItem, SavedMarker, GigPostItem } from './types';
import { MapView } from './components/MapView';
import { UserProfileView, UserProfileData } from './components/UserProfileView';
import { 
  Search, Flame, UserCheck, X, MapPin, Briefcase, CheckCircle2, 
  ArrowLeft, AlertCircle, Check, Sliders, Clock, ShieldCheck, 
  ChevronRight, Compass, Plus, Sparkles, Power, User
} from 'lucide-react';
import { 
  saveCreatedGigToStorage, 
  loadCreatedGigsFromStorage, 
  loadProfileFromStorage,
  loadWorkRadiusFromStorage,
  saveWorkRadiusToStorage,
  deleteCreatedGigFromStorage
} from './utils/storage';
import { getAvailableGigPosts, calculateDistanceMiles } from './utils/gigPosts';

export default function App() {
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<{ lat: number; lng: number; zoom: number } | null>({
    lat: -26.2041,
    lng: 28.0473,
    zoom: 13,
  });
  const [activeTab, setActiveTab] = useState<'seekers' | 'gigs' | 'feed' | 'activation' | 'profile'>('gigs');
  const [tileLayer, setTileLayer] = useState<TileLayerType>('osm');

  // Search state for Map Location
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  // User set work radius in miles (stored in persistent storage)
  const [workRadiusMiles, setWorkRadiusMiles] = useState<number>(() => loadWorkRadiusFromStorage(15));
  const [isRadiusControlOpen, setIsRadiusControlOpen] = useState<boolean>(false);

  // Quick nearby gigs drawer (toggled by small icon under zoom)
  const [isNearbyDrawerOpen, setIsNearbyDrawerOpen] = useState<boolean>(false);

  // Selected gig for full view & applying
  const [selectedGig, setSelectedGig] = useState<GigPostItem | null>(null);
  const [appliedGigIds, setAppliedGigIds] = useState<string[]>([]);
  const [applicationNotice, setApplicationNotice] = useState<string | null>(null);

  // User Profile & Face Photo Avatar for bottom menu bar logo
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [userAvatar, setUserAvatar] = useState<string>('');

  // Create Gig Modal state
  const [isCreateGigOpen, setIsCreateGigOpen] = useState<boolean>(false);
  const [gigTitle, setGigTitle] = useState<string>('');
  const [gigDesc, setGigDesc] = useState<string>('');
  const [gigBudget, setGigBudget] = useState<string>('');
  const [gigTimeType, setGigTimeType] = useState<'immediately' | 'scheduled'>('immediately');
  const [gigDate, setGigDate] = useState<string>('');
  const [gigTime, setGigTime] = useState<string>('');
  const [gigLocationMode, setGigLocationMode] = useState<'automatic' | 'manual'>('automatic');
  const [gigLocation, setGigLocation] = useState<string>('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState<boolean>(false);
  const [liveLocationSuggestions, setLiveLocationSuggestions] = useState<string[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState<boolean>(false);
  const [createdGigs, setCreatedGigs] = useState<CreatedGigItem[]>([]);

  const POPULAR_LOCATIONS = [
    // Provinces
    'Gauteng (Province)',
    'Western Cape (Province)',
    'KwaZulu-Natal (Province)',
    'Eastern Cape (Province)',
    'Free State (Province)',
    'Limpopo (Province)',
    'Mpumalanga (Province)',
    'North West (Province)',
    'Northern Cape (Province)',
    // Major Cities & Regions
    'Johannesburg, Gauteng',
    'Pretoria, Gauteng',
    'Cape Town, Western Cape',
    'Durban, KwaZulu-Natal',
    'Gqeberha (Port Elizabeth), Eastern Cape',
    'Bloemfontein, Free State',
    'Polokwane, Limpopo',
    'Nelspruit (Mbombela), Mpumalanga',
    'Rustenburg, North West',
    'Kimberley, Northern Cape',
    'Pietermaritzburg, KwaZulu-Natal',
    'East London, Eastern Cape',
    'Stellenbosch, Western Cape',
    // Suburbs & Areas (Johannesburg)
    'Sandton, Johannesburg, Gauteng',
    'Rosebank, Johannesburg, Gauteng',
    'Fourways, Johannesburg, Gauteng',
    'Braamfontein, Johannesburg, Gauteng',
    'Randburg, Johannesburg, Gauteng',
    'Midrand, Johannesburg, Gauteng',
    'Soweto, Johannesburg, Gauteng',
    'Melville, Johannesburg, Gauteng',
    'Parkhurst, Johannesburg, Gauteng',
    'Bedfordview, Johannesburg, Gauteng',
    'Greenstone, Johannesburg, Gauteng',
    'Kempton Park, Johannesburg, Gauteng',
    'Centurion, Pretoria, Gauteng',
    'Hatfield, Pretoria, Gauteng',
    'Menlyn, Pretoria, Gauteng',
    // Suburbs & Areas (Cape Town)
    'Camps Bay, Cape Town, Western Cape',
    'Sea Point, Cape Town, Western Cape',
    'Green Point, Cape Town, Western Cape',
    'Claremont, Cape Town, Western Cape',
    'Constantia, Cape Town, Western Cape',
    'Bellville, Cape Town, Western Cape',
    'Somerset West, Western Cape',
    'Century City, Cape Town, Western Cape',
    // Suburbs & Areas (Durban)
    'Umhlanga, Durban, KwaZulu-Natal',
    'Ballito, KwaZulu-Natal',
    'Morningside, Durban, KwaZulu-Natal',
    'Westville, Durban, KwaZulu-Natal',
  ];

  // 60-second waiting for gig acceptance state
  const [waitingGig, setWaitingGig] = useState<GigPostItem | null>(null);
  const [waitingSecondsLeft, setWaitingSecondsLeft] = useState<number>(60);

  // Lady Navigator state
  const [isNavigatorActive, setIsNavigatorActive] = useState<boolean>(false);
  const [navigatorGig, setNavigatorGig] = useState<GigPostItem | null>(null);
  const [navigationStep, setNavigationStep] = useState<number>(0);

  // Navigation progress effect & Lady Voice Guidance (Nomvula)
  useEffect(() => {
    if (!isNavigatorActive || !navigatorGig) {
      setNavigationStep(0);
      return;
    }

    const speak = (text: string) => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.95;
          utterance.pitch = 1.1; // Warm female voice pitch
          const voices = window.speechSynthesis.getVoices();
          const femaleVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('victoria') || v.lang.startsWith('en'));
          if (femaleVoice) utterance.voice = femaleVoice;
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn('Speech synthesis error:', e);
        }
      }
    };

    if (navigationStep === 0) {
      speak(`Hello, I am Nomvula, your AI navigator. Navigating to ${navigatorGig.title} at ${navigatorGig.locationName}. Let's go!`);
    } else if (navigationStep === 1) {
      speak("Turn right in 150 meters onto Main Street.");
    } else if (navigationStep === 2) {
      speak("Continue straight across the intersection. You are making great progress.");
    } else if (navigationStep === 3) {
      speak("Almost there. Turn left onto the destination street.");
    } else if (navigationStep >= 4) {
      speak(`You have arrived at ${navigatorGig.locationName} for ${navigatorGig.title}. Ready to complete gig!`);
    }

    const interval = setInterval(() => {
      setNavigationStep(prev => (prev < 4 ? prev + 1 : 4));
    }, 4000);
    return () => clearInterval(interval);
  }, [isNavigatorActive, navigatorGig, navigationStep]);

  // Edit / Delete gig state & handlers
  const [editingGig, setEditingGig] = useState<CreatedGigItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editBudget, setEditBudget] = useState('');

  const handleDeleteGig = async (gigId: string) => {
    await deleteCreatedGigFromStorage(gigId);
    setCreatedGigs(prev => prev.filter(g => g.id !== gigId));
    setApplicationNotice('Gig post deleted successfully.');
    setTimeout(() => setApplicationNotice(null), 4000);
  };

  const handleStartEditGig = (gig: GigPostItem) => {
    const original = createdGigs.find(g => g.id === gig.id);
    if (original) {
      setEditingGig(original);
      setEditTitle(original.title);
      setEditDesc(original.description);
      setEditBudget(original.budget);
    }
  };

  const handleSaveEditGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGig) return;
    const updated: CreatedGigItem = {
      ...editingGig,
      title: editTitle.trim(),
      description: editDesc.trim(),
      budget: editBudget.trim().startsWith('R') ? editBudget.trim() : `R ${editBudget.trim()}`,
    };
    await saveCreatedGigToStorage(updated);
    setCreatedGigs(prev => prev.map(g => g.id === updated.id ? updated : g));
    setEditingGig(null);
    setApplicationNotice('Gig post updated successfully!');
    setTimeout(() => setApplicationNotice(null), 4000);
  };

  const hasCenteredInitiallyRef = useRef<boolean>(false);

  // Load created gigs and user profile on mount
  useEffect(() => {
    loadCreatedGigsFromStorage().then(setCreatedGigs).catch(console.warn);
    loadProfileFromStorage().then(p => {
      if (p) {
        setUserProfile(p);
        if (p.avatar) setUserAvatar(p.avatar);
      }
    }).catch(console.warn);

    const handleAvatarUpdate = (e: any) => {
      if (e.detail && typeof e.detail === 'string') {
        setUserAvatar(e.detail);
      }
    };
    window.addEventListener('timegig_avatar_updated', handleAvatarUpdate);
    return () => window.removeEventListener('timegig_avatar_updated', handleAvatarUpdate);
  }, []);

  // Request user GPS location immediately on app start
  useEffect(() => {
    if (!navigator.geolocation) return;

    const updatePosition = (position: GeolocationPosition) => {
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
        setFlyToCoords({ lat: latitude, lng: longitude, zoom: 14 });
        hasCenteredInitiallyRef.current = true;
      }
    };

    navigator.geolocation.getCurrentPosition(
      updatePosition,
      (err) => console.warn('Geolocation initial error:', err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    const watchId = navigator.geolocation.watchPosition(
      updatePosition,
      (err) => console.warn('Geolocation watch error:', err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Determine user center coordinate
  const userLat = currentLocation?.lat ?? -26.2041;
  const userLng = currentLocation?.lng ?? 28.0473;

  // Compute all available gig posts nearby user location
  const allAvailableGigs = useMemo(() => {
    return getAvailableGigPosts(userLat, userLng, currentLocation?.address, createdGigs);
  }, [userLat, userLng, currentLocation?.address, createdGigs]);

  // Filter only available gig posts within the user's set miles
  const inRangeGigs = useMemo(() => {
    return allAvailableGigs.filter(g => (g.distanceMiles ?? 0) <= workRadiusMiles);
  }, [allAvailableGigs, workRadiusMiles]);

  // Convert all available gigs to MapView markers so they show up at their exact location
  const gigMarkers: SavedMarker[] = useMemo(() => {
    return allAvailableGigs.map(g => ({
      id: g.id,
      lat: g.lat,
      lng: g.lng,
      title: `${g.title} (${g.budget})`,
      category: 'work',
      notes: `${g.trade} • ${g.locationName} • ${g.description}`,
      timestamp: Date.now(),
      address: g.locationName,
    }));
  }, [allAvailableGigs]);

  // Handle radius update
  const handleSetWorkRadius = (miles: number) => {
    setWorkRadiusMiles(miles);
    saveWorkRadiusToStorage(miles);
  };

  // Handle Search Location submit
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=6`, {
        headers: { 'Accept-Language': 'en' }
      });
      const data = await res.json();
      setSearchResults(data);
      setShowDropdown(true);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (latStr: string, lonStr: string) => {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    setFlyToCoords({ lat, lng: lon, zoom: 14 });
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleResetToUserLocation = () => {
    if (currentLocation) {
      setFlyToCoords({ lat: currentLocation.lat, lng: currentLocation.lng, zoom: 15 });
    }
  };

  // Small icon under zoom clicked: shows all gigs available nearby
  const handleShowNearbyGigs = () => {
    setIsNearbyDrawerOpen(prev => !prev);
    if (inRangeGigs.length > 0 && currentLocation) {
      setFlyToCoords({ lat: currentLocation.lat, lng: currentLocation.lng, zoom: 13 });
    }
  };

  // Publish a new gig
  const handlePublishGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gigTitle.trim() || !gigDesc.trim() || !gigBudget.trim()) return;

    const formattedBudget = gigBudget.trim().startsWith('R') ? gigBudget.trim() : `R ${gigBudget.trim()}`;
    let lat = currentLocation ? currentLocation.lat : -26.2041;
    let lng = currentLocation ? currentLocation.lng : 28.0473;
    
    const timeScheduleStr = gigTimeType === 'immediately' ? 'Immediately (Now)' : `${gigDate || 'Today'} at ${gigTime || '12:00'}`;
    let locName = gigLocationMode === 'automatic'
      ? (currentLocation?.address || 'Current Operating Area (GPS)')
      : (gigLocation.trim() || 'Manual Location');

    if (gigLocationMode === 'manual' && gigLocation.trim()) {
      locName = gigLocation.trim();
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(gigLocation)}&limit=1`, {
          headers: { 'Accept-Language': 'en' }
        });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
        }
      } catch (err) {
        console.warn('Geocoding manual location error:', err);
      }
    }

    const newGig: CreatedGigItem = {
      id: 'gig_' + Date.now(),
      title: gigTitle.trim(),
      description: gigDesc.trim(),
      budget: formattedBudget,
      location: locName,
      lat,
      lng,
      timestamp: Date.now(),
      status: 'open',
      timeSchedule: timeScheduleStr,
      locationMode: gigLocationMode,
    };

    await saveCreatedGigToStorage(newGig);
    setCreatedGigs(prev => [newGig, ...prev]);
    setIsCreateGigOpen(false);
    setFlyToCoords({ lat, lng, zoom: 14 });
    setGigTitle('');
    setGigDesc('');
    setGigBudget('');
    setGigTimeType('immediately');
    setGigDate('');
    setGigTime('');
    setGigLocationMode('automatic');
    setGigLocation('');
    setShowLocationSuggestions(false);
    setApplicationNotice(`Your casual gig "${newGig.title}" was posted successfully at ${locName}!`);
    setTimeout(() => setApplicationNotice(null), 5000);
  };

  // Apply for a gig (Triggers 60s waiting acceptance)
  const handleApplyForGig = (gig: GigPostItem) => {
    if (!userProfile?.isLocked) {
      alert('Please complete and verify your profile with a face picture, ID document, and trade experience first before applying for casual gigs.');
      setActiveTab('profile');
      setSelectedGig(null);
      setIsNearbyDrawerOpen(false);
      return;
    }

    setWaitingGig(gig);
    setWaitingSecondsLeft(60);
    setSelectedGig(null);
    setIsNearbyDrawerOpen(false);
  };

  // 60-second waiting for acceptance timer effect
  useEffect(() => {
    if (!waitingGig) return;

    if (waitingSecondsLeft <= 0) {
      const accepted = waitingGig;
      setWaitingGig(null);
      setAppliedGigIds(prev => [...prev, accepted.id]);
      setNavigatorGig(accepted);
      setIsNavigatorActive(true);
      setActiveTab('gigs');
      setFlyToCoords({ lat: accepted.lat, lng: accepted.lng, zoom: 16 });
      return;
    }

    const timer = setTimeout(() => {
      setWaitingSecondsLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [waitingGig, waitingSecondsLeft]);

  const handleAcceptanceDemo = () => {
    if (!waitingGig) return;
    const accepted = waitingGig;
    setWaitingGig(null);
    setAppliedGigIds(prev => [...prev, accepted.id]);
    setNavigatorGig(accepted);
    setIsNavigatorActive(true);
    setActiveTab('gigs');
    setFlyToCoords({ lat: accepted.lat, lng: accepted.lng, zoom: 16 });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 m-0 p-0 font-sans flex flex-col">
      {/* ------------------------------------------------------------- */}
      {/* MAP BACKGROUND FOR PROFILE VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'profile' && (
        <div className="absolute inset-0 z-20">
          <div className="absolute inset-0 z-0">
            <MapView
              currentLocation={currentLocation}
              savedMarkers={[]}
              historyPoints={[]}
              tileLayer={tileLayer}
              setTileLayer={setTileLayer}
              onMapClick={() => {}}
              flyToCoords={flyToCoords}
              hideZoomControls={true}
            />
            <div className="absolute inset-0 bg-white/70 backdrop-blur-md z-10" />
          </div>
          <div className="relative z-20 h-full overflow-y-auto">
            <UserProfileView
              onBackToGigs={() => setActiveTab('gigs')}
              currentLocation={currentLocation}
              onProfileUpdated={(updated) => {
                setUserProfile(updated);
                if (updated.avatar) setUserAvatar(updated.avatar);
              }}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SEEKERS VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'seekers' && (
        <div className="absolute inset-0 z-20">
          <div className="absolute inset-0 z-0">
            <MapView
              currentLocation={currentLocation}
              savedMarkers={[]}
              historyPoints={[]}
              tileLayer={tileLayer}
              setTileLayer={setTileLayer}
              onMapClick={() => {}}
              flyToCoords={flyToCoords}
              hideZoomControls={true}
            />
            <div className="absolute inset-0 bg-white/70 backdrop-blur-md z-10" />
          </div>
          <div className="relative z-20 h-full overflow-y-auto flex-1 p-6 pt-16 text-center text-slate-500">
            <h2 className="text-xl font-bold text-slate-900 mt-10">Seekers Feature</h2>
            <p className="text-sm">This feature is currently being re-implemented.</p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SEARCH BAR (Used for Gigs, Nearby, and Seekers) */}
      {/* ------------------------------------------------------------- */}
      {(activeTab === 'gigs' || activeTab === 'feed' || activeTab === 'seekers') && (
        <div className="absolute top-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[540px] z-30 space-y-2">
          {/* Main search and radius pill */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden">
            <form onSubmit={handleSearchSubmit} className="flex items-center">
              <div className="pl-3.5 text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) setShowDropdown(false);
                }}
                placeholder="Search area, town, or city in South Africa..."
                className="w-full py-2.5 px-3 text-xs sm:text-sm font-medium text-slate-900 bg-transparent focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); setShowDropdown(false); }}
                  className="pr-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shrink-0"
              >
                {isSearching ? '...' : 'Search'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAP VIEW (With Zoom Controls & Nearby Gigs Icon) */}
      {/* ------------------------------------------------------------- */}
      <div className={`flex-1 relative w-full h-full pb-16 z-10 ${activeTab === 'profile' || activeTab === 'seekers' ? 'hidden' : 'block'}`}>
        <MapView
          currentLocation={currentLocation}
          savedMarkers={gigMarkers}
          historyPoints={[]}
          tileLayer={tileLayer}
          setTileLayer={setTileLayer}
          onMapClick={() => {}}
          flyToCoords={flyToCoords}
          hideZoomControls={Boolean(searchQuery.trim() || showDropdown)}
          onResetToUserLocation={handleResetToUserLocation}
          onCreateGig={() => setIsCreateGigOpen(true)}
          workRadiusMiles={workRadiusMiles}
          onShowNearbyGigs={handleShowNearbyGigs}
          nearbyGigsCount={inRangeGigs.length}
          activeNavigationRoute={isNavigatorActive && navigatorGig ? {
            startLat: userLat,
            startLng: userLng,
            endLat: navigatorGig.lat,
            endLng: navigatorGig.lng,
          } : null}
          navigationStep={navigationStep}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* NEARBY GIGS DRAWER (Triggered by Map Button) */}
      {/* ------------------------------------------------------------- */}
      {isNearbyDrawerOpen && activeTab === 'gigs' && (
        <div className="absolute inset-0 z-40 bg-white/95 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
            <h3 className="text-xs font-bold">All Available GiGs ({allAvailableGigs.length})</h3>
            <button
              onClick={() => setIsNearbyDrawerOpen(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 pb-20">
            {allAvailableGigs.map((gig) => {
              const isApplied = appliedGigIds.includes(gig.id);
              const isUserPosted = gig.isUserCreated || createdGigs.some(cg => cg.id === gig.id);
              return (
                <div
                  key={gig.id}
                  className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          {gig.trade}
                        </span>
                        {isUserPosted && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Your Gig
                          </span>
                        )}
                      </div>
                      <h2 className="text-xs font-bold text-slate-900">{gig.title}</h2>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      {gig.budget} ZAR
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">{gig.description}</p>
                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-medium">{gig.locationName} • {gig.distanceMiles} mi</span>
                    {isUserPosted ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEditGig(gig)}
                          className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteGig(gig.id)}
                          className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApplyForGig(gig)}
                        disabled={isApplied}
                        className={`px-3 py-1 rounded-xl text-[10px] font-bold ${
                          isApplied
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {isApplied ? 'Applied ✓' : 'Apply for Gig'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PINNED BOTTOM MENU BAR (Seekers, GiGs, Nearby GiGs, and Profile) */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-2.5 px-6 flex items-center justify-around shrink-0">
        {/* Tab: Activation */}
        <button onClick={() => setActiveTab('activation')} className={`flex flex-col items-center gap-1 ${activeTab === 'activation' ? 'text-slate-950 font-bold' : 'text-slate-950'}`}>
          <Power className="w-6 h-6" />
          <span className="text-[10px]">Activation</span>
        </button>

        {/* Tab: Nearby */}
        <button onClick={() => setActiveTab('feed')} className={`flex flex-col items-center gap-1 relative ${activeTab === 'feed' ? 'text-slate-950 font-bold' : 'text-slate-950'}`}>
          <Briefcase className="w-6 h-6" />
          {allAvailableGigs.length > 0 && <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white"> {allAvailableGigs.length} </span>}
          <span className="text-[10px]">Nearby</span>
        </button>

        {/* Tab: GiGs */}
        <button onClick={() => setActiveTab('gigs')} className={`flex flex-col items-center gap-1 ${activeTab === 'gigs' ? 'text-rose-600 font-bold' : 'text-rose-600'}`}>
          <Flame className="w-10 h-10" />
          <span className="text-[10px]">GiGs</span>
        </button>

        {/* Tab: Seekers */}
        <button onClick={() => setActiveTab('seekers')} className={`flex flex-col items-center gap-1 ${activeTab === 'seekers' ? 'text-slate-950 font-bold' : 'text-slate-950'}`}>
          <UserCheck className="w-6 h-6" />
          <span className="text-[10px]">Seekers</span>
        </button>

        {/* Tab: Profile */}
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-slate-950 font-bold' : 'text-slate-950'}`}>
          <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-300">
            {userAvatar ? <img src={userAvatar} className="w-full h-full object-cover" alt="Profile" /> : <User className="w-full h-full" />}
          </div>
          <span className="text-[10px]">Profile</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ACTIVATION VIEW */}
      {/* ------------------------------------------------------------- */}
      {/* ------------------------------------------------------------- */}
      {/* NEARBY GIGS VIEW (Matching Seekers look) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'feed' && (
        <div className="absolute inset-0 z-20">
          <div className="absolute inset-0 z-0">
            <MapView
              currentLocation={currentLocation}
              savedMarkers={[]}
              historyPoints={[]}
              tileLayer={tileLayer}
              setTileLayer={setTileLayer}
              onMapClick={() => {}}
              flyToCoords={flyToCoords}
              hideZoomControls={true}
            />
            <div className="absolute inset-0 bg-white/70 backdrop-blur-md z-10" />
          </div>
          <div className="relative z-20 h-full overflow-y-auto flex-1 p-3 pt-16 space-y-2.5 pb-24">
            <h2 className="text-sm font-bold text-slate-900 text-center">All Available GiGs ({allAvailableGigs.length})</h2>
            {allAvailableGigs.map((gig) => {
              const isApplied = appliedGigIds.includes(gig.id);
              const isUserPosted = gig.isUserCreated || createdGigs.some(cg => cg.id === gig.id);
              return (
                <div key={gig.id} className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">{gig.trade}</span>
                        {isUserPosted && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Your Gig
                          </span>
                        )}
                      </div>
                      <h2 className="text-xs font-bold text-slate-900">{gig.title}</h2>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">{gig.budget} ZAR</span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">{gig.description}</p>
                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-medium">{gig.locationName} • {gig.distanceMiles} mi</span>
                    {isUserPosted ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEditGig(gig)}
                          className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteGig(gig.id)}
                          className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApplyForGig(gig)}
                        disabled={isApplied}
                        className={`px-3 py-1 rounded-xl text-[10px] font-bold ${isApplied ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                      >
                        {isApplied ? 'Applied ✓' : 'Apply for Gig'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ACTIVATION VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'activation' && (
        <div className="absolute inset-0 z-20">
          <div className="absolute inset-0 z-0">
            <MapView
              currentLocation={currentLocation}
              savedMarkers={[]}
              historyPoints={[]}
              tileLayer={tileLayer}
              setTileLayer={setTileLayer}
              onMapClick={() => {}}
              flyToCoords={flyToCoords}
              hideZoomControls={true}
            />
            <div className="absolute inset-0 bg-white/70 backdrop-blur-md z-10" />
          </div>
          <div className="relative z-20 h-full overflow-y-auto flex-1 p-6 pt-16 text-center text-slate-500">
            <h2 className="text-xl font-bold text-slate-900 mt-10">Activation Feature</h2>
            <p className="text-sm">This feature is currently being re-implemented.</p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CREATE GIG MODAL */}
      {/* ------------------------------------------------------------- */}
      {isCreateGigOpen && (
        <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Post a New Gig</h3>
                <p className="text-xs text-slate-500">Create a casual gig within your working radius</p>
              </div>
              <button
                onClick={() => setIsCreateGigOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublishGig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gig Title</label>
                <input
                  type="text"
                  required
                  value={gigTitle}
                  onChange={(e) => setGigTitle(e.target.value)}
                  placeholder="e.g., Plumbing Repair or Garden Maintenance"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description & Requirements</label>
                <textarea
                  required
                  rows={3}
                  value={gigDesc}
                  onChange={(e) => setGigDesc(e.target.value)}
                  placeholder="Describe the task, tools needed, and estimated duration..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Budget (ZAR)</label>
                <input
                  type="text"
                  required
                  value={gigBudget}
                  onChange={(e) => setGigBudget(e.target.value)}
                  placeholder="e.g., R 450"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Time & Date Option */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Gig Time & Date</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGigTimeType('immediately')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      gigTimeType === 'immediately'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Immediately (Now)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGigTimeType('scheduled')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      gigTimeType === 'scheduled'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Set Date & Time
                  </button>
                </div>

                {gigTimeType === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Date</label>
                      <input
                        type="date"
                        value={gigDate}
                        onChange={(e) => setGigDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Time</label>
                      <input
                        type="time"
                        value={gigTime}
                        onChange={(e) => setGigTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Location Option */}
              <div className="space-y-2 relative">
                <label className="block text-xs font-bold text-slate-700">Gig Location</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGigLocationMode('automatic');
                      setGigLocation('');
                      setShowLocationSuggestions(false);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      gigLocationMode === 'automatic'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Automatic (GPS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGigLocationMode('manual')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      gigLocationMode === 'manual'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Type & Suggestions
                  </button>
                </div>

                {gigLocationMode === 'manual' && (
                  <div className="relative pt-1 animate-in fade-in duration-200">
                    <input
                      type="text"
                      value={gigLocation}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGigLocation(val);
                        setShowLocationSuggestions(true);
                        if (val.trim().length >= 2) {
                          setIsSearchingLocation(true);
                          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=6`)
                            .then(res => res.json())
                            .then(data => {
                              if (Array.isArray(data)) {
                                setLiveLocationSuggestions(data.map((item: any) => item.display_name));
                              }
                            })
                            .catch(() => {})
                            .finally(() => setIsSearchingLocation(false));
                        } else {
                          setLiveLocationSuggestions([]);
                        }
                      }}
                      onFocus={() => setShowLocationSuggestions(true)}
                      placeholder="Type any place, area, province, city..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />

                    {showLocationSuggestions && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto z-50 divide-y divide-slate-100">
                        {isSearchingLocation && (
                          <div className="px-4 py-2.5 text-[11px] text-slate-400 italic flex items-center gap-2">
                            <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            Searching places, areas & provinces...
                          </div>
                        )}
                        {Array.from(new Set([
                          ...liveLocationSuggestions,
                          ...POPULAR_LOCATIONS.filter(loc => loc.toLowerCase().includes(gigLocation.toLowerCase()))
                        ])).map((sugg, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setGigLocation(sugg);
                              setShowLocationSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium flex items-center justify-between"
                          >
                            <span className="truncate pr-2">📍 {sugg}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">Select</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateGigOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  Publish Gig
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* EDIT GIG MODAL */}
      {/* ------------------------------------------------------------- */}
      {editingGig && (
        <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Gig Post</h3>
                <p className="text-xs text-slate-500">Update your gig details</p>
              </div>
              <button
                onClick={() => setEditingGig(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditGig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gig Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description & Requirements</label>
                <textarea
                  required
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Budget (ZAR)</label>
                <input
                  type="text"
                  required
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingGig(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 60-SECOND WAITING FOR ACCEPTANCE MODAL (Circular Loader) */}
      {/* ------------------------------------------------------------- */}
      {waitingGig && (
        <div className="absolute inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl border border-slate-200 text-center space-y-6 animate-in zoom-in-95 duration-200">
            {/* Circular Loading Ring */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-100"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-blue-600 transition-all duration-1000"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (1 - waitingSecondsLeft / 60)}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-slate-900">{waitingSecondsLeft}s</span>
                <span className="text-[10px] font-bold text-slate-400">WAITING</span>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Waiting for Gig Owner</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Reviewing your profile and application for <span className="font-semibold text-slate-800">"{waitingGig.title}"</span>. Please wait for acceptance...
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleAcceptanceDemo}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-lg transition-all"
              >
                Accept Instantly (Simulate Owner)
              </button>
              <button
                onClick={() => setWaitingGig(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-colors"
              >
                Cancel Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LADY NAVIGATOR OVERLAY (Voice & Turn-by-turn Guidance) */}
      {/* ------------------------------------------------------------- */}
      {isNavigatorActive && navigatorGig && (
        <div className="absolute bottom-20 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] z-40 bg-slate-900/95 backdrop-blur-xl rounded-3xl p-4 shadow-2xl border border-slate-700 text-white flex items-center gap-4 animate-in slide-in-from-bottom duration-300">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-lg overflow-hidden border-2 border-white/20">
              <span className="text-xl font-black">👩🏾</span>
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse" />
          </div>

          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <span>Nomvula (AI Navigator)</span>
              </h4>
              <span className="text-[10px] font-medium text-slate-400">Heading to Owner</span>
            </div>
            <p className="text-xs font-semibold text-white truncate">
              Navigating to <span className="text-blue-300">{navigatorGig.clientName}</span> ({navigatorGig.location})
            </p>
            <p className="text-[11px] text-slate-300">
              "Turn right onto Main Street in 150m. Client is ready for {navigatorGig.title}!"
            </p>
          </div>

          <button
            onClick={() => {
              setIsNavigatorActive(false);
              setNavigatorGig(null);
              setApplicationNotice('You have arrived at the gig owner destination!');
              setTimeout(() => setApplicationNotice(null), 5000);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shrink-0 shadow-md transition-colors"
          >
            Arrived ✓
          </button>
        </div>
      )}
    </div>
  );
};

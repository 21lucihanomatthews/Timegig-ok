import React, { useState } from 'react';
import { GPSLocation, SavedMarker, HistoryPoint, TileLayerType } from '../types';
import { 
  Navigation, Search, MapPin, Layers, Crosshair, Play, Square, 
  Map as MapIcon, Globe, Trash2, Edit3, Compass, ExternalLink, Sparkles, RefreshCw, AlertCircle
} from 'lucide-react';

interface SidebarProps {
  currentLocation: GPSLocation | null;
  isTracking: boolean;
  setIsTracking: (val: boolean) => void;
  isMockMode: boolean;
  setIsMockMode: (val: boolean) => void;
  mockCity: string;
  setMockCity: (city: string) => void;
  savedMarkers: SavedMarker[];
  historyPoints: HistoryPoint[];
  tileLayer: TileLayerType;
  setTileLayer: (layer: TileLayerType) => void;
  onFlyTo: (lat: number, lng: number, zoom?: number) => void;
  onDeleteMarker: (id: string) => void;
  onClearHistory: () => void;
  onSelectSearchLocation: (lat: number, lng: number, name: string) => void;
}

const PRESET_CITIES = [
  { name: 'New York City, USA', lat: 40.7128, lng: -74.0060 },
  { name: 'London, UK', lat: 51.5074, lng: -0.1278 },
  { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Paris, France', lat: 48.8566, lng: 2.3522 },
  { name: 'Sydney, Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Berlin, Germany', lat: 52.5200, lng: 13.4050 },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentLocation,
  isTracking,
  setIsTracking,
  isMockMode,
  setIsMockMode,
  mockCity,
  setMockCity,
  savedMarkers,
  historyPoints,
  tileLayer,
  setTileLayer,
  onFlyTo,
  onDeleteMarker,
  onClearHistory,
  onSelectSearchLocation,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'gps' | 'search' | 'pins' | 'layers'>('gps');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`, {
        headers: {
          'Accept-Language': 'en'
        }
      });
      const data = await res.json();
      setSearchResults(data);
      if (data.length === 0) {
        setSearchError('No locations found matching your query.');
      }
    } catch (err) {
      setSearchError('Failed to search locations. Check network connection.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <aside className="w-full lg:w-96 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 shadow-sm z-20 overflow-hidden">
      {/* Sub-navigation tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1 shrink-0">
        <button
          onClick={() => setActiveSubTab('gps')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            activeSubTab === 'gps' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
          <span>GPS & Location</span>
        </button>
        <button
          onClick={() => setActiveSubTab('search')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            activeSubTab === 'search' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-blue-600" />
          <span>Search</span>
        </button>
        <button
          onClick={() => setActiveSubTab('pins')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            activeSubTab === 'pins' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-amber-600" />
          <span>Pins ({savedMarkers.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('layers')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            activeSubTab === 'layers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>Layers</span>
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* TAB 1: GPS & Location Inspector */}
        {activeSubTab === 'gps' && (
          <div className="space-y-6">
            {/* Tracking Controls */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Live GPS Tracking</h3>
                  <p className="text-xs text-slate-500">Real-time device position via browser geolocation</p>
                </div>
                <button
                  onClick={() => setIsTracking(!isTracking)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-xs ${
                    isTracking 
                      ? 'bg-rose-600 text-white hover:bg-rose-700' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isTracking ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isTracking ? 'Stop Tracking' : 'Start Tracking'}</span>
                </button>
              </div>

              {/* Mock Location Toggle */}
              <div className="pt-3 border-t border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Simulate Location (Demo)</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isMockMode} 
                      onChange={(e) => setIsMockMode(e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                {isMockMode && (
                  <div className="space-y-2 pt-1">
                    <label className="text-xs text-slate-500 block">Select Demo City:</label>
                    <select
                      value={mockCity}
                      onChange={(e) => {
                        setMockCity(e.target.value);
                        const city = PRESET_CITIES.find(c => c.name === e.target.value);
                        if (city) onFlyTo(city.lat, city.lng, 14);
                      }}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      {PRESET_CITIES.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Coordinates Telemetry Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exact Coordinates</span>
                <span className="text-xs text-slate-400 font-mono">
                  {currentLocation ? new Date(currentLocation.timestamp).toLocaleTimeString() : 'Waiting...'}
                </span>
              </div>

              {currentLocation ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 block font-medium">LATITUDE</span>
                      <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                        {currentLocation.lat.toFixed(6)}°
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 block font-medium">LONGITUDE</span>
                      <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                        {currentLocation.lng.toFixed(6)}°
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 block font-medium">ACCURACY</span>
                      <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                        ±{Math.round(currentLocation.accuracy)}m
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 block font-medium">ALTITUDE</span>
                      <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                        {currentLocation.altitude != null ? `${Math.round(currentLocation.altitude)}m` : 'N/A'}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 block font-medium">SPEED</span>
                      <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                        {currentLocation.speed != null ? `${(currentLocation.speed * 3.6).toFixed(1)} km/h` : '0 km/h'}
                      </span>
                    </div>
                  </div>

                  {currentLocation.address && (
                    <div className="bg-emerald-50/60 border border-emerald-200/80 p-3 rounded-lg flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 block">REVERSE GEOCODED ADDRESS</span>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed mt-0.5">
                          {currentLocation.address}
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => onFlyTo(currentLocation.lat, currentLocation.lng, 17)}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Center Map on My Location</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <AlertCircle className="w-8 h-8 mx-auto text-amber-500 animate-pulse" />
                  <p className="text-xs">Acquiring satellite / browser GPS signal...</p>
                  <p className="text-[10px] text-slate-400">Ensure location permissions are allowed in your browser.</p>
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-2">
              <div className="font-semibold flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Zero API Cost OpenStreetMap</span>
              </div>
              <p className="text-[11px] leading-relaxed text-blue-800">
                This app runs entirely on OpenStreetMap tiles and Nominatim geocoding with zero API keys or billing fees. Click anywhere on the map to drop custom pins.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: Search Locations */}
        {activeSubTab === 'search' && (
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">Search OpenStreetMap Locations</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search city, address, landmark..."
                  className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
                >
                  {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Search</span>
                </button>
              </div>
            </form>

            {searchError && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {searchError}
              </p>
            )}

            <div className="space-y-2">
              {searchResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    const lat = parseFloat(item.lat);
                    const lon = parseFloat(item.lon);
                    onSelectSearchLocation(lat, lon, item.display_name);
                  }}
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-900 transition-all cursor-pointer shadow-xs space-y-1"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="text-xs font-semibold text-slate-900 leading-snug">
                      {item.display_name}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono pl-6">
                    {parseFloat(item.lat).toFixed(4)}°, {parseFloat(item.lon).toFixed(4)}°
                  </div>
                </div>
              ))}
            </div>

            {searchResults.length === 0 && !isSearching && (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Compass className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">Search any location worldwide using Nominatim OSM geocoder.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Saved Markers */}
        {activeSubTab === 'pins' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Saved Pins ({savedMarkers.length})</span>
              <span className="text-[10px] text-slate-400">Click map to add</span>
            </div>

            {savedMarkers.length > 0 ? (
              <div className="space-y-3">
                {savedMarkers.map((marker) => (
                  <div
                    key={marker.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2 hover:border-slate-400 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          marker.category === 'home' ? 'bg-blue-600' :
                          marker.category === 'work' ? 'bg-indigo-600' :
                          marker.category === 'restaurant' ? 'bg-amber-600' :
                          marker.category === 'sight' ? 'bg-emerald-600' :
                          marker.category === 'alert' ? 'bg-rose-600' : 'bg-slate-700'
                        }`} />
                        <h4 className="text-xs font-bold text-slate-900">{marker.title}</h4>
                      </div>
                      <button
                        onClick={() => onDeleteMarker(marker.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete marker"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {marker.address && (
                      <p className="text-[11px] text-slate-600 line-clamp-1">
                        {marker.address}
                      </p>
                    )}

                    {marker.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-md">
                        "{marker.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {marker.lat.toFixed(4)}°, {marker.lng.toFixed(4)}°
                      </span>
                      <button
                        onClick={() => onFlyTo(marker.lat, marker.lng, 17)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                      >
                        <span>View on Map</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 space-y-3">
                <MapPin className="w-10 h-10 mx-auto text-slate-300" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">No saved pins yet</p>
                  <p className="text-[11px] text-slate-500 mt-1">Click anywhere directly on the OpenStreetMap canvas to drop and save a pin.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Tile Layers & Settings */}
        {activeSubTab === 'layers' && (
          <div className="space-y-4">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Map Tile Styles (No Cost)</span>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'osm', name: 'OpenStreetMap Standard', desc: 'Default OSM tiles' },
                { id: 'topo', name: 'OpenTopoMap', desc: 'Topographic contour lines' },
                { id: 'dark', name: 'CartoDB Dark', desc: 'Dark mode sleek view' },
                { id: 'voyager', name: 'CartoDB Voyager', desc: 'Clean minimalist vector' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setTileLayer(style.id as TileLayerType)}
                  className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                    tileLayer === style.id 
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm' 
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'
                  }`}
                >
                  <span className="text-xs font-bold block">{style.name}</span>
                  <span className={`text-[10px] block ${tileLayer === style.id ? 'text-slate-300' : 'text-slate-500'}`}>
                    {style.desc}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">GPS History Breadcrumbs ({historyPoints.length})</span>
                {historyPoints.length > 0 && (
                  <button
                    onClick={onClearHistory}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                  >
                    Clear History
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {historyPoints.length > 0 
                  ? `Recording movement history path (${historyPoints.length} points recorded).`
                  : 'Start live GPS tracking to record movement path breadcrumbs.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

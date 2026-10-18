import React from 'react';
import { Compass, MapPin, Share2, Layers, Bookmark, History, Info } from 'lucide-react';

interface NavbarProps {
  activeTab: 'map' | 'markers' | 'history' | 'about';
  setActiveTab: (tab: 'map' | 'markers' | 'history' | 'about') => void;
  onExport: () => void;
  isTracking: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onExport, isTracking }) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-slate-200 shadow-xs z-30 relative">
      {/* Zone 1: Wordmark */}
      <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setActiveTab('map')}>
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
          <Compass className="w-5 h-5 text-emerald-400 animate-spin-slow" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
            TerraPulse
          </span>
          <span className="text-xs text-slate-500 font-medium">
            OpenStreetMap GPS
          </span>
        </div>
      </div>

      {/* Zone 2: 4-5 concise single-line text nav links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
        <button
          onClick={() => setActiveTab('map')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
            activeTab === 'map' ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent'
          }`}
        >
          Live Map
        </button>
        <button
          onClick={() => setActiveTab('markers')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
            activeTab === 'markers' ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent'
          }`}
        >
          Saved Pins
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
            activeTab === 'history' ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent'
          }`}
        >
          GPS History
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
            activeTab === 'about' ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent'
          }`}
        >
          About OSM
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        {isTracking && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live GPS Active</span>
          </div>
        )}
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Export Data</span>
        </button>
      </div>
    </header>
  );
};

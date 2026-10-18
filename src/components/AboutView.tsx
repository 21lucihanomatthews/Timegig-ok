import React from 'react';
import { Compass, Globe, ShieldCheck, Zap, MapPin, Code } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-8 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hero Header */}
        <div className="space-y-4 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
            <Globe className="w-3.5 h-3.5" />
            <span>OpenStreetMap Geospatial Architecture</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
            Exact Location Tracking with Zero API Costs
          </h1>
          <p className="text-base text-slate-600 max-w-2xl leading-relaxed">
            TerraPulse is a production-grade geospatial template built entirely on open-source standards—Leaflet, OpenStreetMap tiles, and Nominatim geocoding. No proprietary keys, no tracking rate limits, and zero usage fees.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Leaflet & OSM Engine</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Powered by Leaflet.js rendering OpenStreetMap raster tiles with smooth vector overlays, custom pins, and multi-style tile themes.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Exact GPS & Geolocation</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Utilizes high-accuracy browser geolocation APIs with pulsing accuracy radiuses, altitude, heading, speed telemetry, and offline simulation support.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Code className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">GeoJSON & Data Export</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Seamlessly export saved pins, breadcrumb movement histories, and live coordinates into standard GeoJSON or JSON formats instantly.
            </p>
          </div>
        </div>

        {/* Technical Specification */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6 shadow-xs">
          <h3 className="text-lg font-bold text-slate-900">Technical Stack & Implementation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-600">
            <div className="space-y-3">
              <div className="font-semibold text-slate-900">Frontend Architecture</div>
              <ul className="space-y-2 list-disc pl-5">
                <li>React 19 & TypeScript with modular components</li>
                <li>Tailwind CSS styling and responsive layout</li>
                <li>Leaflet map integration with zero React wrapper friction</li>
                <li>Local storage persistence for user pins and history</li>
              </ul>
            </div>
            <div className="space-y-3">
              <div className="font-semibold text-slate-900">Geospatial Services</div>
              <ul className="space-y-2 list-disc pl-5">
                <li>OpenStreetMap Tile CDN (Standard, Topo, Dark, Voyager)</li>
                <li>Nominatim API for reverse geocoding & address search</li>
                <li>HTML5 Geolocation watchPosition API</li>
                <li>GeoJSON standard feature collection exports</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

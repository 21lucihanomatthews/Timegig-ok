import React, { useState } from 'react';
import { SavedMarker, HistoryPoint, GPSLocation } from '../types';
import { Download, X, Copy, Check, FileJson, Globe } from 'lucide-react';

interface ExportModalProps {
  currentLocation: GPSLocation | null;
  savedMarkers: SavedMarker[];
  historyPoints: HistoryPoint[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  currentLocation,
  savedMarkers,
  historyPoints,
  onClose,
}) => {
  const [exportFormat, setExportFormat] = useState<'json' | 'geojson'>('geojson');
  const [copied, setCopied] = useState(false);

  const generateExportData = () => {
    if (exportFormat === 'geojson') {
      return {
        type: 'FeatureCollection',
        features: [
          ...(currentLocation ? [{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [currentLocation.lng, currentLocation.lat]
            },
            properties: {
              type: 'current_location',
              accuracy: currentLocation.accuracy,
              altitude: currentLocation.altitude,
              speed: currentLocation.speed,
              timestamp: new Date(currentLocation.timestamp).toISOString(),
              address: currentLocation.address
            }
          }] : []),
          ...savedMarkers.map(m => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [m.lng, m.lat]
            },
            properties: {
              type: 'saved_marker',
              id: m.id,
              title: m.title,
              category: m.category,
              notes: m.notes,
              address: m.address,
              timestamp: new Date(m.timestamp).toISOString()
            }
          })),
          ...(historyPoints.length > 0 ? [{
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: historyPoints.map(p => [p.lng, p.lat])
            },
            properties: {
              type: 'gps_history_trail',
              pointCount: historyPoints.length
            }
          }] : [])
        ]
      };
    } else {
      return {
        currentLocation,
        savedMarkers,
        historyPoints,
        exportedAt: new Date().toISOString()
      };
    }
  };

  const jsonString = JSON.stringify(generateExportData(), null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terrapulse-export-${Date.now()}.${exportFormat === 'geojson' ? 'geojson' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Export Location Data</h3>
              <p className="text-[11px] text-slate-500">GeoJSON & JSON formats for OpenStreetMap data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Format:</span>
              <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                <button
                  onClick={() => setExportFormat('geojson')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    exportFormat === 'geojson' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  GeoJSON
                </button>
                <button
                  onClick={() => setExportFormat('json')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    exportFormat === 'json' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Raw JSON
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-96 shadow-inner">
            <pre>{jsonString}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

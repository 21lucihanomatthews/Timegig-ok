import React, { useState } from 'react';
import { MarkerCategory } from '../types';
import { MapPin, X, Check } from 'lucide-react';

interface AddMarkerModalProps {
  lat: number;
  lng: number;
  address?: string;
  onSave: (title: string, category: MarkerCategory, notes: string) => void;
  onClose: () => void;
}

export const AddMarkerModal: React.FC<AddMarkerModalProps> = ({
  lat,
  lng,
  address,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MarkerCategory>('custom');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title, category, notes);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Save Map Location</h3>
              <p className="text-[11px] text-slate-500 font-mono">{lat.toFixed(4)}°, {lng.toFixed(4)}°</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {address && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
              <span className="font-bold block text-[10px] text-slate-500 mb-0.5">LOCATION ADDRESS</span>
              {address}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Pin Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Downtown Office, Scenic Overlook..."
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'home', label: 'Home', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { id: 'work', label: 'Work', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                { id: 'restaurant', label: 'Dining', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                { id: 'sight', label: 'Sight', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { id: 'alert', label: 'Alert', color: 'bg-rose-50 text-rose-700 border-rose-200' },
                { id: 'custom', label: 'Custom', color: 'bg-slate-50 text-slate-700 border-slate-200' },
              ].map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id as MarkerCategory)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                    category === cat.id 
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs' 
                      : `${cat.color} hover:border-slate-400`
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add personal notes, parking info, door codes..."
              rows={3}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Pin</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

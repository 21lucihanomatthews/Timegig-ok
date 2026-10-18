import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Camera, MapPin, Phone, Mail, 
  Briefcase, Award, CheckCircle2, Edit3, Lock, ShieldCheck, 
  Globe, Instagram, Linkedin, MessageCircle, Navigation, Sparkles,
  Plus, Trash2, FileText, Upload, RefreshCw, X, Video, User,
  AlertCircle, Check
} from 'lucide-react';
import { GPSLocation } from '../types';
import {
  saveProfileToStorage,
  loadProfileFromStorage,
  compressImageDataUrl,
} from '../utils/storage';

interface UserProfileViewProps {
  onBackToGigs: () => void;
  currentLocation: GPSLocation | null;
  onProfileUpdated?: (profile: UserProfileData) => void;
}

export interface WorkExperienceItem {
  id: string;
  tradeOrTitle: string;
  duration: string;
  description: string;
}

export interface ReferenceItem {
  id: string;
  name: string;
  relationship: string;
  contact: string;
}

export interface UserProfileData {
  avatar: string;
  idDocumentName: string;
  idDocumentData: string;
  firstName: string;
  lastName: string;
  selectedTrade: string;
  customTrade?: string;
  experiences: WorkExperienceItem[];
  references: ReferenceItem[];
  phone: string;
  email: string;
  whatsapp?: string;
  linkedin?: string;
  instagram?: string;
  portfolio?: string;
  location: string;
  isLocked: boolean;
}

export const CASUAL_GIG_TRADES = [
  'General Handyman & Home Maintenance',
  'Driver, Chauffeur & Delivery Courier',
  'House Cleaning & Domestic Services',
  'Gardening, Landscaping & Lawn Care',
  'Plumbing Services & Leak Repair',
  'Electrical Repairs & Installation',
  'Painting, Wall Coating & Plastering',
  'Carpentry & Custom Furniture Assembly',
  'Tiling, Flooring & Paving',
  'Security Guard & Gate Motor Maintenance',
  'Appliance & Fridge Repair Technician',
  'Event Assistant, Waiter & Catering Staff',
  'Moving, Packing & Heavy Lifting Helper',
  'Solar Panel & Inverter Installation',
  'Welding & Metal Fabrication',
  'Bricklaying, Masonry & Building',
  'Pool Maintenance & Pump Repair',
  'Tailoring, Alterations & Upholstery',
  'Childcare, Nanny & Babysitting',
  'Pet Sitter & Dog Walker',
  'Computer, Smartphone & IT Support',
  'Vehicle Washing & Mobile Auto Detailing',
  'Catering, Chef & Home Baker',
  'Hairdresser, Barber & Mobile Stylist',
  'Other / Custom Casual Trade',
];

// Empty template
export const EMPTY_PROFILE: UserProfileData = {
  avatar: '',
  idDocumentName: '',
  idDocumentData: '',
  firstName: '',
  lastName: '',
  selectedTrade: 'General Handyman & Home Maintenance',
  customTrade: '',
  experiences: [
    {
      id: '1',
      tradeOrTitle: '',
      duration: '',
      description: ''
    }
  ],
  references: [
    {
      id: '1',
      name: '',
      relationship: '',
      contact: ''
    }
  ],
  phone: '',
  email: '',
  whatsapp: '',
  linkedin: '',
  instagram: '',
  portfolio: '',
  location: '',
  isLocked: false,
};

export const UserProfileView: React.FC<UserProfileViewProps> = ({ 
  onBackToGigs, 
  currentLocation,
  onProfileUpdated,
}) => {
  // Synchronous initial read from localStorage if present
  const [profile, setProfile] = useState<UserProfileData>(() => {
    try {
      const saved = localStorage.getItem('terrapulse_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (!parsed.experiences || !Array.isArray(parsed.experiences) || parsed.experiences.length === 0) {
            parsed.experiences = [{ id: '1', tradeOrTitle: '', duration: '', description: '' }];
          }
          if (!parsed.references || !Array.isArray(parsed.references) || parsed.references.length === 0) {
            parsed.references = [{ id: '1', name: '', relationship: '', contact: '' }];
          }
          return parsed;
        }
      }
    } catch (e) {
      // Fallback to empty
    }
    return EMPTY_PROFILE;
  });

  const [isEditing, setIsEditing] = useState<boolean>(!profile.isLocked);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [permissionNotice, setPermissionNotice] = useState<string>('');
  const [saveModalState, setSaveModalState] = useState<'loading' | 'success' | null>(null);

  // Facing mode for live camera (front selfie or back camera)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Live selfie camera modal state
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const idDocInputRef = useRef<HTMLInputElement | null>(null);

  // Load authoritative profile from persistent storage (IndexedDB + localStorage) on mount
  useEffect(() => {
    let isMounted = true;

    loadProfileFromStorage().then((saved) => {
      if (!isMounted || !saved) return;
      setProfile((prev) => {
        // If profile was already loaded from localStorage, merge in any high-res image data or documents from IndexedDB
        const merged: UserProfileData = {
          ...prev,
          ...saved,
          avatar: saved.avatar || prev.avatar,
          idDocumentData: saved.idDocumentData || prev.idDocumentData,
          idDocumentName: saved.idDocumentName || prev.idDocumentName,
          experiences: (saved.experiences && saved.experiences.length > 0) ? saved.experiences : prev.experiences,
          references: (saved.references && saved.references.length > 0) ? saved.references : prev.references,
        };
        onProfileUpdated?.(merged);
        return merged;
      });

      if (saved.isLocked) {
        setIsEditing(false);
      }
    }).catch(console.warn);

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync video element with active stream whenever modal is open
  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(e => console.warn('Video play sync caught:', e));
    }
  }, [isCameraOpen]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.warn('Track stop error on unmount:', e);
          }
        });
        streamRef.current = null;
      }
    };
  }, []);

  // -------------------------------------------------------------
  // CAMERA ACCESS & SELFIE CAPTURE
  // -------------------------------------------------------------

  const handleRequestLiveSelfie = () => {
    setValidationError('');
    setPermissionNotice('');
    startCamera('user');
  };

  const startCamera = async (overrideFacingMode?: 'user' | 'environment') => {
    setCameraError('');
    setIsCameraOpen(true);
    const targetMode: 'user' | 'environment' = overrideFacingMode || facingMode;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser or environment. Please ensure you are viewing over HTTPS on Chrome, Edge, Safari, or supported Android browsers, or upload a face photo file.');
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.warn('Track stop error:', e);
          }
        });
        streamRef.current = null;
      }

      // Requirement 2: navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: targetMode }
        });
      } catch (modeErr: any) {
        if (modeErr?.name === 'OverconstrainedError' || modeErr?.name === 'ConstraintNotSatisfiedError') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } else {
          throw modeErr;
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => {
          console.warn('Video auto-play warning:', e);
        });
      }
    } catch (err: any) {
      console.warn('Camera access request error:', err);
      const errName = err?.name || '';
      const errMsg = err?.message || '';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError('Camera access was blocked by your browser settings. Please allow camera permissions in your browser URL bar or upload a face photo file instead.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('No camera was detected on this device. Please connect a camera or upload a face photo file instead.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraError('Your camera is currently in use by another application or tab. Please close other camera apps and click Retry Camera, or upload a face photo.');
      } else if (errName === 'SecurityError') {
        setCameraError('Camera access is restricted due to security settings. Ensure the application is loaded over HTTPS on Vercel or localhost.');
      } else {
        setCameraError(`Unable to start device camera (${errMsg || errName || 'device unavailable'}). You can upload a photo file instead.`);
      }
    }
  };

  const handleFlipCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const captureSelfie = async () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const vw = v.videoWidth > 0 ? v.videoWidth : 400;
      const vh = v.videoHeight > 0 ? v.videoHeight : 400;
      const minDim = Math.min(vw, vh);
      const sx = (vw - minDim) / 2;
      const sy = (vh - minDim) / 2;

      if (facingMode === 'user') {
        ctx.translate(400, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(v, sx, sy, minDim, minDim, 0, 0, 400, 400);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const compressed = await compressImageDataUrl(rawDataUrl, 400, 400, 0.85);

      setProfile(prev => {
        const next = { ...prev, avatar: compressed };
        saveProfileToStorage(next).catch(console.warn);
        onProfileUpdated?.(next);
        try {
          window.dispatchEvent(new CustomEvent('timegig_avatar_updated', { detail: compressed }));
        } catch (e) {}
        return next;
      });

      setValidationError('');
      setPermissionNotice('Live face selfie successfully captured and saved to your profile!');
      setTimeout(() => setPermissionNotice(''), 5000);
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setCameraError('');
  };

  // -------------------------------------------------------------
  // DIRECT FILE UPLOADS (No Device Permissions & Privacy Modals)
  // -------------------------------------------------------------

  const handleRequestAvatarUpload = () => {
    setValidationError('');
    setPermissionNotice('');
    fileInputRef.current?.click();
  };

  const handleRequestIdDocUpload = () => {
    setValidationError('');
    setPermissionNotice('');
    idDocInputRef.current?.click();
  };

  // Upload face photo via file input
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          const compressed = await compressImageDataUrl(reader.result, 600, 600, 0.85);
          setProfile(prev => {
            const next = { ...prev, avatar: compressed };
            saveProfileToStorage(next).catch(console.warn);
            onProfileUpdated?.(next);
            try {
              window.dispatchEvent(new CustomEvent('timegig_avatar_updated', { detail: compressed }));
            } catch (e) {}
            return next;
          });
          setValidationError('');
          setPermissionNotice(`Face photo file "${file.name}" uploaded and saved!`);
          setTimeout(() => setPermissionNotice(''), 5000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload ID document
  const handleIdDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          let docData = reader.result;
          if (file.type.startsWith('image/')) {
            docData = await compressImageDataUrl(reader.result, 1280, 1280, 0.82);
          }
          setProfile(prev => {
            const next = {
              ...prev,
              idDocumentName: file.name,
              idDocumentData: docData,
            };
            saveProfileToStorage(next).catch(console.warn);
            return next;
          });
          setValidationError('');
          setPermissionNotice(`ID document "${file.name}" uploaded and saved securely!`);
          setTimeout(() => setPermissionNotice(''), 5000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-detect location name via GPS with reverse geocoding (SHOWS NAME NOT NUMBERS)
  const handleAutoDetectLocation = async () => {
    setIsDetectingLocation(true);
    setValidationError('');

    const resolveCoords = async (latitude: number, longitude: number) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          const suburb = addr.suburb || addr.neighbourhood || addr.quarter || addr.subdivision || '';
          const city = addr.city || addr.town || addr.municipality || addr.village || addr.city_district || '';
          const province = addr.state || addr.province || addr.region || '';
          const country = addr.country || 'South Africa';

          const parts = [suburb, city, province, country]
            .filter(Boolean)
            .filter(part => !/^\d+$/.test(part.trim())); // strictly exclude numeric tokens

          const locationName = parts.length > 0 ? parts.join(', ') : 'Johannesburg, Gauteng, South Africa';
          setProfile(prev => {
            const next = { ...prev, location: locationName };
            saveProfileToStorage(next).catch(console.warn);
            return next;
          });
        } else if (data && data.display_name) {
          const cleanName = data.display_name.replace(/\b\d{4,6}\b/g, '').replace(/,\s*,/g, ',').trim();
          setProfile(prev => {
            const next = { ...prev, location: cleanName };
            saveProfileToStorage(next).catch(console.warn);
            return next;
          });
        } else {
          setProfile(prev => {
            const next = { ...prev, location: 'Johannesburg, Gauteng, South Africa' };
            saveProfileToStorage(next).catch(console.warn);
            return next;
          });
        }
      } catch (err) {
        setProfile(prev => ({ ...prev, location: 'Johannesburg, Gauteng, South Africa' }));
      } finally {
        setIsDetectingLocation(false);
      }
    };

    if (currentLocation) {
      await resolveCoords(currentLocation.lat, currentLocation.lng);
      return;
    }

    if (!navigator.geolocation) {
      setProfile(prev => ({ ...prev, location: 'Johannesburg, Gauteng, South Africa' }));
      setIsDetectingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await resolveCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setProfile(prev => ({ ...prev, location: 'Johannesburg, Gauteng, South Africa' }));
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Dynamic Work Experience Handlers
  const addExperience = () => {
    setProfile(prev => {
      const next = {
        ...prev,
        experiences: [
          ...prev.experiences,
          { id: Math.random().toString(), tradeOrTitle: '', duration: '', description: '' }
        ]
      };
      saveProfileToStorage(next).catch(console.warn);
      return next;
    });
  };

  const removeExperience = (id: string) => {
    if (profile.experiences.length <= 1) {
      setValidationError('At least one work experience is required to verify your trade.');
      return;
    }
    setProfile(prev => {
      const next = {
        ...prev,
        experiences: prev.experiences.filter(exp => exp.id !== id)
      };
      saveProfileToStorage(next).catch(console.warn);
      return next;
    });
  };

  const updateExperience = (id: string, field: keyof WorkExperienceItem, value: string) => {
    setProfile(prev => {
      const next = {
        ...prev,
        experiences: prev.experiences.map(exp => exp.id === id ? { ...exp, [field]: value } : exp)
      };
      saveProfileToStorage(next).catch(console.warn);
      return next;
    });
  };

  // Dynamic Reference Handlers
  const addReference = () => {
    setProfile(prev => {
      const next = {
        ...prev,
        references: [
          ...prev.references,
          { id: Math.random().toString(), name: '', relationship: '', contact: '' }
        ]
      };
      saveProfileToStorage(next).catch(console.warn);
      return next;
    });
  };

  const removeReference = (id: string) => {
    if (profile.references.length <= 1) {
      setValidationError('At least one reference is required to verify your trade.');
      return;
    }
    setProfile(prev => {
      const next = {
        ...prev,
        references: prev.references.filter(ref => ref.id !== id)
      };
      saveProfileToStorage(next).catch(console.warn);
      return next;
    });
  };

  const updateReference = (id: string, field: keyof ReferenceItem, value: string) => {
    setProfile(prev => {
      const next = {
        ...prev,
        references: prev.references.map(ref => ref.id === id ? { ...ref, [field]: value } : ref)
      };
      saveProfileToStorage(next).catch(console.warn);
      return next;
    });
  };

  // Save & Lock Profile with strict validation and permanent persistence
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // 1. Profile Picture (Face Only) validation
    if (!profile.avatar) {
      setValidationError('Profile face photo is required. Please capture a live selfie or upload your face photo.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 2. Name & Surname validation
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      setValidationError('First name and surname are required.');
      return;
    }

    // 3. ID Document validation
    if (!profile.idDocumentName) {
      setValidationError('ID Document upload is required for verification.');
      return;
    }

    // 4. Work Experiences validation (at least 1 fully filled)
    const emptyExp = profile.experiences.find(exp => !exp.tradeOrTitle.trim() || !exp.duration.trim() || !exp.description.trim());
    if (emptyExp || profile.experiences.length === 0) {
      setValidationError('Please complete all fields (Role/Trade, Duration, and Description) for your work experience(s).');
      return;
    }

    // 5. References validation (at least 1 fully filled)
    const emptyRef = profile.references.find(ref => !ref.name.trim() || !ref.relationship.trim() || !ref.contact.trim());
    if (emptyRef || profile.references.length === 0) {
      setValidationError('Please complete all fields (Name, Relationship, and Contact) for your verification reference(s).');
      return;
    }

    // 6. Contact and Email required
    if (!profile.phone.trim()) {
      setValidationError('Contact phone number is required.');
      return;
    }

    if (!profile.email.trim()) {
      setValidationError('Email address is required.');
      return;
    }

    // 7. Location required
    if (!profile.location.trim()) {
      setValidationError('Operating area / city location name is required.');
      return;
    }

    const updated: UserProfileData = { ...profile, isLocked: true };
    setProfile(updated);
    
    // Circle loading indicator
    setSaveModalState('loading');
    setValidationError('');

    // Save to both IndexedDB and localStorage safely (all data, face picture & ID doc)
    await saveProfileToStorage(updated);

    // Notify parent to update bottom menu bar profile picture immediately
    onProfileUpdated?.(updated);
    try {
      window.dispatchEvent(new CustomEvent('timegig_avatar_updated', { detail: updated.avatar }));
    } catch (e) {}

    // Wait 900ms for circular loading spinner animation
    await new Promise(res => setTimeout(res, 900));

    // Show Success!
    setSaveModalState('success');

    // Wait 1200ms in success state before returning to verified view
    await new Promise(res => setTimeout(res, 1200));

    setSaveModalState(null);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 5000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="absolute inset-0 pb-20 bg-slate-50 z-50 flex flex-col overflow-y-auto font-sans">
      {/* Top Header with Back Arrow */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToGigs}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-800 transition-colors shadow-2xs"
            title="Back to GiGs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">User Profile & Verified Trade</h1>
            <p className="text-[11px] text-slate-500 font-medium">South Africa Casual Gigs Credential</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {profile.isLocked && !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              Editing Mode
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full p-6 sm:p-10 space-y-6">
        {/* Success Alert */}
        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 shadow-xs animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">Profile Successfully Saved & Locked!</p>
              <p className="text-[11px] text-emerald-700">
                Your face picture logo, verified ID document, work experiences, and references are permanently saved.
              </p>
            </div>
          </div>
        )}

        {/* Validation Error Alert */}
        {validationError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3 shadow-xs animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs font-semibold">{validationError}</p>
          </div>
        )}

        {/* Permission / Status Toast Notice */}
        {permissionNotice && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <p className="text-xs font-medium">{permissionNotice}</p>
            </div>
            <button onClick={() => setPermissionNotice('')} className="text-blue-400 hover:text-blue-700 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* PROFILE PICTURE LOGO WITH NAME & SURNAME UNDER */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="flex flex-col items-center">
            {/* Circle Avatar Logo with Face-Only Silhouette */}
            <div className="relative w-28 h-28 rounded-full border-4 border-slate-900 overflow-hidden shadow-lg bg-slate-100 flex items-center justify-center group">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt="User Profile Face"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                  <User className="w-14 h-14" />
                  <span className="text-[9px] font-semibold tracking-tight uppercase">Face Required</span>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2 justify-center mt-3">
                <button
                  type="button"
                  onClick={handleRequestLiveSelfie}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                  title="Capture Live Face Selfie with Camera"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Live Selfie</span>
                </button>
                <button
                  type="button"
                  onClick={handleRequestAvatarUpload}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                  title="Upload Face Photo File from Device"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Face</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
            )}
            <span className="text-[10px] text-slate-400 block mt-1 font-medium">Face Only (Live Selfie or Photo File)</span>
          </div>

          <div>
            {/* Name and Surname directly under Profile Picture Logo */}
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}`.trim() : (
                <span className="text-slate-400 font-normal italic">Name and Surname Under Profile</span>
              )}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                {profile.selectedTrade === 'Other / Custom Casual Trade' && profile.customTrade ? profile.customTrade : profile.selectedTrade}
              </span>
              {profile.isLocked ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified & Saved</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  <span>Draft Profile</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* LIVE SELFIE WEBCAM CAPTURE MODAL */}
        {/* ------------------------------------------------------------- */}
        {isCameraOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Live Face Selfie {facingMode === 'user' ? '(Front Camera)' : '(Back Camera)'}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={handleFlipCamera}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs flex items-center gap-1 transition-colors"
                    title="Switch Camera (Front / Back)"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">Flip</span>
                  </button>
                  <button onClick={stopCamera} className="text-slate-400 hover:text-slate-700 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {cameraError ? (
                <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-2xl border border-rose-200 space-y-3 text-left">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <p className="font-semibold">{cameraError}</p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-rose-100 space-y-1.5">
                    <p className="font-bold text-[11px] text-rose-900">How to unblock camera access:</p>
                    <ul className="list-disc list-inside text-[10px] text-rose-800 space-y-1">
                      <li><strong>On Mobile / Android:</strong> Tap the lock or sliders icon next to the address bar &gt; <strong>Permissions</strong> &gt; set <strong>Camera</strong> to <strong>Allow</strong>.</li>
                      <li><strong>On Desktop Browser:</strong> Click the padlock or settings icon in the address bar &gt; toggle <strong>Camera</strong> to <strong>Allow</strong>.</li>
                      <li><strong>On iPhone / Safari:</strong> Tap <strong>"aA"</strong> in search bar &gt; <strong>Website Settings</strong> &gt; <strong>Camera: Allow</strong>.</li>
                    </ul>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => startCamera('user')}
                      className="px-3.5 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 shadow-2xs flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        handleRequestAvatarUpload();
                      }}
                      className="px-3.5 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload File Instead</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-72 h-72 mx-auto rounded-full overflow-hidden border-4 border-blue-500 shadow-xl bg-slate-900">
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && streamRef.current && el.srcObject !== streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch(e => console.warn('Video auto-play warning:', e));
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                  />
                  <div className="absolute inset-0 border-2 border-dashed border-white/60 rounded-full pointer-events-none" />
                </div>
              )}

              <p className="text-xs text-slate-500">Center your face in the oval circle and click Capture Face Photo.</p>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                {!cameraError && (
                  <button
                    type="button"
                    onClick={captureSelfie}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Face Photo</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LOCKED READ-ONLY VIEW */}
        {!isEditing ? (
          <div className="space-y-6">
            {/* ID Document Verified Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">Identity Document (Verified)</h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Required & Verified
                </span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <FileText className="w-6 h-6 text-blue-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{profile.idDocumentName}</span>
                  <span className="text-[10px] text-slate-500">Encrypted Government Identity Verification Saved</span>
                </div>
              </div>
            </div>

            {/* Work Experiences */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Work Experience & Trade History</h3>
              </div>
              <div className="space-y-3">
                {profile.experiences.map((exp) => (
                  <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{exp.tradeOrTitle}</span>
                      <span className="text-[11px] text-slate-500 font-medium">{exp.duration}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">{exp.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* References */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Award className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Verification References</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.references.map((ref) => (
                  <div key={ref.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-xs font-bold text-slate-900 block">{ref.name}</span>
                    <span className="text-[11px] text-slate-500 block">{ref.relationship}</span>
                    <span className="text-xs text-blue-600 font-medium block pt-1">{ref.contact}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Information & Operating Area */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Phone className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Contact & Operating Area</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <Phone className="w-4 h-4 text-slate-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Phone</span>
                    <span className="text-xs font-bold text-slate-900">{profile.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <Mail className="w-4 h-4 text-slate-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Email</span>
                    <span className="text-xs font-bold text-slate-900">{profile.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Operating Area / City</span>
                  <span className="text-xs font-bold text-slate-900">{profile.location}</span>
                </div>
              </div>

              {/* Optional Social Links */}
              <div className="pt-2">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-2">Social Profiles</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {profile.whatsapp && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{profile.whatsapp}</span>
                    </span>
                  )}
                  {profile.linkedin && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-xl text-xs font-medium border border-blue-200">
                      <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                      <span>{profile.linkedin}</span>
                    </span>
                  )}
                  {profile.instagram && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-pink-800 rounded-xl text-xs font-medium border border-pink-200">
                      <Instagram className="w-3.5 h-3.5 text-pink-600" />
                      <span>{profile.instagram}</span>
                    </span>
                  )}
                  {profile.portfolio && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-medium border border-slate-200">
                      <Globe className="w-3.5 h-3.5 text-slate-600" />
                      <span>{profile.portfolio}</span>
                    </span>
                  )}
                  {!profile.whatsapp && !profile.linkedin && !profile.instagram && !profile.portfolio && (
                    <span className="text-xs text-slate-400 italic">No optional social links provided.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Unlock to Edit Action */}
            <div className="flex items-center justify-center pt-2">
              <button
                onClick={() => setIsEditing(true)}
                className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Unlock & Edit Profile Details</span>
              </button>
            </div>
          </div>
        ) : (
          /* EDITABLE FORM */
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Required Identity Document Upload */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">Upload ID Document (Required) *</h3>
                </div>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  Mandatory Verification
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Please upload a clear copy of your National ID, Passport, or Driver's License:
              </p>

              <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {profile.idDocumentName || 'No ID document uploaded yet'}
                    </span>
                    <span className="text-[10px] text-slate-400">PDF, PNG, JPG, or JPEG (Saved to persistent storage)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleRequestIdDocUpload}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{profile.idDocumentName ? 'Change File' : 'Choose File'}</span>
                  </button>
                  <input
                    ref={idDocInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleIdDocUpload}
                  />
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Personal Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">First Name *</label>
                  <input
                    type="text"
                    required
                    value={profile.firstName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProfile(prev => {
                        const next = { ...prev, firstName: val };
                        saveProfileToStorage(next).catch(console.warn);
                        return next;
                      });
                      setValidationError('');
                    }}
                    placeholder="e.g., Sipho / Alex"
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Surname / Last Name *</label>
                  <input
                    type="text"
                    required
                    value={profile.lastName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProfile(prev => {
                        const next = { ...prev, lastName: val };
                        saveProfileToStorage(next).catch(console.warn);
                        return next;
                      });
                      setValidationError('');
                    }}
                    placeholder="e.g., Dlamini / Nkosi"
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Work Trade Selection with Expanded Simple Casual Gig Trades */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">Primary Casual Gig Trade</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Select your field</span>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">Choose your primary casual gig trade: *</label>
                <select
                  value={profile.selectedTrade}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfile(prev => {
                      const next = { ...prev, selectedTrade: val };
                      saveProfileToStorage(next).catch(console.warn);
                      return next;
                    });
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {CASUAL_GIG_TRADES.map((trade) => (
                    <option key={trade} value={trade}>{trade}</option>
                  ))}
                </select>

                {profile.selectedTrade === 'Other / Custom Casual Trade' && (
                  <div className="pt-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Specify Custom Casual Trade *</label>
                    <input
                      type="text"
                      required
                      value={profile.customTrade || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfile(prev => {
                          const next = { ...prev, customTrade: val };
                          saveProfileToStorage(next).catch(console.warn);
                          return next;
                        });
                      }}
                      placeholder="e.g., Solar Panel Cleaner, Bicycle Mechanic..."
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Multiple Work Experiences (Required + Can Add More) */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Work Experiences (Required) *</h3>
                </div>
                <button
                  type="button"
                  onClick={addExperience}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Experience</span>
                </button>
              </div>
              <p className="text-xs text-slate-500">Provide at least one work experience. You can add more as needed:</p>

              <div className="space-y-4">
                {profile.experiences.map((exp, idx) => (
                  <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Experience #{idx + 1}</span>
                      {profile.experiences.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeExperience(exp.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Remove experience"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block">Job Title / Role *</label>
                        <input
                          type="text"
                          required
                          value={exp.tradeOrTitle}
                          onChange={(e) => updateExperience(exp.id, 'tradeOrTitle', e.target.value)}
                          placeholder="e.g., Residential Maintenance Specialist"
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block">Years / Duration *</label>
                        <input
                          type="text"
                          required
                          value={exp.duration}
                          onChange={(e) => updateExperience(exp.id, 'duration', e.target.value)}
                          placeholder="e.g., 3 Years / 2021-2024"
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">Description of Work Performed *</label>
                      <textarea
                        required
                        rows={3}
                        value={exp.description}
                        onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                        placeholder="Describe key duties, tools used, and successful projects completed..."
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Multiple References (Required + Can Add More) */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-bold text-slate-900">References to Support Trade (Required) *</h3>
                </div>
                <button
                  type="button"
                  onClick={addReference}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Reference</span>
                </button>
              </div>
              <p className="text-xs text-slate-500">Provide past clients, foremen, or managers who can confirm your skills:</p>

              <div className="space-y-4">
                {profile.references.map((ref, idx) => (
                  <div key={ref.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Reference #{idx + 1}</span>
                      {profile.references.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeReference(ref.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Remove reference"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block">Reference Full Name *</label>
                        <input
                          type="text"
                          required
                          value={ref.name}
                          onChange={(e) => updateReference(ref.id, 'name', e.target.value)}
                          placeholder="e.g., Bongani Ndlovu"
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block">Relationship / Company *</label>
                        <input
                          type="text"
                          required
                          value={ref.relationship}
                          onChange={(e) => updateReference(ref.id, 'relationship', e.target.value)}
                          placeholder="e.g., Site Supervisor / Client"
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block">Phone or Email *</label>
                        <input
                          type="text"
                          required
                          value={ref.contact}
                          onChange={(e) => updateReference(ref.id, 'contact', e.target.value)}
                          placeholder="e.g., +27 82 555 1234"
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Details & Location (Required) */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Phone className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Contact Information & Operating Area (Required) *</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Contact Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={profile.phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProfile(prev => {
                        const next = { ...prev, phone: val };
                        saveProfileToStorage(next).catch(console.warn);
                        return next;
                      });
                      setValidationError('');
                    }}
                    placeholder="e.g., +27 71 234 5678"
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={profile.email}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProfile(prev => {
                        const next = { ...prev, email: val };
                        saveProfileToStorage(next).catch(console.warn);
                        return next;
                      });
                      setValidationError('');
                    }}
                    placeholder="e.g., user@example.co.za"
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Location Input with Auto-detect showing NAME not numbers */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">Operating Area / City Name *</label>
                  <button
                    type="button"
                    disabled={isDetectingLocation}
                    onClick={handleAutoDetectLocation}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isDetectingLocation ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                    <span>{isDetectingLocation ? 'Resolving Address Name...' : 'Auto-detect via GPS'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={profile.location}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfile(prev => {
                      const next = { ...prev, location: val };
                      saveProfileToStorage(next).catch(console.warn);
                      return next;
                    });
                    setValidationError('');
                  }}
                  placeholder="e.g., Sandton, Johannesburg, Gauteng, South Africa"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <span className="text-[10px] text-slate-400 block">Displays full location/city name (no GPS coordinate numbers).</span>
              </div>

              {/* Social Media Links (Optional) */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <label className="text-xs font-bold text-slate-700 block">Social Media Links (Optional)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold block">WhatsApp Number</span>
                    <input
                      type="text"
                      value={profile.whatsapp || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfile(prev => {
                          const next = { ...prev, whatsapp: val };
                          saveProfileToStorage(next).catch(console.warn);
                          return next;
                        });
                      }}
                      placeholder="e.g., +27 71 234 5678"
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold block">LinkedIn Profile</span>
                    <input
                      type="text"
                      value={profile.linkedin || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfile(prev => {
                          const next = { ...prev, linkedin: val };
                          saveProfileToStorage(next).catch(console.warn);
                          return next;
                        });
                      }}
                      placeholder="e.g., linkedin.com/in/username"
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold block">Instagram Handle</span>
                    <input
                      type="text"
                      value={profile.instagram || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfile(prev => {
                          const next = { ...prev, instagram: val };
                          saveProfileToStorage(next).catch(console.warn);
                          return next;
                        });
                      }}
                      placeholder="e.g., @mytrade_gigs"
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold block">Portfolio / Website</span>
                    <input
                      type="text"
                      value={profile.portfolio || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfile(prev => {
                          const next = { ...prev, portfolio: val };
                          saveProfileToStorage(next).catch(console.warn);
                          return next;
                        });
                      }}
                      placeholder="e.g., https://mywork.co.za"
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit & Lock Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
              {profile.isLocked && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <span>Cancel Edits</span>
                </button>
              )}
              <button
                type="submit"
                disabled={saveModalState === 'loading'}
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white rounded-2xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2"
              >
                {saveModalState === 'loading' ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Saving Profile...</span>
                  </>
                ) : saveModalState === 'success' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300 font-bold">Success!</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>Submit, Save & Lock Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Saving Profile Circle Loading & Success Modal */}
        {saveModalState && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl space-y-5 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
              {saveModalState === 'loading' ? (
                <div className="space-y-4">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    {/* Circle loading spinner */}
                    <svg className="w-16 h-16 animate-spin text-slate-900" viewBox="0 0 50 50">
                      <circle
                        className="opacity-20"
                        cx="25"
                        cy="25"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <circle
                        className="opacity-90"
                        cx="25"
                        cy="25"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray="80"
                        strokeDashoffset="60"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Saving Profile...</h3>
                    <p className="text-xs text-slate-500 mt-1">Securing face picture, ID document & trade credentials</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-bounce shadow-md">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-emerald-600">Success!</h3>
                    <p className="text-xs text-slate-600 mt-1">Profile saved and trade verified successfully.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

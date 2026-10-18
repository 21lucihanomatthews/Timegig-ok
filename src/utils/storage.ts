import { UserActivityItem, CreatedGigItem } from '../types';

const DB_NAME = 'timegig_persistent_storage_db';
const DB_VERSION = 1;
const PROFILE_STORE = 'user_profile';
const ACTIVITIES_STORE = 'user_activities';
const GIGS_STORE = 'created_gigs';

const LOCAL_STORAGE_PROFILE_KEY = 'terrapulse_user_profile';
const LOCAL_STORAGE_ACTIVITIES_KEY = 'timegig_user_activities';
const LOCAL_STORAGE_GIGS_KEY = 'timegig_created_gigs';

// Open or initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PROFILE_STORE)) {
        db.createObjectStore(PROFILE_STORE);
      }
      if (!db.objectStoreNames.contains(ACTIVITIES_STORE)) {
        db.createObjectStore(ACTIVITIES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(GIGS_STORE)) {
        db.createObjectStore(GIGS_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Image compressor to safely scale data URLs so base64 strings don't crash localStorage or lag mobile browsers
 */
export async function compressImageDataUrl(
  dataUrl: string,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.85
): Promise<string> {
  // If it's a PDF, leave as-is
  if (dataUrl.startsWith('data:application/pdf')) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };

    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// -------------------------------------------------------------
// PROFILE PERSISTENCE (Saves all information, face picture, and ID doc)
// -------------------------------------------------------------

export async function saveProfileToStorage(profile: any): Promise<void> {
  if (!profile) return;

  // 1. Save to IndexedDB (virtually unlimited quota for images, documents & details)
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([PROFILE_STORE], 'readwrite');
      const store = tx.objectStore(PROFILE_STORE);
      const req = store.put(profile, 'current_profile');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not save profile to IndexedDB:', err);
  }

  // 2. Also save to localStorage for instantaneous synchronous access
  try {
    const serialized = JSON.stringify(profile);
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, serialized);
  } catch (lsErr: any) {
    console.warn('LocalStorage quota or write error (IndexedDB still preserved):', lsErr);
    // If full profile exceeded quota because of raw images, save clean metadata version
    try {
      const lightProfile = {
        ...profile,
        // Keep avatar if under reasonable length, or keep note that full copy is in IndexedDB
        avatar: profile.avatar?.length > 400000 ? profile.avatar.slice(0, 100) : profile.avatar,
        idDocumentData: profile.idDocumentData?.length > 400000 ? '' : profile.idDocumentData,
      };
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(lightProfile));
    } catch (e) {
      // Ignored - IndexedDB has the authoritative copy
    }
  }
}

export async function loadProfileFromStorage(): Promise<any | null> {
  // Try IndexedDB first for the most complete and uncompressed payload
  try {
    const db = await openDB();
    const result = await new Promise<any>((resolve) => {
      const tx = db.transaction([PROFILE_STORE], 'readonly');
      const store = tx.objectStore(PROFILE_STORE);
      const req = store.get('current_profile');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    if (result && typeof result === 'object' && (result.firstName || result.avatar || result.idDocumentName)) {
      return result;
    }
  } catch (e) {
    // IndexedDB failed or unavailable, fallback to localStorage
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading profile from localStorage:', e);
  }

  return null;
}

// -------------------------------------------------------------
// USER ACTIVITIES (Remember all user activities)
// -------------------------------------------------------------

export async function saveActivityToStorage(activity: Omit<UserActivityItem, 'id'>): Promise<UserActivityItem> {
  const item: UserActivityItem = {
    ...activity,
    id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
  };

  // 1. IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([ACTIVITIES_STORE], 'readwrite');
      const store = tx.objectStore(ACTIVITIES_STORE);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Could not save activity to IndexedDB:', e);
  }

  // 2. LocalStorage array cache
  try {
    const existingRaw = localStorage.getItem(LOCAL_STORAGE_ACTIVITIES_KEY);
    const existing: UserActivityItem[] = existingRaw ? JSON.parse(existingRaw) : [];
    const updated = [item, ...existing.filter(a => a.id !== item.id)].slice(0, 100);
    localStorage.setItem(LOCAL_STORAGE_ACTIVITIES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error updating activities in localStorage:', e);
  }

  return item;
}

export async function loadActivitiesFromStorage(): Promise<UserActivityItem[]> {
  // Try IndexedDB first
  try {
    const db = await openDB();
    const result = await new Promise<UserActivityItem[]>((resolve) => {
      const tx = db.transaction([ACTIVITIES_STORE], 'readonly');
      const store = tx.objectStore(ACTIVITIES_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const items: UserActivityItem[] = req.result || [];
        items.sort((a, b) => b.timestamp - a.timestamp);
        resolve(items);
      };
      req.onerror = () => resolve([]);
    });

    if (result && result.length > 0) {
      return result;
    }
  } catch (e) {
    // Fall back to localStorage
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ACTIVITIES_KEY);
    if (raw) {
      const list: UserActivityItem[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.sort((a, b) => b.timestamp - a.timestamp);
        return list;
      }
    }
  } catch (e) {
    console.warn('Error loading activities from localStorage:', e);
  }

  return [];
}

// -------------------------------------------------------------
// CREATED GIGS (Remember posted gigs across reloads)
// -------------------------------------------------------------

export async function saveCreatedGigToStorage(gig: CreatedGigItem): Promise<void> {
  // 1. IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([GIGS_STORE], 'readwrite');
      const store = tx.objectStore(GIGS_STORE);
      const req = store.put(gig);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Could not save gig to IndexedDB:', e);
  }

  // 2. LocalStorage array cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_GIGS_KEY);
    const list: CreatedGigItem[] = raw ? JSON.parse(raw) : [];
    const updated = [gig, ...list.filter(g => g.id !== gig.id)];
    localStorage.setItem(LOCAL_STORAGE_GIGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error saving gig to localStorage:', e);
  }
}

export async function loadCreatedGigsFromStorage(): Promise<CreatedGigItem[]> {
  try {
    const db = await openDB();
    const result = await new Promise<CreatedGigItem[]>((resolve) => {
      const tx = db.transaction([GIGS_STORE], 'readonly');
      const store = tx.objectStore(GIGS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    if (result && result.length > 0) {
      return result;
    }
  } catch (e) {
    // Fall back
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_GIGS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch (e) {
    // ignore
  }

  return [];
}

export async function deleteCreatedGigFromStorage(gigId: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([GIGS_STORE], 'readwrite');
      const store = tx.objectStore(GIGS_STORE);
      const req = store.delete(gigId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Could not delete gig from IndexedDB:', e);
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_GIGS_KEY);
    const list: CreatedGigItem[] = raw ? JSON.parse(raw) : [];
    const updated = list.filter(g => g.id !== gigId);
    localStorage.setItem(LOCAL_STORAGE_GIGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error deleting gig from localStorage:', e);
  }
}

const LOCAL_STORAGE_WORK_RADIUS_KEY = 'timegig_work_radius_miles';

export function saveWorkRadiusToStorage(miles: number): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_WORK_RADIUS_KEY, miles.toString());
  } catch (e) {
    console.warn('Error saving work radius to localStorage:', e);
  }
}

export function loadWorkRadiusFromStorage(defaultMiles = 15): number {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_WORK_RADIUS_KEY);
    if (raw) {
      const val = parseFloat(raw);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch (e) {
    console.warn('Error reading work radius from localStorage:', e);
  }
  return defaultMiles;
}

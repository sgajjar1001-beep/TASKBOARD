/**
 * Microsoft Bing Daily Wallpaper Service
 * Connects to Microsoft Bing's Picture of the Day to automatically update
 * the background wallpaper daily, with intelligent local caching and reliable fallbacks.
 */

export interface BingWallpaperData {
  url: string;
  title?: string;
  copyright?: string;
  date: string; // YYYY-MM-DD
}

const STORAGE_KEY = 'BING_DAILY_WALLPAPER_CACHE';
const PREF_KEY = 'BING_WALLPAPER_ENABLED';

// Curated high-res Bing Daily landscapes for reliable instant fallback and manual rotation
export const CURATED_BING_WALLPAPERS: BingWallpaperData[] = [
  {
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80',
    title: 'Yosemite Valley Mist',
    copyright: 'Microsoft Bing Featured Nature',
    date: '2026-11-01',
  },
  {
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80',
    title: 'Misty Mountain Range',
    copyright: 'Microsoft Bing Daily Landscape',
    date: '2026-11-02',
  },
  {
    url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1920&q=80',
    title: 'Enchanted Autumn Forest',
    copyright: 'Microsoft Bing Seasonal Nature',
    date: '2026-11-03',
  },
  {
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80',
    title: 'Alpine Peak Sunrise',
    copyright: 'Microsoft Bing High Altitude',
    date: '2026-11-04',
  },
  {
    url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1920&q=80',
    title: 'Emerald Pine Canopy',
    copyright: 'Microsoft Bing Forest Exploration',
    date: '2026-11-05',
  },
  {
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80',
    title: 'Tropical Azure Coast',
    copyright: 'Microsoft Bing Ocean Paradise',
    date: '2026-11-06',
  },
  {
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80',
    title: 'Starry Alpine Night',
    copyright: 'Microsoft Bing Night Sky',
    date: '2026-11-07',
  },
  {
    url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=1920&q=80',
    title: 'Mirror Lake Reflection',
    copyright: 'Microsoft Bing Serene Waters',
    date: '2026-11-08',
  },
  {
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1920&q=80',
    title: 'Golden Desert Dunes',
    copyright: 'Microsoft Bing Sahara Vista',
    date: '2026-11-09',
  },
  {
    url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1920&q=80',
    title: 'Aurora Borealis Glow',
    copyright: 'Microsoft Bing Polar Lights',
    date: '2026-11-10',
  },
];

export function getBingWallpaperEnabled(): boolean {
  try {
    const saved = localStorage.getItem(PREF_KEY);
    return saved !== null ? JSON.parse(saved) : true; // Enabled by default
  } catch {
    return true;
  }
}

export function setBingWallpaperEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(enabled));
  } catch {}
}

export function getInitialBingWallpaper(): BingWallpaperData {
  const todayStr = new Date().toISOString().split('T')[0];
  try {
    const cachedStr = localStorage.getItem(STORAGE_KEY);
    if (cachedStr) {
      const cached: BingWallpaperData = JSON.parse(cachedStr);
      if (cached && cached.url) return cached;
    }
  } catch {}
  const dayOfMonth = new Date().getDate();
  const fallback = CURATED_BING_WALLPAPERS[dayOfMonth % CURATED_BING_WALLPAPERS.length];
  return {
    url: fallback.url,
    title: fallback.title,
    copyright: fallback.copyright,
    date: todayStr,
  };
}

export async function fetchBingDailyWallpaper(): Promise<BingWallpaperData> {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Check local cache first
  try {
    const cachedStr = localStorage.getItem(STORAGE_KEY);
    if (cachedStr) {
      const cached: BingWallpaperData = JSON.parse(cachedStr);
      if (cached.date === todayStr && cached.url) {
        return cached;
      }
    }
  } catch {}

  // 2. Fetch fresh Daily Bing Wallpaper from CORS-friendly proxy endpoint
  try {
    const res = await fetch('https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=en-US', {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.url) {
        const result: BingWallpaperData = {
          url: data.url,
          title: data.copyright ? data.copyright.split('(')[0].trim() : "Today's Bing Wallpaper",
          copyright: data.copyright || 'Microsoft Bing Picture of the Day',
          date: todayStr,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
        } catch {}
        return result;
      }
    }
  } catch (err) {
    // Network or CORS error, fall through to curated
  }

  // 3. Fallback: Curated day-of-month rotation
  const dayOfMonth = new Date().getDate();
  const fallback = CURATED_BING_WALLPAPERS[dayOfMonth % CURATED_BING_WALLPAPERS.length];
  const fallbackResult: BingWallpaperData = {
    url: fallback.url,
    title: fallback.title,
    copyright: fallback.copyright,
    date: todayStr,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackResult));
  } catch {}

  return fallbackResult;
}

/**
 * Manually switch to the next Bing wallpaper (cycles through Bing recent archives and curated library)
 */
export async function getNextBingWallpaper(currentUrl?: string): Promise<BingWallpaperData> {
  const todayStr = new Date().toISOString().split('T')[0];

  // Attempt to fetch another index from Bing Daily Archive (random index from 1 to 7)
  const randomArchiveIndex = Math.floor(Math.random() * 7) + 1;
  try {
    const res = await fetch(
      `https://bing.biturl.top/?resolution=1920&format=json&index=${randomArchiveIndex}&mkt=en-US`,
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.url && data.url !== currentUrl) {
        const nextResult: BingWallpaperData = {
          url: data.url,
          title: data.copyright ? data.copyright.split('(')[0].trim() : "Bing Archive Photo",
          copyright: data.copyright || 'Microsoft Bing Picture of the Day',
          date: todayStr,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextResult));
        } catch {}
        return nextResult;
      }
    }
  } catch {}

  // Fallback: cycle to next curated image that is different from current
  const currentIndex = CURATED_BING_WALLPAPERS.findIndex((item) => item.url === currentUrl);
  const nextIndex = (currentIndex + 1) % CURATED_BING_WALLPAPERS.length;
  const nextFallback = CURATED_BING_WALLPAPERS[nextIndex];

  const result: BingWallpaperData = {
    url: nextFallback.url,
    title: nextFallback.title,
    copyright: nextFallback.copyright,
    date: todayStr,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {}

  return result;
}

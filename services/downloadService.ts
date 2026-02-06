import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createDownloadResumable,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync
} from 'expo-file-system/legacy';
// ✅ ADDED: Import Auth to get User ID
import { auth } from '../config/firebaseConfig';

// ❌ REMOVED: Static Keys
// const DOWNLOAD_STORAGE_KEY = 'my_downloaded_episodes_v1'; 
// const MANGA_DOWNLOAD_KEY = 'my_downloaded_chapters_v1'; 

// ✅ NEW: Dynamic Key Generators
const getAnimeKey = () => {
  const userId = auth.currentUser?.uid;
  if (!userId) return 'guest_downloaded_episodes_v1';
  return `user_${userId}_downloaded_episodes_v1`;
};

const getMangaKey = () => {
  const userId = auth.currentUser?.uid;
  if (!userId) return 'guest_downloaded_chapters_v1';
  return `user_${userId}_downloaded_chapters_v1`;
};

const rootDir = documentDirectory || 'file:///data/user/0/host.exp.exponent/files/';
const DOWNLOAD_FOLDER = rootDir + 'anime_downloads/';

export interface DownloadItem {
  mal_id: string | number;
  episodeId: string | number;
  number: number;
  title: string;
  animeTitle: string;
  image?: string;
  localUri: string;
  originalUrl: string;
  size?: number;
}

// --- GLOBAL STATE FOR ACTIVE DOWNLOADS ---
const activeDownloads: Record<string, DownloadItem> = {}; 
const activeProgress: Record<string, number> = {}; 
const progressListeners: Record<string, (progress: number) => void> = {};

export const registerDownloadListener = (episodeId: string, callback: (progress: number) => void) => {
    progressListeners[episodeId] = callback;
    if (activeProgress[episodeId] !== undefined) callback(activeProgress[episodeId]);
};

export const unregisterDownloadListener = (episodeId: string) => {
    delete progressListeners[episodeId];
};

export const isDownloading = (episodeId: string) => !!activeDownloads[episodeId];

export const getActiveDownloads = () => Object.values(activeDownloads);

const ensureDirExists = async () => {
  const dirInfo = await getInfoAsync(DOWNLOAD_FOLDER);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(DOWNLOAD_FOLDER, { intermediates: true });
  }
  const noMedia = DOWNLOAD_FOLDER + '.nomedia';
  const noMediaInfo = await getInfoAsync(noMedia);
  if (!noMediaInfo.exists) {
      await writeAsStringAsync(noMedia, '');
  }
};

// ==========================================
// 📺 ANIME DOWNLOADS (Original Logic)
// ==========================================

export const getDownloads = async (): Promise<DownloadItem[]> => {
  try {
    // ✅ UPDATE: Use Dynamic Key
    const jsonValue = await AsyncStorage.getItem(getAnimeKey());
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Error fetching downloads", e);
    return [];
  }
};

const saveDownloadRecord = async (newItem: DownloadItem) => {
  const current = await getDownloads();
  const filtered = current.filter(d => String(d.episodeId) !== String(newItem.episodeId));
  const updated = [...filtered, newItem];
  // ✅ UPDATE: Use Dynamic Key
  await AsyncStorage.setItem(getAnimeKey(), JSON.stringify(updated));
};

export const cancelDownload = async (episodeId: string | number) => {
    const epId = String(episodeId);
    delete activeDownloads[epId];
    delete activeProgress[epId];
    delete progressListeners[epId];
};

export const downloadEpisodeToFile = async (
  anime: any,
  episode: any
): Promise<string | null> => {
  const epId = String(episode.mal_id);
  
  try {
    await ensureDirExists();

    const fileUri = DOWNLOAD_FOLDER + `${anime.mal_id}_${episode.mal_id}.mp4`;

    activeDownloads[epId] = {
        mal_id: anime.mal_id,
        episodeId: episode.mal_id,
        number: episode.number,
        title: episode.title,
        animeTitle: anime.title,
        image: anime.images?.jpg?.image_url || anime.image,
        localUri: '', 
        originalUrl: episode.url,
    };
    activeProgress[epId] = 0;

    const downloadResumable = createDownloadResumable(
      episode.url,
      fileUri,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        activeProgress[epId] = progress;
        if (progressListeners[epId]) progressListeners[epId](progress);
      }
    );

    const result = await downloadResumable.downloadAsync();

    delete activeDownloads[epId];
    delete activeProgress[epId];
    delete progressListeners[epId];

    if (result && result.uri) {
       // ✅ ADDED: Safety check for small files (Fake 403 downloads)
       const fileInfo = await getInfoAsync(result.uri);
       if(fileInfo.exists && fileInfo.size < 10000) {
           await deleteAsync(result.uri, { idempotent: true });
           throw new Error("Download failed: Access Denied (File too small)");
       }

      const record: DownloadItem = {
        mal_id: anime.mal_id,
        episodeId: episode.mal_id,
        number: episode.number,
        title: episode.title,
        animeTitle: anime.title,
        image: anime.images?.jpg?.image_url || anime.image, 
        localUri: result.uri,
        originalUrl: episode.url,
      };
      
      await saveDownloadRecord(record);
      return result.uri;
    }
    return null;

  } catch (error) {
    console.error("Download failed:", error);
    delete activeDownloads[epId];
    delete activeProgress[epId];
    delete progressListeners[epId];
    throw error;
  }
};

export const getLocalEpisodeUri = async (episodeId: string | number): Promise<string | null> => {
  const downloads = await getDownloads();
  const found = downloads.find(d => String(d.episodeId) === String(episodeId));
  if (found) {
    const fileInfo = await getInfoAsync(found.localUri);
    if (fileInfo.exists) return found.localUri;
  }
  return null;
};

export const removeDownload = async (episodeId: string | number) => {
    const downloads = await getDownloads();
    const toRemove = downloads.find(d => String(d.episodeId) === String(episodeId));
    
    if (toRemove) {
        await deleteAsync(toRemove.localUri, { idempotent: true });
        const updated = downloads.filter(d => String(d.episodeId) !== String(episodeId));
        // ✅ UPDATE: Use Dynamic Key
        await AsyncStorage.setItem(getAnimeKey(), JSON.stringify(updated));
    }
};

// ==========================================
// 📖 MANGA DOWNLOADS (New Logic)
// ==========================================

export const getMangaDownloads = async (): Promise<DownloadItem[]> => {
  try {
    // ✅ UPDATE: Use Dynamic Key
    const jsonValue = await AsyncStorage.getItem(getMangaKey());
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Error fetching manga downloads", e);
    return [];
  }
};

const saveMangaDownloadRecord = async (newItem: DownloadItem) => {
  const current = await getMangaDownloads();
  // Filter out duplicates based on ID
  const filtered = current.filter(d => String(d.episodeId) !== String(newItem.episodeId));
  const updated = [...filtered, newItem];
  // ✅ UPDATE: Use Dynamic Key
  await AsyncStorage.setItem(getMangaKey(), JSON.stringify(updated));
};

export const downloadChapterToFile = async (
  manga: any,
  chapter: any
): Promise<string | null> => {
  try {
    await ensureDirExists();
    
    // Unique ID for the chapter (fallback to number if id is missing)
    const chapId = String(chapter.id || `ch_${chapter.number}`);
    
    // Unique filename for PDF
    const fileUri = DOWNLOAD_FOLDER + `manga_${manga.mal_id}_${chapId}.pdf`;

    const downloadResumable = createDownloadResumable(
      chapter.url,
      fileUri,
      {},
      (downloadProgress) => {
         // You can add progress logic here if needed later
      }
    );

    const result = await downloadResumable.downloadAsync();

    if (result && result.uri) {
       // ✅ ADDED: Safety check for small files (Fake 403 downloads)
       const fileInfo = await getInfoAsync(result.uri);
       if(fileInfo.exists && fileInfo.size < 10000) {
           await deleteAsync(result.uri, { idempotent: true });
           throw new Error("Download failed: Access Denied (File too small)");
       }

      const record: DownloadItem = {
        mal_id: manga.mal_id,
        episodeId: chapId, // We reuse 'episodeId' field for chapter ID
        number: chapter.number,
        title: chapter.title || `Chapter ${chapter.number}`,
        animeTitle: manga.title, 
        image: manga.images?.jpg?.image_url || manga.image, 
        localUri: result.uri,
        originalUrl: chapter.url,
      };
      
      await saveMangaDownloadRecord(record);
      return result.uri;
    }
    return null;

  } catch (error) {
    console.error("Manga Download failed:", error);
    throw error;
  }
};

export const removeMangaDownload = async (chapterId: string | number) => {
    const downloads = await getMangaDownloads();
    const toRemove = downloads.find(d => String(d.episodeId) === String(chapterId));
    
    if (toRemove) {
        await deleteAsync(toRemove.localUri, { idempotent: true });
        const updated = downloads.filter(d => String(d.episodeId) !== String(chapterId));
        // ✅ UPDATE: Use Dynamic Key
        await AsyncStorage.setItem(getMangaKey(), JSON.stringify(updated));
    }
};
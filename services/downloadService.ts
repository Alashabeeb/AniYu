// ✅ FIX: Import EVERYTHING from the legacy module
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createDownloadResumable,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync
} from 'expo-file-system/legacy';

const DOWNLOAD_STORAGE_KEY = 'my_downloaded_episodes_v1';
const rootDir = documentDirectory || 'file:///data/user/0/host.exp.exponent/files/';
const DOWNLOAD_FOLDER = rootDir + 'anime_downloads/';

export interface DownloadItem {
  mal_id: string | number;
  episodeId: string | number;
  title: string;
  animeTitle: string;
  localUri: string;
  originalUrl: string;
  size?: number;
}

// --- GLOBAL STATE FOR ACTIVE DOWNLOADS ---
// This keeps track of downloads even if you leave the screen
const activeDownloads: Record<string, boolean> = {}; 
const activeProgress: Record<string, number> = {}; 
const progressListeners: Record<string, (progress: number) => void> = {};

// Helper to subscribe to progress
export const registerDownloadListener = (episodeId: string, callback: (progress: number) => void) => {
    progressListeners[episodeId] = callback;
    // If we already have progress, update immediately
    if (activeProgress[episodeId] !== undefined) {
        callback(activeProgress[episodeId]);
    }
};

export const unregisterDownloadListener = (episodeId: string) => {
    delete progressListeners[episodeId];
};

export const isDownloading = (episodeId: string) => {
    return !!activeDownloads[episodeId];
};

// Ensure the download directory exists
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

export const getDownloads = async (): Promise<DownloadItem[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(DOWNLOAD_STORAGE_KEY);
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
  await AsyncStorage.setItem(DOWNLOAD_STORAGE_KEY, JSON.stringify(updated));
};

// THE REAL DOWNLOAD FUNCTION
export const downloadEpisodeToFile = async (
  anime: any,
  episode: any
): Promise<string | null> => {
  const epId = String(episode.mal_id);
  
  try {
    await ensureDirExists();

    // 1. Mark as Active
    activeDownloads[epId] = true;
    activeProgress[epId] = 0;

    const fileUri = DOWNLOAD_FOLDER + `${anime.mal_id}_${episode.mal_id}.mp4`;

    const downloadResumable = createDownloadResumable(
      episode.url,
      fileUri,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        
        // 2. Update Global State
        activeProgress[epId] = progress;
        
        // 3. Notify Listener (if screen is active)
        if (progressListeners[epId]) {
            progressListeners[epId](progress);
        }
      }
    );

    const result = await downloadResumable.downloadAsync();

    // 4. Cleanup on Finish
    delete activeDownloads[epId];
    delete activeProgress[epId];
    delete progressListeners[epId];

    if (result && result.uri) {
      const record: DownloadItem = {
        mal_id: anime.mal_id,
        episodeId: episode.mal_id,
        title: episode.title,
        animeTitle: anime.title,
        localUri: result.uri,
        originalUrl: episode.url,
      };
      
      await saveDownloadRecord(record);
      return result.uri;
    }
    return null;

  } catch (error) {
    console.error("Download failed:", error);
    // Cleanup on Error
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
        await AsyncStorage.setItem(DOWNLOAD_STORAGE_KEY, JSON.stringify(updated));
    }
};
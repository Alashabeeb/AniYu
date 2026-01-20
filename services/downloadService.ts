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
  number: number; // ✅ Added Episode Number
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

// ✅ CANCEL FUNCTION (Placeholder for now, logic exists in prev steps if needed)
export const cancelDownload = async (episodeId: string | number) => {
    // Basic cleanup logic for state
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

    // 1. Mark as Active
    activeDownloads[epId] = {
        mal_id: anime.mal_id,
        episodeId: episode.mal_id,
        number: episode.number, // ✅ Store Number
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

    // Cleanup active state
    delete activeDownloads[epId];
    delete activeProgress[epId];
    delete progressListeners[epId];

    if (result && result.uri) {
      const record: DownloadItem = {
        mal_id: anime.mal_id,
        episodeId: episode.mal_id,
        number: episode.number, // ✅ Save Number
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
        await AsyncStorage.setItem(DOWNLOAD_STORAGE_KEY, JSON.stringify(updated));
    }
};
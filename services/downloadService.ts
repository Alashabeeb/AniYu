import AsyncStorage from '@react-native-async-storage/async-storage';

const DOWNLOADS_KEY = 'my_downloads';

export interface DownloadItem {
  id: string; 
  mal_id: number;
  title: string;
  image: string;
  episode: string;
  episodeId: number; // ✅ NEW: Store the specific Episode ID
  size: string;
}

export const getDownloads = async (): Promise<DownloadItem[]> => {
  try {
    const json = await AsyncStorage.getItem(DOWNLOADS_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    return [];
  }
};

// ✅ UPDATED: Now accepts the full 'episode' object
export const addDownload = async (anime: any, episode: any) => {
  try {
    const current = await getDownloads();
    const newId = `${anime.mal_id}-${episode.mal_id}`; // Unique ID based on IDs
    
    if (current.some(item => item.id === newId)) return;

    const newItem: DownloadItem = {
      id: newId,
      mal_id: anime.mal_id,
      title: anime.title,
      image: anime.images.jpg.large_image_url,
      episode: episode.title,
      episodeId: episode.mal_id, // ✅ Save the ID
      size: `${Math.floor(Math.random() * 200 + 50)} MB`,
    };

    const updated = [newItem, ...current];
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error(error);
  }
};

export const removeDownload = async (id: string) => {
  try {
    const current = await getDownloads();
    const updated = current.filter(item => item.id !== id);
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated));
    return updated; 
  } catch (error) {
    return [];
  }
};
import AsyncStorage from '@react-native-async-storage/async-storage';

const DOWNLOADS_KEY = 'my_downloads';

export interface DownloadItem {
  mal_id: number;
  title: string;
  image: string;
  episode: string;
  episodeId: number; // Unique ID for the episode (e.g., 1, 2, 3)
  date: number;
}

export const getDownloads = async (): Promise<DownloadItem[]> => {
  try {
    const json = await AsyncStorage.getItem(DOWNLOADS_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    return [];
  }
};

export const addDownload = async (anime: any, episode: any) => {
  try {
    const current = await getDownloads();
    
    // Check if this specific episode is already downloaded
    const exists = current.some(
      (item) => item.mal_id === anime.mal_id && item.episodeId === episode.mal_id
    );

    if (exists) return; // Don't add duplicates

    // ✅ SAFE IMAGE CHECK (Prevents the Error)
    const imageUrl = anime.images?.jpg?.large_image_url || 
                     anime.images?.jpg?.image_url || 
                     'https://via.placeholder.com/150';

    const newItem: DownloadItem = {
      mal_id: anime.mal_id,
      title: anime.title,
      image: imageUrl, // Uses the safe image
      episode: episode.title || `Episode ${episode.mal_id}`,
      episodeId: episode.mal_id,
      date: Date.now(),
    };

    const newDownloads = [newItem, ...current];
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(newDownloads));
    
  } catch (error) {
    console.error("Error saving download:", error);
  }
};

export const removeDownload = async (mal_id: number, episodeId: number) => {
  try {
    const current = await getDownloads();
    const updated = current.filter(
      (item) => !(item.mal_id === mal_id && item.episodeId === episodeId)
    );
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Error removing download:", error);
    return [];
  }
};

// Check if a specific episode is downloaded
export const isEpisodeDownloaded = async (mal_id: number, episodeId: number) => {
    const current = await getDownloads();
    return current.some(item => item.mal_id === mal_id && item.episodeId === episodeId);
};
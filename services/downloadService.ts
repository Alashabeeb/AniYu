import AsyncStorage from '@react-native-async-storage/async-storage';

const DOWNLOADS_KEY = 'my_downloads';

export interface DownloadItem {
  id: string; // Unique ID (animeId + episodeTitle)
  mal_id: number;
  title: string;
  image: string;
  episode: string;
  size: string; // Fake size like "145 MB"
}

// 1. Get all downloads
export const getDownloads = async (): Promise<DownloadItem[]> => {
  try {
    const json = await AsyncStorage.getItem(DOWNLOADS_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    return [];
  }
};

// 2. Add a download
export const addDownload = async (anime: any, episodeTitle: string) => {
  try {
    const current = await getDownloads();
    const newId = `${anime.mal_id}-${episodeTitle}`;
    
    // Check if already exists
    if (current.some(item => item.id === newId)) return;

    const newItem: DownloadItem = {
      id: newId,
      mal_id: anime.mal_id,
      title: anime.title,
      image: anime.images.jpg.large_image_url,
      episode: episodeTitle,
      size: `${Math.floor(Math.random() * 200 + 50)} MB`, // Fake random size
    };

    const updated = [newItem, ...current];
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error(error);
  }
};

// 3. Delete a download
export const removeDownload = async (id: string) => {
  try {
    const current = await getDownloads();
    const updated = current.filter(item => item.id !== id);
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated));
    return updated; // Return new list to update UI immediately
  } catch (error) {
    return [];
  }
};
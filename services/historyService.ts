import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'my_watch_history';

export interface HistoryItem {
  mal_id: number;
  title: string;
  image: string;
  episode: string;
  date: number;
  genres?: string[]; // ✅ Added Genres
}

export const getContinueWatching = async (): Promise<HistoryItem[]> => {
  try {
    const json = await AsyncStorage.getItem(HISTORY_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    return [];
  }
};

export const addToHistory = async (anime: any, episodeTitle: string) => {
  try {
    const current = await getContinueWatching();
    const validHistory = Array.isArray(current) ? current : [];

    const filtered = validHistory.filter((item) => item.mal_id !== anime.mal_id);

    const imageUrl = anime.images?.jpg?.large_image_url || 
                     anime.images?.jpg?.image_url || 
                     'https://via.placeholder.com/150';

    const newItem: HistoryItem = {
      mal_id: anime.mal_id,
      title: anime.title,
      image: imageUrl,
      episode: episodeTitle,
      date: Date.now(),
      genres: anime.genres || [] // ✅ Save Genres
    };

    const newHistory = [newItem, ...filtered];
    const slicedHistory = newHistory.slice(0, 20);

    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(slicedHistory));
  } catch (error) {
    console.error("Error saving history:", error);
  }
};

export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (e) {
    console.error("Error clearing history:", e);
  }
};
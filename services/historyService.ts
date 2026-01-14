import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'my_watch_history';

export interface HistoryItem {
  mal_id: number;
  title: string;
  image: string;
  episode: string;
  date: number;
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
    // 1. Get existing history
    const current = await getContinueWatching();
    
    // 2. Ensure current is an array (safety check)
    const validHistory = Array.isArray(current) ? current : [];

    // 3. Remove THIS anime if it's already there (so we don't have duplicates of the same show)
    const filtered = validHistory.filter((item) => item.mal_id !== anime.mal_id);

    // ✅ 4. SAFE IMAGE EXTRACTION (Fixes the crash)
    // Checks multiple paths for the image or falls back to a placeholder
    const imageUrl = anime.images?.jpg?.large_image_url || 
                     anime.images?.jpg?.image_url || 
                     'https://via.placeholder.com/150';

    // 5. Create the new item
    const newItem: HistoryItem = {
      mal_id: anime.mal_id,
      title: anime.title,
      image: imageUrl, // Uses the safe variable
      episode: episodeTitle,
      date: Date.now(),
    };

    // 6. Add new item to the top + keep the old ones
    const newHistory = [newItem, ...filtered];

    // 7. Limit history to last 20 items (optional, keeps app fast)
    const slicedHistory = newHistory.slice(0, 20);

    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(slicedHistory));
  } catch (error) {
    console.error("Error saving history:", error);
  }
};
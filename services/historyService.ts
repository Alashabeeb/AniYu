import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'watch_history';

export interface HistoryItem {
  mal_id: number;
  title: string;
  image: string;
  episode: string; // e.g., "Episode 4"
  timestamp: number; // When they watched it
}

// 1. Get the list of unfinished anime
export const getContinueWatching = async (): Promise<HistoryItem[]> => {
  try {
    const json = await AsyncStorage.getItem(HISTORY_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
};

// 2. Save progress when user watches an episode
export const addToHistory = async (anime: any, episodeTitle: string) => {
  try {
    const currentHistory = await getContinueWatching();
    
    // Create new item
    const newItem: HistoryItem = {
      mal_id: anime.mal_id,
      title: anime.title,
      image: anime.images.jpg.large_image_url,
      episode: episodeTitle,
      timestamp: Date.now(),
    };

    // Remove duplicates (if this anime is already in list, remove old entry)
    const filtered = currentHistory.filter(item => item.mal_id !== anime.mal_id);
    
    // Add new item to the TOP of the list
    const updated = [newItem, ...filtered];

    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving history:', error);
  }
};
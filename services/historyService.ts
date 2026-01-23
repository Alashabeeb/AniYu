import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'my_watch_history';

export interface HistoryItem {
  mal_id: number;
  title: string;
  image: string;
  episode: string;      // Episode Title (e.g., "Episode 1")
  episodeId: string;    // ✅ Unique ID for the episode file
  date: number;
  genres?: string[];
  progress: number;     // ✅ Saved time in seconds
  totalDuration: number;// ✅ Total duration in seconds
}

export const getContinueWatching = async (): Promise<HistoryItem[]> => {
  try {
    const json = await AsyncStorage.getItem(HISTORY_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    return [];
  }
};

// ✅ NEW: Save exact progress while watching
export const saveWatchProgress = async (
    anime: any, 
    episode: any, 
    progress: number, 
    totalDuration: number
) => {
  try {
    const current = await getContinueWatching();
    const validHistory = Array.isArray(current) ? current : [];

    // Remove existing entry for this anime to avoid duplicates
    const filtered = validHistory.filter((item) => String(item.mal_id) !== String(anime.mal_id));

    const imageUrl = anime.images?.jpg?.large_image_url || 
                     anime.images?.jpg?.image_url || 
                     'https://via.placeholder.com/150';

    const newItem: HistoryItem = {
      mal_id: anime.mal_id,
      title: anime.title,
      image: imageUrl,
      episode: episode.title || `Episode ${episode.number}`,
      episodeId: String(episode.id || episode.mal_id), // Ensure we have an ID
      date: Date.now(),
      genres: anime.genres || [],
      progress,
      totalDuration
    };

    // Add new item to the top
    const newHistory = [newItem, ...filtered];
    
    // Limit to 20 items
    const slicedHistory = newHistory.slice(0, 20);

    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(slicedHistory));
  } catch (error) {
    console.error("Error saving progress:", error);
  }
};

// Legacy support (optional wrapper if needed, but we prefer saveWatchProgress now)
export const addToHistory = async (anime: any, episodeTitle: string) => {
    // This is now deprecated in favor of saveWatchProgress for the new feature,
    // but kept empty or minimal to prevent crashes if called elsewhere.
};

export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (e) {
    console.error("Error clearing history:", e);
  }
};
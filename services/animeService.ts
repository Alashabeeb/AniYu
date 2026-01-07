import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.jikan.moe/v4/top/anime?limit=15'; // Limit to 15 for speed
const CACHE_KEY = 'cached_anime_data';

export interface Anime {
  mal_id: number;
  title: string;
  images: {
    jpg: {
      image_url: string;
    };
  };
  score: number;
  synopsis?: string;
}

export const getTopAnime = async (): Promise<Anime[]> => {
  try {
    // 1. Try to get data from Phone Storage first (Instant)
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedData) {
      console.log('Loaded from Cache (Fast)');
      // Return cached data immediately, but still fetch new data in background if you want
      return JSON.parse(cachedData);
    }

    // 2. If no cache, fetch from Internet (Slow)
    console.log('Fetching from API...');
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const json = await response.json();
    const animeData = json.data;

    // 3. Save the new data to Phone Storage for next time
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(animeData));

    return animeData;
  } catch (error) {
    console.error('Error in service:', error);
    // If internet fails, try to return cached data as a fallback
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedData) return JSON.parse(cachedData);
    
    throw error;
  }
};
export const getAnimeDetails = async (id: string) => {
  try {
    const response = await fetch(`https://api.jikan.moe/v4/anime/${id}/full`);
    if (!response.ok) throw new Error('Failed to fetch details');
    
    const json = await response.json();
    return json.data;
  } catch (error) {
    console.error('Error fetching details:', error);
    throw error;
  }
};
export const getAnimeEpisodes = async (id: string) => {
  try {
    const response = await fetch(`https://api.jikan.moe/v4/anime/${id}/episodes`);
    if (!response.ok) throw new Error('Failed to fetch episodes');
    
    const json = await response.json();
    return json.data; // Returns an array of episodes
  } catch (error) {
    console.error('Error fetching episodes:', error);
    return []; // Return empty array if fails so app doesn't crash
  }
};
export const searchAnime = async (query: string) => {
  try {
    // We limit to 20 results to keep it fast
    const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=20`);
    
    if (!response.ok) throw new Error('Search failed');

    const json = await response.json();
    return json.data;
  } catch (error) {
    console.error('Error searching anime:', error);
    return [];
  }
};
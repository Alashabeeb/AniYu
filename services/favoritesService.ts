import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebaseConfig'; // ✅ Import Auth

// Base Keys
const FAVORITES_BASE_KEY = 'favorites';
const MANGA_FAVORITES_BASE_KEY = 'manga_favorites';

// ✅ HELPER: Generate a unique key for the current user
const getUserKey = (baseKey: string) => {
  const userId = auth.currentUser?.uid || 'guest';
  return `user_${userId}_${baseKey}`;
};

// --- ANIME FUNCTIONS ---
export const getFavorites = async () => {
  try {
    const key = getUserKey(FAVORITES_BASE_KEY); // ✅ Use Dynamic Key
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    return [];
  }
};

export const toggleFavorite = async (anime: any) => {
  try {
    const favorites = await getFavorites();
    const existingIndex = favorites.findIndex((item: any) => item.mal_id === anime.mal_id);
    
    let newFavorites;
    if (existingIndex >= 0) {
      newFavorites = favorites.filter((item: any) => item.mal_id !== anime.mal_id);
    } else {
      newFavorites = [...favorites, anime];
    }
    
    const key = getUserKey(FAVORITES_BASE_KEY); // ✅ Use Dynamic Key
    await AsyncStorage.setItem(key, JSON.stringify(newFavorites));
    return newFavorites;
  } catch (e) {
    console.error(e);
    return [];
  }
};

// --- MANGA FUNCTIONS ---
export const getMangaFavorites = async () => {
  try {
    const key = getUserKey(MANGA_FAVORITES_BASE_KEY); // ✅ Use Dynamic Key
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    return [];
  }
};

export const toggleMangaFavorite = async (manga: any) => {
  try {
    const favorites = await getMangaFavorites();
    const existingIndex = favorites.findIndex((item: any) => item.mal_id === manga.mal_id);
    
    let newFavorites;
    if (existingIndex >= 0) {
      newFavorites = favorites.filter((item: any) => item.mal_id !== manga.mal_id);
    } else {
      newFavorites = [...favorites, manga];
    }
    
    const key = getUserKey(MANGA_FAVORITES_BASE_KEY); // ✅ Use Dynamic Key
    await AsyncStorage.setItem(key, JSON.stringify(newFavorites));
    return newFavorites;
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const isMangaFavorite = async (mangaId: string | number) => {
    const favs = await getMangaFavorites();
    return favs.some((m: any) => String(m.mal_id) === String(mangaId));
};
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'my_favorites'; // Anime Key
const MANGA_FAVORITES_KEY = 'my_manga_favorites'; // ✅ New Manga Key

// --- ANIME FUNCTIONS (Keep these as is) ---
export const getFavorites = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(FAVORITES_KEY);
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
    
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    return newFavorites;
  } catch (e) {
    console.error(e);
    return [];
  }
};

// --- ✅ NEW: MANGA FUNCTIONS ---
export const getMangaFavorites = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(MANGA_FAVORITES_KEY);
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
    
    await AsyncStorage.setItem(MANGA_FAVORITES_KEY, JSON.stringify(newFavorites));
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
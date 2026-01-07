import AsyncStorage from '@react-native-async-storage/async-storage';

const FAV_KEY = 'my_favorites';

export const getFavorites = async () => {
  try {
    const json = await AsyncStorage.getItem(FAV_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const checkIsFavorite = async (id: number) => {
  const favorites = await getFavorites();
  return favorites.some((item: any) => item.mal_id === id);
};

export const toggleFavorite = async (anime: any) => {
  try {
    const favorites = await getFavorites();
    const existingIndex = favorites.findIndex((i: any) => i.mal_id === anime.mal_id);
    
    let newFavorites;
    let isNowFavorite;

    if (existingIndex >= 0) {
      // Remove it
      newFavorites = favorites.filter((i: any) => i.mal_id !== anime.mal_id);
      isNowFavorite = false;
    } else {
      // Add it
      newFavorites = [anime, ...favorites];
      isNowFavorite = true;
    }
    
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(newFavorites));
    return isNowFavorite;
  } catch (e) {
    console.error(e);
    return false;
  }
};
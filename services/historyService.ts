import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'my_watch_history';
const MANGA_HISTORY_KEY = 'my_manga_history';
const READ_CHAPTERS_KEY = 'my_read_chapters_list_v1'; // ✅ New Key

export interface HistoryItem {
  mal_id: number;
  title: string;
  image: string;
  episode: string;      
  episodeId: string;    
  date: number;
  genres?: string[];
  progress: number;     
  totalDuration: number;
}

export interface MangaHistoryItem {
  mal_id: string;
  title: string;
  image: string;
  chapterTitle: string;
  chapterId: string;
  chapterNum: number;
  page: number; 
  date: number;
}

// --- ANIME HISTORY ---
export const getContinueWatching = async (): Promise<HistoryItem[]> => {
  try {
    const json = await AsyncStorage.getItem(HISTORY_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    return [];
  }
};

export const saveWatchProgress = async (
    anime: any, 
    episode: any, 
    progress: number, 
    totalDuration: number
) => {
  try {
    const current = await getContinueWatching();
    const validHistory = Array.isArray(current) ? current : [];
    const filtered = validHistory.filter((item) => String(item.mal_id) !== String(anime.mal_id));

    const imageUrl = anime.images?.jpg?.large_image_url || 
                     anime.images?.jpg?.image_url || 
                     'https://via.placeholder.com/150';

    const newItem: HistoryItem = {
      mal_id: anime.mal_id,
      title: anime.title,
      image: imageUrl,
      episode: episode.title || `Episode ${episode.number}`,
      episodeId: String(episode.id || episode.mal_id),
      date: Date.now(),
      genres: anime.genres || [],
      progress,
      totalDuration
    };

    const newHistory = [newItem, ...filtered].slice(0, 20);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error("Error saving progress:", error);
  }
};

// --- MANGA CONTINUE READING (Last Chapter) ---
export const getMangaHistory = async (): Promise<MangaHistoryItem[]> => {
  try {
    const json = await AsyncStorage.getItem(MANGA_HISTORY_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    return [];
  }
};

export const saveReadProgress = async (manga: any, chapter: any, page: number) => {
  try {
    // 1. Update "Continue Reading" (Last Chapter only)
    const current = await getMangaHistory();
    const validHistory = Array.isArray(current) ? current : [];
    const filtered = validHistory.filter((item) => String(item.mal_id) !== String(manga.mal_id));

    const imageUrl = manga.images?.jpg?.large_image_url || 
                     manga.images?.jpg?.image_url || 
                     'https://via.placeholder.com/150';

    const newItem: MangaHistoryItem = {
      mal_id: String(manga.mal_id),
      title: manga.title,
      image: imageUrl,
      chapterTitle: chapter.title || `Chapter ${chapter.number}`,
      chapterId: String(chapter.id || chapter.number),
      chapterNum: chapter.number,
      page,
      date: Date.now(),
    };

    const newHistory = [newItem, ...filtered].slice(0, 20); 
    await AsyncStorage.setItem(MANGA_HISTORY_KEY, JSON.stringify(newHistory));

    // 2. ✅ Update "Read Chapters List" (Accumulates all read chapters)
    await markChapterAsRead(manga.mal_id, String(chapter.id || chapter.number));

  } catch (error) {
    console.error("Error saving manga progress:", error);
  }
};

// --- ✅ NEW: TRACK ALL READ CHAPTERS ---
export const getReadChapterIds = async (): Promise<string[]> => {
    try {
        const json = await AsyncStorage.getItem(READ_CHAPTERS_KEY);
        return json ? JSON.parse(json) : [];
    } catch { return []; }
};

export const markChapterAsRead = async (mangaId: string | number, chapterId: string) => {
    try {
        const current = await getReadChapterIds();
        const key = `${mangaId}_${chapterId}`; // Unique Key
        if (!current.includes(key)) {
            const updated = [...current, key];
            await AsyncStorage.setItem(READ_CHAPTERS_KEY, JSON.stringify(updated));
        }
    } catch (e) { console.error(e); }
};

export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
    await AsyncStorage.removeItem(MANGA_HISTORY_KEY);
    await AsyncStorage.removeItem(READ_CHAPTERS_KEY);
  } catch (e) {
    console.error("Error clearing history:", e);
  }
};
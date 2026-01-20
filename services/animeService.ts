import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromCache,
  increment,
  limit,
  orderBy,
  query,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// Fetch all anime (for Trending/Recommendations)
export const getTopAnime = async () => {
  try {
    const animeRef = collection(db, 'anime');
    const q = query(animeRef, limit(20)); 
    
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
          mal_id: doc.id,
          ...doc.data()
        }));
    } catch (networkError) {
        console.warn("Network failed, switching to Offline Cache...");
        const cachedSnapshot = await getDocsFromCache(q);
        return cachedSnapshot.docs.map(doc => ({
          mal_id: doc.id,
          ...doc.data()
        }));
    }
  } catch (error) {
    console.error("Error fetching anime:", error);
    return [];
  }
};

// Fetch details for a specific anime
export const getAnimeDetails = async (id: string) => {
  try {
    const docRef = doc(db, 'anime', id);
    const snapshot = await getDoc(docRef);
    
    if (snapshot.exists()) {
      return { mal_id: snapshot.id, ...snapshot.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching details:", error);
    return null;
  }
};

// ✅ NEW: Increment View Count
export const incrementAnimeView = async (id: string) => {
  try {
    const docRef = doc(db, 'anime', id);
    await updateDoc(docRef, {
      views: increment(1)
    });
  } catch (error) {
    console.error("Error updating view count:", error);
  }
};

// Fetch episodes
export const getAnimeEpisodes = async (id: string) => {
  try {
    const episodesRef = collection(db, 'anime', id, 'episodes');
    const q = query(episodesRef, orderBy('number', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      mal_id: doc.id,
      title: doc.data().title,
      number: doc.data().number,
      url: doc.data().videoUrl,
      thumbnail: doc.data().thumbnailUrl,
      subtitles: doc.data().subtitles || [],
      downloads: doc.data().downloads || 0,
      size: doc.data().size || 0 // ✅ Return the size (bytes)
    }));
  } catch (error) {
    console.error("Error fetching episodes:", error);
    return [];
  }
};

// Search Functionality
export const searchAnime = async (queryText: string) => {
  const allAnime = await getTopAnime();
  return allAnime.filter((a: any) => 
    a.title.toLowerCase().includes(queryText.toLowerCase())
  );
};
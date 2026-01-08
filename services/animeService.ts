import { collection, doc, getDoc, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// Fetch all anime (for Trending/Recommendations)
export const getTopAnime = async () => {
  try {
    const animeRef = collection(db, 'anime');
    // Sort by popularity or just get the first 10
    const q = query(animeRef, limit(20)); 
    const snapshot = await getDocs(q);
    
    // Convert Firebase documents to a list of objects
    return snapshot.docs.map(doc => ({
      mal_id: doc.id, // Use the Firebase Doc ID as the ID
      ...doc.data()
    }));
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

// Fetch episodes (We will store episodes as a sub-collection later)
// For now, let's return a dummy list so the app doesn't crash
export const getAnimeEpisodes = async (id: string) => {
  return [
    { mal_id: 1, title: "Episode 1: The Beginning", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
    { mal_id: 2, title: "Episode 2: The Journey", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
    { mal_id: 3, title: "Episode 3: The Battle", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
  ];
};

// Search Functionality
export const searchAnime = async (queryText: string) => {
  // Simple client-side filtering (Firebase search is complex, this is easier for now)
  const allAnime = await getTopAnime();
  return allAnime.filter((a: any) => 
    a.title.toLowerCase().includes(queryText.toLowerCase())
  );
};
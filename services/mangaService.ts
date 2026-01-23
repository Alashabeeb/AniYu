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

// 1. Get Top Manga
export const getTopManga = async () => {
  try {
    const mangaRef = collection(db, 'manga');
    const q = query(mangaRef, orderBy('views', 'desc'), limit(50));
    
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
    console.error("Error fetching top manga:", error);
    return [];
  }
};

// 2. Get All Manga
export const getAllManga = async () => {
  try {
    const mangaRef = collection(db, 'manga');
    const q = query(mangaRef, orderBy('updatedAt', 'desc'), limit(100));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      mal_id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching all manga:", error);
    return [];
  }
};

// 3. Search Manga
export const searchManga = async (queryText: string) => {
  try {
    const mangaRef = collection(db, 'manga');
    const snapshot = await getDocs(mangaRef);
    const allManga = snapshot.docs.map(doc => ({
      mal_id: doc.id,
      ...doc.data()
    }));
    return allManga.filter((m: any) => 
      m.title && m.title.toLowerCase().includes(queryText.toLowerCase())
    );
  } catch (error) {
    console.error("Error searching manga:", error);
    return [];
  }
};

// 4. Get Manga Details
export const getMangaDetails = async (id: string) => {
  try {
    const docRef = doc(db, 'manga', id);
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

// 5. Get Chapters
export const getMangaChapters = async (id: string) => {
  try {
    const chaptersRef = collection(db, 'manga', id, 'chapters');
    const q = query(chaptersRef, orderBy('number', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id, // Use doc ID for key
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return [];
  }
};

// 6. ✅ NEW: Increment Manga View (Fixes the crash)
export const incrementMangaView = async (id: string) => {
  try {
    const docRef = doc(db, 'manga', id);
    await updateDoc(docRef, {
      views: increment(1)
    });
  } catch (error) {
    console.error("Error updating manga view count:", error);
  }
};
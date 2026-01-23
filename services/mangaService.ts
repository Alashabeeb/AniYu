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
  runTransaction,
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

// 2. ✅ UPDATED: Get All Manga (Added Cache Fallback)
export const getAllManga = async () => {
  try {
    const mangaRef = collection(db, 'manga');
    const q = query(mangaRef, orderBy('updatedAt', 'desc'), limit(100));
    
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
      id: doc.id, 
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return [];
  }
};

// 6. Increment View
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

// 7. Add Manga Review
export const addMangaReview = async (mangaId: string, userId: string, userName: string, rating: number) => {
    try {
        const mangaRef = doc(db, 'manga', mangaId);
        const reviewRef = doc(db, 'manga', mangaId, 'reviews', userId); 

        await runTransaction(db, async (transaction) => {
            const mangaDoc = await transaction.get(mangaRef);
            const reviewDoc = await transaction.get(reviewRef);

            if (!mangaDoc.exists()) throw "Manga does not exist!";

            const data = mangaDoc.data();
            let currentScore = data.score || 0;
            let currentCount = data.scored_by || 0;
            
            let totalPoints = currentScore * currentCount;

            if (reviewDoc.exists()) {
                const oldRating = reviewDoc.data().rating || 0;
                totalPoints = totalPoints - oldRating + rating;
            } else {
                totalPoints = totalPoints + rating;
                currentCount = currentCount + 1; 
            }

            const newScore = currentCount > 0 ? (totalPoints / currentCount) : 0;

            transaction.update(mangaRef, {
                score: parseFloat(newScore.toFixed(1)), 
                scored_by: currentCount
            });

            transaction.set(reviewRef, {
                userId,
                userName: userName || 'Anonymous',
                rating,
                createdAt: new Date().toISOString()
            });
        });

        return true;
    } catch (error) {
        console.error("Error adding rating:", error);
        return false;
    }
};

// 8. Get Reviews
export const getMangaReviews = async (mangaId: string) => {
    try {
        const q = query(collection(db, 'manga', mangaId, 'reviews'), orderBy('createdAt', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching reviews:", e);
        return [];
    }
};
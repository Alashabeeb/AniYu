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
  updateDoc,
  where
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

// Calculate Rank based on Views
export const getAnimeRank = async (currentViews: number) => {
  try {
    const animeRef = collection(db, 'anime');
    const q = query(animeRef, where('views', '>', currentViews));
    const snapshot = await getDocs(q);
    return snapshot.size + 1;
  } catch (error) {
    console.error("Error fetching rank:", error);
    return 'N/A';
  }
};

// Fetch Similar Anime based on Genres
export const getSimilarAnime = async (genres: string[], currentId: string) => {
  try {
    if (!genres || genres.length === 0) return [];
    
    const animeRef = collection(db, 'anime');
    const searchGenres = genres.slice(0, 10); 
    
    const q = query(
        animeRef, 
        where('genres', 'array-contains-any', searchGenres), 
        limit(20)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs
        .map(doc => ({ mal_id: doc.id, ...doc.data() }))
        .filter((a: any) => String(a.mal_id) !== String(currentId));

  } catch (error) {
    console.error("Error fetching similar anime:", error);
    return [];
  }
};

// Increment View Count
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
      size: doc.data().size || 0
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

// ✅ UPDATED: Handle Re-Rating Logic
export const addAnimeReview = async (animeId: string, userId: string, userName: string, rating: number) => {
    try {
        const animeRef = doc(db, 'anime', animeId);
        const reviewRef = doc(db, 'anime', animeId, 'reviews', userId); 

        await runTransaction(db, async (transaction) => {
            const animeDoc = await transaction.get(animeRef);
            const reviewDoc = await transaction.get(reviewRef);

            if (!animeDoc.exists()) throw "Anime does not exist!";

            const data = animeDoc.data();
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

            transaction.update(animeRef, {
                // ✅ CHANGED: toFixed(1) saves as 3.3 instead of 3.33
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

// Get Reviews
export const getAnimeReviews = async (animeId: string) => {
    try {
        const q = query(collection(db, 'anime', animeId, 'reviews'), orderBy('createdAt', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching reviews:", e);
        return [];
    }
};
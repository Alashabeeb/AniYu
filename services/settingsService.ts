import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig'; // Ensure this path is correct

const CONTENT_RATING_KEY = 'user_content_rating';
const RATINGS_ORDER = ['All Ages', '13+', '16+', '18+'];

// --- GLOBAL CONFIG LISTENER (REAL-TIME) ---
export const listenToGlobalSettings = (onUpdate: (settings: any) => void) => {
    try {
        const unsub = onSnapshot(doc(db, "app_config", "global"), (doc) => {
            if (doc.exists()) {
                onUpdate(doc.data());
            }
        });
        return unsub;
    } catch (e) {
        console.error("Error listening to settings:", e);
        return () => {};
    }
};

// --- USER CONTENT RATING ---
export const getContentRating = async () => {
  try {
    const rating = await AsyncStorage.getItem(CONTENT_RATING_KEY);
    return rating || '16+'; 
  } catch (error) {
    return '16+';
  }
};

export const setContentRating = async (rating: string) => {
  try {
    await AsyncStorage.setItem(CONTENT_RATING_KEY, rating);
  } catch (error) {
    console.error("Error saving rating:", error);
  }
};

// --- FILTER LOGIC ---
export const isContentAllowed = (itemRating: string | null, itemGenres: any[], userRating: string): boolean => {
    let itemLevel = 0; 

    const isHentai = itemGenres?.some((g: any) => g.name === 'Hentai' || g.name === 'Erotica' || g.name === 'Harem');
    const isEcchi = itemGenres?.some((g: any) => g.name === 'Ecchi');

    if (itemRating) {
        if (itemRating.includes("Rx")) itemLevel = 3; 
        else if (itemRating.includes("R+")) itemLevel = 3; 
        else if (itemRating.includes("R - 17+")) itemLevel = 2; 
        else if (itemRating.includes("PG-13")) itemLevel = 1; 
        else itemLevel = 0; 
    } else {
        if (isHentai) itemLevel = 3; 
        else if (isEcchi) itemLevel = 2; 
        else itemLevel = 1; 
    }

    const userLevel = RATINGS_ORDER.indexOf(userRating);
    const maxAllowed = userLevel === -1 ? 1 : userLevel;

    return itemLevel <= maxAllowed;
};
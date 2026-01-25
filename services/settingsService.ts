import AsyncStorage from '@react-native-async-storage/async-storage';

const CONTENT_RATING_KEY = 'user_content_rating';

// Supported Ratings in Order of Severity
const RATINGS_ORDER = ['All Ages', '13+', '16+', '18+'];

export const getContentRating = async () => {
  try {
    const rating = await AsyncStorage.getItem(CONTENT_RATING_KEY);
    return rating || '16+'; // Default to 16+
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

// ✅ FILTER LOGIC
export const isContentAllowed = (itemRating: string | null, itemGenres: any[], userRating: string): boolean => {
    // 1. Convert Jikan API Rating Strings to our simpler levels
    // Jikan Anime Ratings: "G - All Ages", "PG - Children", "PG-13 - Teens 13 or older", "R - 17+", "R+ - Mild Nudity", "Rx - Hentai"
    
    let itemLevel = 0; // Default (Safe)

    // Check Genres first (Essential for Manga which lacks rating fields)
    const isHentai = itemGenres?.some((g: any) => g.name === 'Hentai' || g.name === 'Erotica' || g.name === 'Harem');
    const isEcchi = itemGenres?.some((g: any) => g.name === 'Ecchi');

    if (itemRating) {
        if (itemRating.includes("Rx")) itemLevel = 3; // 18+
        else if (itemRating.includes("R+")) itemLevel = 3; // 18+
        else if (itemRating.includes("R - 17+")) itemLevel = 2; // 16+ (We treat R-17 as 16+)
        else if (itemRating.includes("PG-13")) itemLevel = 1; // 13+
        else itemLevel = 0; // All Ages
    } else {
        // Fallback for Manga (which often has no rating field)
        if (isHentai) itemLevel = 3; // 18+
        else if (isEcchi) itemLevel = 2; // 16+ (Treat Ecchi as 16+)
        else itemLevel = 1; // Default to 13+ for unknown manga to be safe, or 0 if you prefer
    }

    // 2. Determine User's Max Allowed Level
    const userLevel = RATINGS_ORDER.indexOf(userRating);
    // If user setting is invalid, default to restricted (0)
    const maxAllowed = userLevel === -1 ? 1 : userLevel;

    // 3. Compare
    // If item level is <= max allowed level, show it.
    return itemLevel <= maxAllowed;
};
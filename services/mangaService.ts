const BASE_URL = 'https://api.jikan.moe/v4';

// 1. Get Top Popular Manga
export const getTopManga = async () => {
    try {
        const response = await fetch(`${BASE_URL}/top/manga?filter=bypopularity&limit=10`);
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error("Error fetching top manga:", error);
        return [];
    }
};

// 2. Get Trending Manhwa (Korean Comics)
export const getTrendingManhwa = async () => {
    try {
        const response = await fetch(`${BASE_URL}/manga?type=manhwa&order_by=popularity&limit=10`);
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error("Error fetching manhwa:", error);
        return [];
    }
};

// 3. Search Manga
export const searchManga = async (query: string) => {
    try {
        const response = await fetch(`${BASE_URL}/manga?q=${query}&limit=20&order_by=popularity&sort=desc`);
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error("Error searching manga:", error);
        return [];
    }
};
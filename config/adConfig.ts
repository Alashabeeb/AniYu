import { TestIds } from 'react-native-google-mobile-ads';

// 🚨 SET THIS TO 'false' BEFORE PUBLISHING TO STORE
// true  = Uses Google's Test IDs (Safe for development)
// false = Uses Your Real Ad IDs (For production)
const IS_TEST_MODE = true; 

export const AdConfig = {
  // App Open Ad (Launch)
  appOpen: IS_TEST_MODE ? TestIds.APP_OPEN : 'ca-app-pub-3940256099942544~3347511713', // Replace string with REAL ID

  // Banner Ad (Home, Feed)
  banner: IS_TEST_MODE ? TestIds.BANNER : 'ca-app-pub-3940256099942544~6300978111', // Replace string with REAL ID

  // Interstitial Ad (Downloads, Next Chapter)
  interstitial: IS_TEST_MODE ? TestIds.INTERSTITIAL : 'ca-app-pub-3940256099942544~1033173712', // Replace string with REAL ID
};
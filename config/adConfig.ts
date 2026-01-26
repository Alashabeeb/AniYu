import { TestIds } from 'react-native-google-mobile-ads';

// 🚨 SET THIS TO 'false' BEFORE PUBLISHING TO STORE
// true  = Uses Google's Test IDs (Safe for development)
// false = Uses Your Real Ad IDs (For production)
const IS_TEST_MODE = true; 

export const AdConfig = {
  // App Open Ad (Launch)
  appOpen: IS_TEST_MODE ? TestIds.APP_OPEN : 'ca-app-pub-9826157970378029/1984471716', // Replace string with REAL ID

  // Banner Ad (Home, Feed)
  banner: IS_TEST_MODE ? TestIds.BANNER : 'ca-app-pub-9826157970378029/5596413660', // Replace string with REAL ID

  // Interstitial Ad (Downloads, Next Chapter)
  interstitial: IS_TEST_MODE ? TestIds.INTERSTITIAL : 'ca-app-pub-9826157970378029/4601567208', // Replace string with REAL ID
};
export default {
  expo: {
    name: "AniYu",
    slug: "AniYu",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "aniyu",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.aniyu.app"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      package: "com.aniyu.app"
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ],
      "expo-video",
      "expo-font",
      // ✅ FIXED: Keys changed from 'android_app_id' to 'androidAppId'
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-3940256099942544~3347511713",
          "iosAppId": "ca-app-pub-3940256099942544~1458002511"
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      router: {
        origin: false
      },
      eas: {
        // ✅ ADDED: Required for "eas build" to work
        projectId: "6b64dac3-7900-41fd-9178-5903526532a4"
      }
    }
  }
};
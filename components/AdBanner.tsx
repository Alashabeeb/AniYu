import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AdConfig } from '../config/adConfig'; // ✅ Import Config

export default function AdBanner() {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AdConfig.banner} // ✅ Use Central Config
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
    width: '100%',
  },
});
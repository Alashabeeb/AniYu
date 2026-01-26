import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AdConfig } from '../config/adConfig';

export default function AdBanner() {
  const [error, setError] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AdConfig.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
            console.log("✅ Banner Ad Loaded Successfully!");
            setError(null);
        }}
        onAdFailedToLoad={(err) => {
            console.error("❌ Banner Ad Failed:", err);
            setError(`Ad Error: ${err.message}`);
        }}
      />
      {/* If there is an error, show it in red text so we can see it on the phone */}
      {error && (
        <View style={{padding: 10, backgroundColor: '#ffe6e6'}}>
          <Text style={{color: 'red', fontSize: 12, textAlign: 'center'}}>
            {error}
          </Text>
          <Text style={{color: '#333', fontSize: 10, textAlign: 'center', marginTop: 4}}>
            Unit ID: {AdConfig.banner}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
    width: '100%',
    minHeight: 50, // Ensure it takes up space even if empty
  },
});
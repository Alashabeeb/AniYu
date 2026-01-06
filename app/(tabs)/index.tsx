import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import HeroCarousel from '../../components/HeroCarousel';
import TrendingRail from '../../components/TrendingRail';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* 1. Hero Section */}
        <HeroCarousel />

        {/* 2. Trending Section */}
        <TrendingRail />

        {/* 3. Another Section (Example) */}
        <View style={{ marginTop: 10 }}>
            <Text style={{color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 20, marginBottom: 15}}>
                New Releases
            </Text>
            {/* You can reuse TrendingRail here with different data later */}
             <TrendingRail />
        </View>

        {/* Bottom Padding for scroll */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
});
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // NEW
export default function ComicScreen() {
  return (
    <SafeAreaView style={styles.container}>
       <View style={styles.content}>
        <Text style={styles.text}>Comic Tab: Read Manga</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: 'white' }
});
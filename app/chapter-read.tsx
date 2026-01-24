import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';

export default function MangaReaderScreen() {
  const { url, title } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);

  if (!url) return null;

  // ✅ URL FIXER: Re-encode the Firebase path if it was decoded by the router
  // This prevents the "400 Bad Request" error
  let fixedUrl = url as string;
  if (fixedUrl.includes('firebasestorage.googleapis.com') && fixedUrl.includes('/o/')) {
      const parts = fixedUrl.split('?');
      const baseUrl = parts[0];
      const queryParams = parts.slice(1).join('?');
      const oIndex = baseUrl.indexOf('/o/');
      if (oIndex !== -1) {
          const prefix = baseUrl.substring(0, oIndex + 3);
          const path = baseUrl.substring(oIndex + 3);
          fixedUrl = `${prefix}${encodeURIComponent(decodeURIComponent(path))}?${queryParams}`;
      }
  }

  // ✅ Efficient PDF.js Viewer (Requires CORS to be enabled)
  const pdfViewerHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
      <script>pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';</script>
      <style>
        body { margin: 0; padding: 0; background-color: #121212; display: flex; flex-direction: column; align-items: center; }
        canvas { margin-bottom: 0px; display: block; max-width: 100%; height: auto; }
        .loading { color: #888; font-family: sans-serif; margin-top: 50%; font-size: 16px; }
      </style>
    </head>
    <body>
      <div id="container">
        <div class="loading">Loading Chapter...</div>
      </div>
      <script>
        const url = '${fixedUrl}';
        const container = document.getElementById('container');

        pdfjsLib.getDocument(url).promise.then(async pdf => {
          container.innerHTML = ''; 
          
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            await pdf.getPage(pageNum).then(page => {
              const viewport = page.getViewport({ scale: 2.0 });
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              canvas.style.width = '100%';
              container.appendChild(canvas);
              
              const renderContext = {
                canvasContext: context,
                viewport: viewport
              };
              return page.render(renderContext).promise;
            });
          }
          window.ReactNativeWebView.postMessage("Loaded");
        }).catch(err => {
          container.innerHTML = '<div style="color:red; margin-top:20px; text-align:center;">Error: ' + err.message + '<br><br>CORS not enabled on bucket.</div>';
        });
      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: 'black' }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Chapter'}</Text>
          <View style={{ width: 40 }} /> 
      </View>
      <View style={{ flex: 1, backgroundColor: '#121212' }}>
          {loading && (
              <View style={styles.loader}>
                  <ActivityIndicator size="large" color={theme.tint} />
              </View>
          )}
          <WebView
            originWhitelist={['*']}
            source={{ html: pdfViewerHtml }}
            style={{ flex: 1, backgroundColor: '#121212' }}
            onMessage={(event) => { if (event.nativeEvent.data === "Loaded") setLoading(false); }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 60, backgroundColor: 'rgba(0,0,0,0.8)' },
  backBtn: { padding: 5 },
  headerTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  loader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black', zIndex: 5 }
});
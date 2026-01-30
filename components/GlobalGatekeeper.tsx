import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { listenToGlobalSettings } from '../services/settingsService';

export default function GlobalGatekeeper() {
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [forceUpdate, setForceUpdate] = useState(false);
    const [storeUrl, setStoreUrl] = useState('');

    useEffect(() => {
        // 1. Listen to Firestore changes
        const unsub = listenToGlobalSettings((data) => {
            if (!data) return;

            setMaintenanceMode(data.maintenanceMode || false);
            
            // 2. Check for Forced Update
            if (data.minVersion) {
                const currentVersion = Constants.expoConfig?.version || "1.0.0";
                
                // Compare: Is current version older than required?
                if (isVersionOlder(currentVersion, data.minVersion)) {
                    setForceUpdate(true);
                    
                    // Determine Store URL
                    const url = Platform.OS === 'ios' 
                        ? data.iosStoreUrl || 'https://apps.apple.com' 
                        : data.androidStoreUrl || 'https://play.google.com';
                    setStoreUrl(url);
                } else {
                    setForceUpdate(false);
                }
            }
        });

        return () => unsub();
    }, []);

    // Helper: Compare Versions (e.g., "1.0.0" < "1.0.5")
    const isVersionOlder = (current: string, required: string) => {
        const v1 = current.split('.').map(Number);
        const v2 = required.split('.').map(Number);
        for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
            const num1 = v1[i] || 0;
            const num2 = v2[i] || 0;
            if (num1 < num2) return true;
            if (num1 > num2) return false;
        }
        return false;
    };

    const handleOpenStore = () => {
        if (storeUrl) Linking.openURL(storeUrl);
    };

    // --- SCREEN 1: MAINTENANCE MODE (Your original code) ---
    if (maintenanceMode) {
        return (
            <Modal visible={true} animationType="fade">
                <View style={styles.container}>
                    <Ionicons name="construct" size={80} color="#FF6B6B" />
                    <Text style={styles.title}>Under Maintenance</Text>
                    <Text style={styles.subtitle}>
                        We are currently improving AniYu to serve you better. Please check back shortly.
                    </Text>
                    <TouchableOpacity style={styles.btn} onPress={() => Linking.openURL('https://x.com/AniYuApp')}>
                        <Text style={styles.btnText}>Check Updates on X</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    // --- SCREEN 2: FORCE UPDATE (The New Rocket UI) ---
    if (forceUpdate) {
        return (
            <Modal visible={true} animationType="slide">
                <View style={styles.container}>
                    <Ionicons name="rocket" size={80} color="#2563eb" />
                    <Text style={styles.title}>Update Required</Text>
                    <Text style={styles.subtitle}>
                        A new version of AniYu is available! To continue watching, please update to the latest version.
                    </Text>
                    
                    <View style={styles.versionBadge}>
                        <Text style={styles.versionText}>Current: {Constants.expoConfig?.version}</Text>
                    </View>
                    
                    <TouchableOpacity style={[styles.btn, { backgroundColor: '#2563eb' }]} onPress={handleOpenStore}>
                        <Text style={styles.btnText}>Update Now</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    return null; // Render nothing if everything is fine
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#1a1a1a', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 30 
    },
    title: { 
        fontSize: 28, 
        fontWeight: 'bold', 
        color: 'white', 
        marginTop: 20, 
        marginBottom: 10 
    },
    subtitle: { 
        fontSize: 16, 
        color: '#aaa', 
        textAlign: 'center', 
        lineHeight: 24, 
        marginBottom: 30 
    },
    btn: { 
        backgroundColor: '#FF6B6B', 
        paddingHorizontal: 30, 
        paddingVertical: 15, 
        borderRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5
    },
    btnText: { 
        color: 'white', 
        fontWeight: 'bold', 
        fontSize: 16 
    },
    // New styles for the Update Badge
    versionBadge: {
        backgroundColor: '#333',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 30
    },
    versionText: {
        color: '#888',
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
    }
});
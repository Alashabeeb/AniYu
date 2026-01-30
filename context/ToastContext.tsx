import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastContextType {
  showToast: (title: string, message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ✅ Custom Hook to use the toast anywhere
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [toastConfig, setToastConfig] = useState({ title: '', message: '', type: 'info' as ToastType });
  
  // Animation Value (Starts off-screen)
  const slideAnim = useRef(new Animated.Value(-150)).current; 

  const showToast = useCallback((title: string, message: string, type: ToastType = 'info') => {
    setToastConfig({ title, message, type });
    setVisible(true);

    // 1. Slide In
    Animated.spring(slideAnim, {
      toValue: insets.top + 10, // Drop down just below the status bar/notch
      useNativeDriver: true,
      speed: 12,
      bounciness: 8
    }).start();

    // 2. Auto Hide after 4 seconds
    setTimeout(hideToast, 4000);
  }, [insets.top]);

  const hideToast = () => {
    Animated.timing(slideAnim, {
      toValue: -200, // Slide back up
      duration: 300,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  // Color Coding
  const getColors = () => {
    switch (toastConfig.type) {
      case 'success': return { bg: '#10B981', icon: 'checkmark-circle' };
      case 'error': return { bg: '#EF4444', icon: 'alert-circle' };
      case 'warning': return { bg: '#F59E0B', icon: 'warning' };
      default: return { bg: '#3B82F6', icon: 'information-circle' };
    }
  };

  const { bg, icon } = getColors();

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity style={[styles.toastCard, { backgroundColor: bg }]} onPress={hideToast} activeOpacity={0.9}>
            <View style={styles.iconContainer}>
               <Ionicons name={icon as any} size={28} color="white" />
            </View>
            <View style={styles.textContainer}>
               <Text style={styles.title}>{toastConfig.title}</Text>
               <Text style={styles.message} numberOfLines={2}>{toastConfig.message}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999, // Ensure it sits on top of everything (even Modals)
  },
  toastCard: {
    width: '90%',
    maxWidth: 400,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 2,
  },
  message: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.95,
  }
});
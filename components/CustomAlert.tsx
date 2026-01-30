import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CustomAlertProps {
  visible: boolean;
  type?: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose: () => void;
  // ✅ NEW: Optional Secondary Button Props
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
}

export default function CustomAlert({ 
  visible, 
  type = 'info', 
  title, 
  message, 
  onClose,
  secondaryButtonText,
  onSecondaryPress 
}: CustomAlertProps) {
  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return { name: 'checkmark-circle', color: '#10b981' };
      case 'error': return { name: 'alert-circle', color: '#ef4444' };
      case 'warning': return { name: 'warning', color: '#f59e0b' };
      default: return { name: 'information-circle', color: '#3b82f6' };
    }
  };

  const iconData = getIcon();

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <View style={[styles.iconCircle, { backgroundColor: `${iconData.color}20` }]}>
            <Ionicons name={iconData.name as any} size={32} color={iconData.color} />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          {/* Primary Button */}
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: iconData.color }]} 
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Okay</Text>
          </TouchableOpacity>

          {/* ✅ NEW: Secondary Button (Only shows if text is provided) */}
          {secondaryButtonText && onSecondaryPress && (
            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={onSecondaryPress}
              activeOpacity={0.6}
            >
              <Text style={[styles.secondaryButtonText, { color: '#6b7280' }]}>
                {secondaryButtonText}
              </Text>
            </TouchableOpacity>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // ✅ Styles for Secondary Button
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  }
});
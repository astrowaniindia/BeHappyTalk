import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';

export default function Permissions() {
  const router = useRouter();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleContinue = async () => {
    setIsRequesting(true);
    try {
      // 1. Request Camera & Microphone Permissions via Expo
      const camRes = await requestCameraPermission();
      const micRes = await requestMicPermission();

      if (camRes.granted && micRes.granted) {
        router.replace('/home');
      } else {
        Alert.alert("Permissions Required", "Please grant Camera and Microphone access to use calling features.");
      }
    } catch (error) {
       console.error("Permission Error:", error);
       router.replace('/home'); // Fallback
    } finally {
       setIsRequesting(false);
    }
  };

  const permissionsList = [
    {
      id: 'mic',
      icon: 'microphone',
      title: 'Microphone',
      subtitle: 'so that you can Call'
    },
    {
      id: 'camera',
      icon: 'video',
      title: 'Camera',
      subtitle: 'so that you can Video Call'
    },
    {
      id: 'phone',
      icon: 'phone',
      title: 'Phone',
      subtitle: 'so that you can receive Call'
    },
    {
      id: 'notification',
      icon: 'bell',
      title: 'Notification',
      subtitle: 'so that you can receive Chat'
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/home')}>
            <Text style={styles.skipText}>skip now</Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.mainTitle}>Permissions Required</Text>

        {/* Permission Cards */}
        <View style={styles.listContainer}>
          {permissionsList.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name={item.icon as any} size={28} color="#FACC15" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.button, isRequesting && { opacity: 0.6 }]} 
            onPress={handleContinue}
            disabled={isRequesting}
          >
            <Text style={styles.buttonText}>{isRequesting ? 'Granting...' : 'Grant Permissions'}</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000', 
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 16,
    paddingBottom: 24,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  mainTitle: {
    color: '#FACC15',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  listContainer: {
    gap: 16,
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 16,
    backgroundColor: 'rgba(26, 28, 35, 0.4)'
  },
  iconContainer: {
    width: 48,
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#FACC15',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: 'rgba(255, 255, 255, 0.70)',
    fontSize: 14,
  },
  footer: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
    paddingTop: 20,
  },
  button: {
    borderWidth: 1,
    borderColor: '#FACC15',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#111111', 
  },
  buttonText: {
    color: '#FACC15',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

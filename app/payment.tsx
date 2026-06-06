import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PaymentComingSoon() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Money</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconBox}>
           <MaterialCommunityIcons name="wallet-plus-outline" size={64} color="#FACC15" />
        </View>
        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.subtitle}>Our secure payment gateway is currently under construction and will be available very soon.</Text>
        
        <TouchableOpacity style={styles.returnButton} onPress={() => router.back()}>
          <Text style={styles.returnButtonText}>Return to Wallet</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0A0A', paddingVertical: 16, paddingHorizontal: 16, justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backButton: { padding: 4 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconBox: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(250, 204, 21, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 12 },
  subtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  returnButton: { backgroundColor: '#FACC15', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, width: '100%', alignItems: 'center' },
  returnButtonText: { color: '#000000', fontSize: 16, fontWeight: 'bold' }
});

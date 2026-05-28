import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function UserCare() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{marginRight: 16}}>
            <MaterialIcons name="arrow-back" size={24} color="rgba(255, 255, 255, 0.92)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Care</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>Please choose a relevant category</Text>

          <View style={styles.grid}>
            {/* Top Row */}
            <View style={styles.row}>
              <TouchableOpacity style={styles.gridItem}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="wallet-outline" size={28} color="#FACC15" />
                </View>
                <Text style={styles.iconText}>Recharge</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridItem}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="google-play" size={28} color="#FACC15" />
                </View>
                <Text style={styles.iconText}>Playstore</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridItem}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="receipt" size={28} color="#FACC15" />
                </View>
                <Text style={styles.iconText}>Wrong Debit</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Row */}
            <View style={[styles.row, { justifyContent: 'center', gap: 32, marginTop: 24 }]}>
              <TouchableOpacity style={styles.gridItem}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="android" size={28} color="#FACC15" />
                </View>
                <Text style={styles.iconText}>Android</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridItem}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="account-cancel-outline" size={32} color="#FACC15" />
                </View>
                <Text style={styles.iconText}>Misconduct</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.footerLink}>
            <Text style={styles.footerLinkText}>Previous Queries</Text>
          </TouchableOpacity>

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#000000' },
  headerTitle: { color: 'rgba(255, 255, 255, 0.70)', fontSize: 18, fontWeight: '500' },
  content: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  subtitle: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 14, marginBottom: 40 },
  grid: { width: '100%', marginBottom: 80 },
  row: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  gridItem: { alignItems: 'center', width: 80 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: '#FACC15', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  iconText: { color: 'rgba(255, 255, 255, 0.70)', fontSize: 12 },
  footerLink: { marginTop: 'auto', marginBottom: 60 },
  footerLinkText: { color: '#FACC15', fontSize: 14, fontWeight: 'bold', textDecorationLine: 'underline' }
});

import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const Colors = {
  primary: '#1B76FF',
  white: '#FFFFFF',
  textDark: '#1A2A44',
  textLight: '#6B7A99',
  background: '#F4F7FB',
  border: '#E2E8F0',
};

export default function SupportScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleAction = (type: string) => {
    // Navigate or trigger action
    router.push('/coming-soon');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      >
        
        {/* Contact Banner */}
        <View style={styles.bannerCard}>
          <Ionicons name="headset" size={48} color={Colors.white} />
          <Text style={styles.bannerTitle}>We're here to help!</Text>
          <Text style={styles.bannerSubtitle}>Get assistance with payouts, user disputes, or technical issues.</Text>
        </View>

        <Text style={styles.sectionLabel}>Common Topics</Text>

        {/* Action List */}
        <TouchableOpacity style={styles.actionCard} onPress={() => handleAction('payout')}>
          <View style={[styles.iconBox, { backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="wallet-outline" size={24} color="#4F46E5" />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Payment & Withdrawals</Text>
            <Text style={styles.actionDesc}>Issues with your earnings or bank transfers</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => handleAction('report')}>
          <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="warning-outline" size={24} color="#EF4444" />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Report a User</Text>
            <Text style={styles.actionDesc}>Report abusive behavior or policy violations</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => handleAction('tech')}>
          <View style={[styles.iconBox, { backgroundColor: '#E6FFFA' }]}>
            <Ionicons name="hardware-chip-outline" size={24} color="#0D9488" />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Technical Support</Text>
            <Text style={styles.actionDesc}>App bugs, camera issues, or connectivity</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.chatButton} onPress={() => handleAction('livechat')}>
          <Ionicons name="chatbubbles" size={24} color={Colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.chatButtonText}>Start Live Chat with Admin</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 40, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark },
  content: { flex: 1, padding: 20 },
  bannerCard: { backgroundColor: Colors.primary, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  bannerTitle: { color: Colors.white, fontSize: 20, fontWeight: 'bold', marginTop: 12, marginBottom: 8 },
  bannerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', color: Colors.textDark, marginBottom: 16, marginLeft: 4 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: 'bold', color: Colors.textDark, marginBottom: 4 },
  actionDesc: { fontSize: 13, color: Colors.textLight },
  chatButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.textDark, padding: 16, borderRadius: 16, marginTop: 24, marginBottom: 40 },
  chatButtonText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
});

import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const SOCKET_URL = 'https://provider.behappytalk.com';

const Colors = {
  primary: '#1B76FF',
  white: '#FFFFFF',
  textDark: '#1A2A44',
  textLight: '#6B7A99',
  background: '#F4F7FB',
  success: '#10B981',
  danger: '#EF4444',
  border: '#E2E8F0',
};

export default function AudioCallsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // Fetch audio call history
  const loadHistory = async () => {
    try {
      setRefreshing(true);
      const dataStr = await AsyncStorage.getItem('providerData');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      const res = await axios.get(`${SOCKET_URL}/api/provider/history/${data.id}`);
      if (res.data) {
        // Filter only audio calls
        const audioCalls = res.data.filter((s: any) => {
          const t = (s.type || '').toLowerCase();
          return t === 'audio' || t === 'call';
        }).map((s: any) => ({
          id: s.id,
          date: s.startTime || new Date().toISOString(),
          userName: s.userName || 'Unknown User',
          duration: s.duration || 0,
          earning: ((s.cost || 0) / 2).toFixed(2),
        }));
        setHistory(audioCalls);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
    }, [])
  );

  const onRefresh = React.useCallback(() => {
    loadHistory();
  }, []);

  // Idle State (History)
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Audio Calls</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.idleContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />}
      >
        <View style={{ alignItems: 'center', padding: 32 }}>
          <View style={styles.waitingCircle}>
            <Ionicons name="call" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.idleTitle}>Audio Sessions</Text>
          <Text style={styles.idleSubtitle}>
            Incoming audio calls are delivered on your Dashboard while you're online. View your call history below.
          </Text>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Recent Audio Calls</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>No audio calls yet.</Text>
          ) : (
            history.map((item, index) => (
              <View key={item.id || index} style={styles.historyCard}>
                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>Date</Text>
                  <Text style={styles.historyValue}>{new Date(item.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Text>
                </View>
                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>User</Text>
                  <Text style={styles.historyValue}>{item.userName}</Text>
                </View>
                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>Duration</Text>
                  <Text style={styles.historyValue}>{item.duration} mins</Text>
                </View>
                <View style={[styles.historyRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.historyLabel}>Earnings</Text>
                  <Text style={[styles.historyValue, { color: Colors.success }]}>₹{item.earning}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 40, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark },

  // Idle State
  idleContent: { flexGrow: 1, paddingBottom: 40 },
  waitingCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E6EFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  idleTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark, marginBottom: 12 },
  idleSubtitle: { fontSize: 15, color: Colors.textLight, textAlign: 'center', lineHeight: 22 },

  historySection: { paddingHorizontal: 20 },
  historyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark, marginBottom: 16 },
  emptyText: { color: Colors.textLight, textAlign: 'center', marginTop: 10 },
  historyCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  historyLabel: { color: Colors.textLight, fontSize: 14 },
  historyValue: { color: Colors.textDark, fontSize: 14, fontWeight: '600' },
});

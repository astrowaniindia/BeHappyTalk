import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const Colors = {
  primary: '#1B76FF',
  white: '#FFFFFF',
  textDark: '#1A2A44',
  textLight: '#6B7A99',
  background: '#F4F7FB',
  border: '#E2E8F0',
  pillBg: '#FFFFFF',
  pillText: '#6B7A99',
};

const API_URL = 'http://192.168.29.168:3000';

export default function SessionsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'All' | 'Chat' | 'Audio Call' | 'Video Call'>('All');
  const [sessions, setSessions] = useState<any[]>([]); // Empty array, awaiting real data
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const fetchSessions = async () => {
    try {
      const dataStr = await AsyncStorage.getItem('providerData');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        const res = await axios.get(`${API_URL}/api/provider/history/${data.id}`);
        if (res.data) {
          // Map backend 'type' to our UI 'mediaType' string, and calculate earning
          const mapped = res.data.map((s: any) => ({
            id: s.id,
            date: s.startTime || new Date().toISOString(),
            userName: s.userName || 'Unknown User',
            mediaType: s.type === 'video' ? 'Video Call' : s.type === 'audio' ? 'Audio Call' : 'Chat',
            duration: s.duration || 0,
            earning: (s.rate * (s.duration || 0) * 0.5).toFixed(2),
          }));
          setSessions(mapped);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSessions();
    setRefreshing(false);
  };

  const filteredSessions = sessions.filter(s => {
    if (filter === 'All') return true;
    return s.mediaType === filter;
  });

  const renderFilterPill = (title: 'All' | 'Chat' | 'Audio Call' | 'Video Call') => {
    const isActive = filter === title;
    return (
      <TouchableOpacity 
        style={[styles.filterPill, isActive && styles.filterPillActive]}
        onPress={() => setFilter(title)}
      >
        <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{title}</Text>
      </TouchableOpacity>
    );
  };

  const renderSessionItem = ({ item }: { item: any }) => {
    return (
      <View style={styles.sessionCard}>
        <View style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>Date & Time</Text>
          <Text style={styles.sessionValue}>{new Date(item.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Text>
        </View>
        <View style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>User</Text>
          <Text style={styles.sessionValue}>{item.userName}</Text>
        </View>
        <View style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>Type</Text>
          <Text style={styles.sessionValue}>{item.mediaType}</Text>
        </View>
        <View style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>Duration</Text>
          <Text style={styles.sessionValue}>{item.duration} mins</Text>
        </View>
        <View style={[styles.sessionRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
          <Text style={styles.sessionLabel}>Earnings (50%)</Text>
          <Text style={[styles.sessionValue, { color: '#10B981', fontWeight: 'bold' }]}>₹{item.earning}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sessions History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <FlatList 
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All', 'Chat', 'Audio Call', 'Video Call'] as const}
          keyExtractor={(item) => item}
          renderItem={({ item }) => renderFilterPill(item)}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        />
      </View>

      {/* List */}
      <FlatList
        data={filteredSessions}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderSessionItem}
        contentContainerStyle={[styles.listContent, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={Colors.textLight} style={{ opacity: 0.3 }} />
            <Text style={styles.emptyText}>No verified sessions recorded yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 40,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  filterContainer: {
    paddingVertical: 16,
    backgroundColor: Colors.background,
  },
  filterPill: {
    backgroundColor: Colors.pillBg,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    color: Colors.pillText,
    fontWeight: '600',
    fontSize: 14,
  },
  filterTextActive: {
    color: Colors.white,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sessionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sessionLabel: {
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: '500',
  },
  sessionValue: {
    color: Colors.textDark,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    color: Colors.textLight,
    fontSize: 15,
    fontWeight: '500',
  },
});

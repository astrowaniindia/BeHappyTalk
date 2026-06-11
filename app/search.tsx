import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_URL, secureFetch, SOCKET_URL } from '../constants/ServerConfig';
import io from 'socket.io-client';

export default function Search() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    fetchProviders();

    const socket = io(SOCKET_URL);
    socket.on('provider_status_changed', ({ providerId, state }) => {
      setProviders(prev => prev.map(p => {
        if (p.id === providerId) {
          return { ...p, status: state.status || (state.isOnline ? (state.isTalking ? 'busy' : 'online') : 'offline'), busyUntil: state.busyUntil };
        }
        return p;
      }));
    });

    return () => socket.disconnect();
  }, []);

  const fetchProviders = async () => {
    try {
      const data = await secureFetch(`${API_URL}/providers?t=${Date.now()}`).then(r => r.json());
      
      const providerList = data.providers || data;
      const formattedProviders = providerList.map(p => ({
        ...p,
        image: p.imagePath ? { uri: p.imagePath } : require('../assets/images/placeholder.png'),
        exp: p.experience || p.exp || 0,
        langs: p.language || p.langs || 'English'
      }));
      setProviders(formattedProviders);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredProviders = () => {
    let filtered = providers;

    if (activeFilter !== 'All') {
      if (activeFilter === 'Male' || activeFilter === 'Female') {
        filtered = filtered.filter(p => p.demographic?.toLowerCase().includes(activeFilter.toLowerCase()) || p.gender?.toLowerCase() === activeFilter.toLowerCase());
      } else {
        filtered = filtered.filter(p => p.tagline?.toLowerCase().includes(activeFilter.toLowerCase()) || p.langs?.toLowerCase().includes(activeFilter.toLowerCase()) || p.demographic?.toLowerCase().includes(activeFilter.toLowerCase()));
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(q) || 
        p.langs?.toLowerCase().includes(q) ||
        p.demographic?.toLowerCase().includes(q) ||
        p.tagline?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  const renderProvider = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.providerCard} onPress={() => router.push(`/provider/${item.id}`)} activeOpacity={0.8}>
      <View style={styles.providerHeader}>
        <View style={styles.providerAvatarCt}>
          <Image source={item.image} style={styles.providerAvatar} />
          <View style={[styles.statusDot, { backgroundColor: item.status === 'online' ? '#34D399' : (item.status === 'busy' ? '#FACC15' : '#EF4444') }]} />
        </View>
        <View style={styles.providerMeta}>
          <View style={styles.nameRow}>
            <Text style={styles.providerName}>{item.name}</Text>
            {item.status === 'online' && <Text style={{color: '#34D399', fontSize: 11, fontWeight: 'bold', marginLeft: 4}}>Online</Text>}
            {item.status === 'busy' && <Text style={{color: '#FACC15', fontSize: 11, fontWeight: 'bold', marginLeft: 4, fontStyle: 'italic'}}>{item.busyUntil && (item.busyUntil - Date.now()) > 0 ? `Busy (~${Math.ceil((item.busyUntil - Date.now()) / 60000)}m)` : 'Talking...'}</Text>}
            {item.status === 'offline' && <Text style={{color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 'bold', marginLeft: 4}}>Offline</Text>}
          </View>
          <Text style={styles.providerDemo}>{item.demographic}</Text>
          <Text style={styles.providerRating}>
            {item.rating || 5.0}{' '}
            <MaterialIcons name="star" size={12} color="rgba(255,255,255,0.45)" />{' '}
            <Text style={styles.reviewsText}>({item.reviews || 0})</Text>
          </Text>
        </View>
      </View>

      <Text style={styles.providerTagline}>{item.tagline}</Text>

      <View style={styles.providerFooter}>
        <View style={styles.providerStats}>
          <Text style={styles.providerStatText}>Exp: {item.exp} yrs</Text>
          <Text style={styles.providerStatText}>{item.langs}</Text>
        </View>
        {item.status === 'busy' ? (
          <View style={styles.busyAction}>
            <Text style={styles.waitTime}>Wait ~ {item.waitTime || '5m'}</Text>
            <TouchableOpacity style={styles.bellButton}>
              <MaterialCommunityIcons name="bell" size={24} color="#FBBF24" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.talkButton} onPress={() => router.push(`/provider/${item.id}`)}>
            <Text style={styles.talkButtonText}>Talk Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        
        {/* Search Input Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{marginRight: 12}}>
            <Feather name="arrow-left" size={24} color="rgba(255, 255, 255, 0.92)" />
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#FDE047" style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Name, Language, Location, Experience..."
              placeholderTextColor="rgba(255, 255, 255, 0.25)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={20} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
            )}
          </View>
        </View>



        {loading ? (
           <ActivityIndicator size="large" color="#FACC15" style={{ marginTop: 40 }} />
        ) : (
           <FlatList
             data={getFilteredProviders()}
             keyExtractor={item => item.id.toString()}
             renderItem={renderProvider}
             contentContainerStyle={styles.listContent}
             keyboardShouldPersistTaps="handled"
             ListEmptyComponent={<Text style={styles.emptyText}>No providers found matching your search.</Text>}
           />
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 24, paddingHorizontal: 16, height: 48, backgroundColor: '#111' },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, color: 'rgba(255, 255, 255, 0.92)', fontSize: 15 },
  filterSection: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  tagsContainer: { flexDirection: 'row', gap: 10, paddingRight: 20 },
  tagBadge: { backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  tagBadgeActive: { backgroundColor: '#FDE047', borderColor: '#FDE047' },
  tagText: { color: 'rgba(255, 255, 255, 0.70)', fontSize: 13, fontWeight: '600' },
  tagTextActive: { color: '#000', fontWeight: 'bold' },
  listContent: { padding: 16, gap: 16 },
  emptyText: { color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 40, fontSize: 15 },

  providerCard: { backgroundColor: '#111111', borderRadius: 12, padding: 16 },
  providerHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  providerAvatarCt: { position: 'relative' },
  providerAvatar: { width: 64, height: 64, borderRadius: 32 },
  statusDot: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#111111' },
  providerMeta: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  providerName: { color: 'rgba(255,255,255,0.92)', fontSize: 16, fontWeight: 'bold' },
  providerDemo: { color: 'rgba(255,255,255,0.70)', fontSize: 14 },
  providerRating: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  reviewsText: { color: 'rgba(255,255,255,0.25)' },
  providerTagline: { color: 'rgba(255,255,255,0.70)', fontSize: 14, lineHeight: 20, marginBottom: 20 },
  providerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  providerStats: { gap: 4 },
  providerStatText: { color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: '600' },
  talkButton: { borderWidth: 1, borderColor: '#FACC15', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  talkButtonText: { color: '#FACC15', fontSize: 14, fontWeight: 'bold' },
  busyAction: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waitTime: { color: '#EF4444', fontSize: 12, backgroundColor: '#EF444420', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, overflow: 'hidden' },
  bellButton: { borderWidth: 1, borderColor: '#FBBF24', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
});

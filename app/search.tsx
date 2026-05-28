import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar, TextInput, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Search() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

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
              placeholder="Name, Clarity id, or Language"
              placeholderTextColor="rgba(255, 255, 255, 0.25)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        </View>

        {/* Dynamic Filters */}
        <View style={styles.filterSection}>
          <Text style={styles.orText}>OR</Text>
          <Text style={styles.titleText}>Find your listener</Text>
          <Text style={styles.subtitleText}>Who would you like to talk to?</Text>

          <View style={styles.tagsContainer}>
            <TouchableOpacity style={styles.tagBadge}>
              <Text style={styles.tagText}>Male</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tagBadge}>
              <Text style={styles.tagText}>Female</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 24, paddingHorizontal: 16, height: 48, backgroundColor: '#000000' },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, color: 'rgba(255, 255, 255, 0.92)', fontSize: 14 },
  filterSection: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20 },
  orText: { color: 'rgba(255, 255, 255, 0.25)', fontSize: 12, marginBottom: 32 },
  titleText: { alignSelf: 'flex-start', color: 'rgba(255, 255, 255, 0.25)', fontSize: 14, fontWeight: 'bold', marginBottom: 24 },
  subtitleText: { alignSelf: 'flex-start', color: '#FDE047', fontSize: 14, fontWeight: '600', marginBottom: 16 },
  tagsContainer: { flexDirection: 'row', alignSelf: 'flex-start', gap: 12 },
  tagBadge: { backgroundColor: '#000000', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, elevation: 2 },
  tagText: { color: 'rgba(255, 255, 255, 0.70)', fontSize: 12, fontWeight: '500' }
});

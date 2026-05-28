import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar, TouchableOpacity, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_URL, secureFetch } from '../constants/ServerConfig';

export default function PostCallScreen() {
  const router = useRouter();
  const { providerId, duration, type, reason } = useLocalSearchParams();
  const [provider, setProvider] = useState<any>(null);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (providerId) {
      secureFetch(`${API_URL}/providers`)
        .then(r => r.json())
        .then(data => {
          const found = data.find((p: any) => p.id === providerId);
          if (found) setProvider(found);
        })
        .catch(console.error);
    }
  }, [providerId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
           <TouchableOpacity onPress={() => router.replace('/home')} style={styles.closeBtn}>
             <Feather name="x" size={28} color="rgba(255,255,255,0.45)" />
           </TouchableOpacity>
        </View>

        <View style={styles.content}>
           <View style={styles.iconContainer}>
             <MaterialCommunityIcons name="check-decagram" size={80} color="#34D399" />
           </View>
           
           <Text style={styles.title}>{type || 'Session'} Ended</Text>
           
           <Text style={styles.subtitle}>
             {reason === 'insufficient_funds' ? 'Your wallet balance ran out.' : 
              reason === 'duration_ended' ? 'Time limit reached.' : 
              'Hope you had a great conversation!'}
           </Text>
           
           {provider && (
             <View style={styles.providerCard}>
                <Image source={require('../assets/images/girl_smiling_1775250936696.png')} style={styles.providerAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <Text style={styles.providerRole}>{provider.tagline || 'BeHappyTalk Provider'}</Text>
                </View>
             </View>
           )}

           <View style={styles.reviewSection}>
             <Text style={styles.reviewLabel}>How was your experience?</Text>
             <View style={styles.starsRow}>
               {[1,2,3,4,5].map(star => (
                 <TouchableOpacity key={star} onPress={() => setRating(star)}>
                   <MaterialCommunityIcons 
                      name={star <= rating ? "star" : "star-outline"} 
                      size={40} 
                      color={star <= rating ? "#FACC15" : "rgba(255,255,255,0.2)"} 
                   />
                 </TouchableOpacity>
               ))}
             </View>
           </View>
        </View>

        <View style={styles.footer}>
           <TouchableOpacity style={styles.actionBtnOutline} onPress={() => router.replace('/home')}>
             <Text style={styles.actionBtnOutlineText}>Later</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.actionBtnSolid} onPress={() => {
             router.replace(`/provider/${providerId}`);
           }}>
             <Text style={styles.actionBtnSolidText}>Talk Again</Text>
           </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  container: { flex: 1, justifyContent: 'space-between' },
  header: { padding: 20, alignItems: 'flex-end' },
  closeBtn: { padding: 8 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 10 },
  iconContainer: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 12 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  providerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111111', padding: 20, borderRadius: 20, width: '100%', marginBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  providerAvatar: { width: 64, height: 64, borderRadius: 32, marginRight: 16, borderWidth: 2, borderColor: '#FACC15' },
  providerName: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  providerRole: { fontSize: 14, color: 'rgba(255,255,255,0.45)' },
  reviewSection: { alignItems: 'center', width: '100%' },
  reviewLabel: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 20, fontWeight: '600' },
  starsRow: { flexDirection: 'row', gap: 16 },
  footer: { flexDirection: 'row', padding: 24, gap: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 24 },
  actionBtnOutline: { flex: 1, paddingVertical: 18, borderRadius: 100, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  actionBtnOutlineText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  actionBtnSolid: { flex: 1, paddingVertical: 18, borderRadius: 100, backgroundColor: '#FACC15', alignItems: 'center' },
  actionBtnSolidText: { color: '#000000', fontSize: 16, fontWeight: 'bold' }
});

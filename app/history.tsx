import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { API_URL, secureFetch } from '../constants/ServerConfig';

export default function History() {
  const router = useRouter();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      secureFetch(`${API_URL}/user/sessions/${user.id}`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
             setSessions(data);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
       setLoading(false);
    }
  }, [user]);

  const renderSession = ({ item }: { item: any }) => {
    const isVideo = item.type === 'Video';
    const isAudio = item.type === 'Audio' || item.type === 'Call';
    const isChat = item.type === 'Chat';
    
    let iconName = 'message-text';
    let iconColor = '#34D399';
    if (isVideo) { iconName = 'video'; iconColor = '#FACC15'; }
    if (isAudio) { iconName = 'phone'; iconColor = '#00E5FF'; }

    const date = new Date(item.startTime).toLocaleString('en-US', {
       month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });

    return (
      <View style={styles.card}>
         <View style={styles.cardHeader}>
            <View style={styles.typeBadge}>
               <MaterialCommunityIcons name={iconName as any} size={16} color={iconColor} />
               <Text style={[styles.typeText, { color: iconColor }]}>{item.type}</Text>
            </View>
            <Text style={styles.dateText}>{date}</Text>
         </View>
         
         <View style={styles.cardBody}>
            <Text style={styles.providerName}>{item.providers?.name || 'Unknown Provider'}</Text>
            
            <View style={styles.statsRow}>
               <View style={styles.statItem}>
                  <MaterialIcons name="timer" size={16} color="rgba(255,255,255,0.45)" />
                  <Text style={styles.statText}>{item.duration} mins</Text>
               </View>
               <View style={styles.statItem}>
                  <MaterialIcons name="payments" size={16} color="rgba(255,255,255,0.45)" />
                  <Text style={styles.statText}>₹{item.cost || 0}</Text>
               </View>
            </View>
         </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call Summary</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.container}>
        {loading ? (
          <View style={styles.center}>
             <ActivityIndicator size="large" color="#FACC15" />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.center}>
             <MaterialCommunityIcons name="history" size={64} color="rgba(255,255,255,0.1)" />
             <Text style={styles.emptyText}>No sessions found yet.</Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderSession}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0B10', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { padding: 4 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.45)', fontSize: 16, marginTop: 16 },
  listContent: { padding: 20, gap: 16 },
  card: { backgroundColor: '#1A1C23', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  typeText: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  dateText: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  cardBody: { gap: 12 },
  providerName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', gap: 24, marginTop: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' }
});
